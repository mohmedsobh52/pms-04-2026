import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import LZString from "https://esm.sh/lz-string@1.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BOQItem {
  item_no: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  section_trade: string;
  remarks: string | null;
  validation_status: "valid" | "warning" | "error";
  validation_notes: string[];
}

interface ValidationIssue {
  item_no: string;
  issue_type: "missing_data" | "arithmetic_error" | "inconsistent_unit" | "duplicate" | "unclear_description";
  severity: "low" | "medium" | "high";
  description: string;
  recommendation: string;
}

interface SectionSummary {
  section: string;
  item_count: number;
  total_amount: number;
  percentage_of_total: number;
}

// Cost-Loaded Schedule interfaces
interface ScheduleActivity {
  activity_id: string;
  activity_name: string;
  related_boq_items: string[];
  duration_days: number;
  activity_cost: number;
  cost_weight_percent: number;
  early_start_day: number;
  early_finish_day: number;
  predecessors: string[];
  cost_distribution: {
    period: number;
    period_cost: number;
  }[];
}

interface CostLoadedSchedule {
  project_summary: {
    total_activities: number;
    total_project_cost: number;
    total_duration_days: number;
    currency: string;
    cost_variance: number;
  };
  activities: ScheduleActivity[];
  cash_flow: {
    period: number;
    period_cost: number;
    cumulative_cost: number;
    cumulative_percent: number;
  }[];
  s_curve_data: {
    day: number;
    planned_cost: number;
    cumulative_cost: number;
    cumulative_percent: number;
  }[];
}

interface AnalysisResult {
  analysis_type: string;
  document_info: {
    detected_language: string;
    file_type: string;
    encoding_quality: string;
    total_pages_estimated: number;
  };
  items: BOQItem[];
  wbs?: Array<{
    code: string;
    title: string;
    level: number;
    parent_code?: string;
    items: string[];
  }>;
  validation: {
    total_issues: number;
    issues: ValidationIssue[];
    data_quality_score: number;
    arithmetic_check_passed: number;
    arithmetic_check_failed: number;
  };
  analysis: {
    total_items: number;
    total_value: number;
    currency: string;
    sections_summary: SectionSummary[];
    high_value_items: BOQItem[];
    data_quality_issues: string[];
    risks: string[];
  };
  executive_summary: string;
  cost_loaded_schedule?: CostLoadedSchedule;
}

// Standard unit normalization map
const UNIT_NORMALIZATION: { [key: string]: string } = {
  "meter": "m", "meters": "m", "metre": "m", "metres": "m", "متر": "m", "م": "m",
  "linear meter": "L.M", "linear metres": "L.M", "lm": "L.M", "l.m": "L.M", "م.ط": "L.M",
  "square meter": "m²", "square meters": "m²", "sqm": "m²", "sq.m": "m²", "م2": "m²", "م٢": "m²", "متر مربع": "m²",
  "cubic meter": "m³", "cubic meters": "m³", "cum": "m³", "cu.m": "m³", "م3": "m³", "م٣": "m³", "متر مكعب": "m³",
  "kilogram": "kg", "kilograms": "kg", "kgs": "kg", "كجم": "kg", "كيلوجرام": "kg",
  "ton": "ton", "tons": "ton", "tonne": "ton", "tonnes": "ton", "طن": "ton",
  "piece": "pcs", "pieces": "pcs", "pc": "pcs", "nos": "pcs", "no": "pcs", "number": "pcs", "عدد": "pcs", "قطعة": "pcs",
  "each": "ea", "unit": "ea", "وحدة": "ea",
  "lump sum": "L.S", "lumpsum": "L.S", "ls": "L.S", "l.s": "L.S", "مقطوعية": "L.S", "جملة": "L.S",
  "lot": "lot", "مجموعة": "lot",
  "day": "day", "days": "day", "يوم": "day",
  "month": "month", "months": "month", "شهر": "month",
  "trip": "trip", "trips": "trip", "رحلة": "trip",
  "set": "set", "sets": "set", "طقم": "set",
};

function normalizeUnit(unit: string): string {
  if (!unit) return "N/A";
  const normalized = unit.toLowerCase().trim();
  return UNIT_NORMALIZATION[normalized] || unit.trim();
}

function detectLanguage(text: string): string {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
  const englishPattern = /[a-zA-Z]/g;
  
  const arabicCount = (text.match(arabicPattern) || []).length;
  const englishCount = (text.match(englishPattern) || []).length;
  
  if (arabicCount > englishCount * 2) return "Arabic";
  if (englishCount > arabicCount * 2) return "English";
  return "Mixed (Arabic/English)";
}

function assessEncodingQuality(text: string): string {
  const corruptedPatterns = /[\ufffd\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;
  const corruptedCount = (text.match(corruptedPatterns) || []).length;
  const ratio = corruptedCount / text.length;
  
  if (ratio < 0.01) return "Excellent";
  if (ratio < 0.05) return "Good";
  if (ratio < 0.1) return "Fair - Some text corruption detected";
  return "Poor - Significant text corruption";
}

// Standard construction activity sequencing with typical durations
const ACTIVITY_TEMPLATE: { [key: string]: { order: number; duration_factor: number; predecessors: string[] } } = {
  "Site Preparation & Earthworks": { order: 1, duration_factor: 0.08, predecessors: [] },
  "Foundations & Substructure": { order: 2, duration_factor: 0.12, predecessors: ["Site Preparation & Earthworks"] },
  "Concrete Works": { order: 3, duration_factor: 0.15, predecessors: ["Foundations & Substructure"] },
  "Steel & Metal Works": { order: 4, duration_factor: 0.10, predecessors: ["Concrete Works"] },
  "Masonry & Blockwork": { order: 5, duration_factor: 0.08, predecessors: ["Concrete Works"] },
  "Roofing & Waterproofing": { order: 6, duration_factor: 0.06, predecessors: ["Steel & Metal Works", "Masonry & Blockwork"] },
  "MEP - Plumbing": { order: 7, duration_factor: 0.08, predecessors: ["Masonry & Blockwork"] },
  "MEP - Electrical": { order: 8, duration_factor: 0.08, predecessors: ["Masonry & Blockwork"] },
  "MEP - HVAC": { order: 9, duration_factor: 0.07, predecessors: ["Roofing & Waterproofing"] },
  "Doors & Windows": { order: 10, duration_factor: 0.05, predecessors: ["Masonry & Blockwork"] },
  "Finishes (Flooring, Wall, Ceiling)": { order: 11, duration_factor: 0.12, predecessors: ["MEP - Plumbing", "MEP - Electrical", "Doors & Windows"] },
  "External Works": { order: 12, duration_factor: 0.08, predecessors: ["Finishes (Flooring, Wall, Ceiling)"] },
  "Preliminaries & General": { order: 0, duration_factor: 0.05, predecessors: [] },
};

function generateCostLoadedSchedule(items: BOQItem[], totalValue: number, currency: string): CostLoadedSchedule {
  const sectionGroups: { [key: string]: BOQItem[] } = {};
  
  items.forEach(item => {
    const section = item.section_trade || "Preliminaries & General";
    if (!sectionGroups[section]) {
      sectionGroups[section] = [];
    }
    sectionGroups[section].push(item);
  });

  const baseDuration = Math.max(180, Math.min(720, Math.ceil(totalValue / 50000)));

  const activities: ScheduleActivity[] = [];
  let activityId = 1;

  const sortedSections = Object.keys(sectionGroups).sort((a, b) => {
    const orderA = ACTIVITY_TEMPLATE[a]?.order ?? 99;
    const orderB = ACTIVITY_TEMPLATE[b]?.order ?? 99;
    return orderA - orderB;
  });

  const activityMap: { [key: string]: ScheduleActivity } = {};

  sortedSections.forEach(section => {
    const sectionItems = sectionGroups[section];
    const sectionCost = sectionItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const costWeight = (sectionCost / totalValue) * 100;
    
    const template = ACTIVITY_TEMPLATE[section] || { order: 99, duration_factor: 0.05, predecessors: [] };
    const duration = Math.max(7, Math.ceil(baseDuration * template.duration_factor));
    
    let earlyStart = 1;
    const predecessorIds: string[] = [];
    
    template.predecessors.forEach(predSection => {
      if (activityMap[predSection]) {
        earlyStart = Math.max(earlyStart, activityMap[predSection].early_finish_day + 1);
        predecessorIds.push(activityMap[predSection].activity_id);
      }
    });

    const dailyCost = sectionCost / duration;
    const costDistribution = [];
    for (let d = 0; d < duration; d++) {
      costDistribution.push({
        period: earlyStart + d,
        period_cost: dailyCost
      });
    }

    const activity: ScheduleActivity = {
      activity_id: `ACT-${String(activityId).padStart(3, '0')}`,
      activity_name: section,
      related_boq_items: sectionItems.map(item => item.item_no),
      duration_days: duration,
      activity_cost: sectionCost,
      cost_weight_percent: Math.round(costWeight * 100) / 100,
      early_start_day: earlyStart,
      early_finish_day: earlyStart + duration - 1,
      predecessors: predecessorIds,
      cost_distribution: costDistribution
    };

    activities.push(activity);
    activityMap[section] = activity;
    activityId++;
  });

  const totalDuration = Math.max(...activities.map(a => a.early_finish_day));

  const periodLength = 30;
  const totalPeriods = Math.ceil(totalDuration / periodLength);
  const cashFlow: { period: number; period_cost: number; cumulative_cost: number; cumulative_percent: number }[] = [];
  
  let cumulativeCost = 0;
  for (let p = 1; p <= totalPeriods; p++) {
    const periodStart = (p - 1) * periodLength + 1;
    const periodEnd = p * periodLength;
    
    let periodCost = 0;
    activities.forEach(activity => {
      activity.cost_distribution.forEach(dist => {
        if (dist.period >= periodStart && dist.period <= periodEnd) {
          periodCost += dist.period_cost;
        }
      });
    });
    
    cumulativeCost += periodCost;
    cashFlow.push({
      period: p,
      period_cost: Math.round(periodCost * 100) / 100,
      cumulative_cost: Math.round(cumulativeCost * 100) / 100,
      cumulative_percent: Math.round((cumulativeCost / totalValue) * 10000) / 100
    });
  }

  const sCurveData: { day: number; planned_cost: number; cumulative_cost: number; cumulative_percent: number }[] = [];
  let runningTotal = 0;
  
  for (let day = 1; day <= totalDuration; day += 7) {
    let dayCost = 0;
    activities.forEach(activity => {
      activity.cost_distribution.forEach(dist => {
        if (dist.period <= day && dist.period > day - 7) {
          dayCost += dist.period_cost;
        }
      });
    });
    
    runningTotal += dayCost;
    sCurveData.push({
      day: day,
      planned_cost: Math.round(dayCost * 100) / 100,
      cumulative_cost: Math.round(runningTotal * 100) / 100,
      cumulative_percent: Math.round((runningTotal / totalValue) * 10000) / 100
    });
  }

  const totalScheduledCost = activities.reduce((sum, a) => sum + a.activity_cost, 0);
  const costVariance = Math.round((totalScheduledCost - totalValue) * 100) / 100;

  return {
    project_summary: {
      total_activities: activities.length,
      total_project_cost: Math.round(totalValue * 100) / 100,
      total_duration_days: totalDuration,
      currency: currency,
      cost_variance: costVariance
    },
    activities: activities,
    cash_flow: cashFlow,
    s_curve_data: sCurveData
  };
}

// Tool definition for structured output
const boqAnalysisTool = {
  type: "function",
  function: {
    name: "submit_boq_analysis",
    description: "Submit the complete BOQ analysis result",
    parameters: {
      type: "object",
      properties: {
        document_info: {
          type: "object",
          properties: {
            detected_language: { type: "string" },
            file_type: { type: "string" },
            encoding_quality: { type: "string" },
            total_pages_estimated: { type: "number" }
          },
          required: ["detected_language", "file_type", "encoding_quality", "total_pages_estimated"]
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_no: { type: "string" },
              description: { type: "string" },
              unit: { type: "string" },
              quantity: { type: "number" },
              rate: { type: "number" },
              amount: { type: "number" },
              section_trade: { type: "string" },
              remarks: { type: ["string", "null"] },
              validation_status: { type: "string", enum: ["valid", "warning", "error"] },
              validation_notes: { type: "array", items: { type: "string" } }
            },
            required: ["item_no", "description", "unit", "quantity", "rate", "amount", "section_trade", "validation_status", "validation_notes"]
          }
        },
        validation: {
          type: "object",
          properties: {
            total_issues: { type: "number" },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_no: { type: "string" },
                  issue_type: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high"] },
                  description: { type: "string" },
                  recommendation: { type: "string" }
                },
                required: ["item_no", "issue_type", "severity", "description", "recommendation"]
              }
            },
            data_quality_score: { type: "number" },
            arithmetic_check_passed: { type: "number" },
            arithmetic_check_failed: { type: "number" }
          },
          required: ["total_issues", "issues", "data_quality_score", "arithmetic_check_passed", "arithmetic_check_failed"]
        },
        analysis: {
          type: "object",
          properties: {
            total_items: { type: "number" },
            total_value: { type: "number" },
            currency: { type: "string" },
            sections_summary: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section: { type: "string" },
                  item_count: { type: "number" },
                  total_amount: { type: "number" },
                  percentage_of_total: { type: "number" }
                },
                required: ["section", "item_count", "total_amount", "percentage_of_total"]
              }
            },
            high_value_items: { type: "array", items: { type: "object" } },
            data_quality_issues: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } }
          },
          required: ["total_items", "total_value", "currency", "sections_summary", "high_value_items", "data_quality_issues", "risks"]
        },
        executive_summary: { type: "string" }
      },
      required: ["document_info", "items", "validation", "analysis", "executive_summary"]
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { text, analysis_type, language = 'en', file_type = 'pdf', generate_schedule = true } = body;
    
    // Handle compressed text from client - client uses compressToBase64
    if (body.isCompressed && body.textCompressed) {
      console.log("Decompressing text from client (Base64 format)...");
      try {
        // Client uses LZString.compressToBase64, so use decompressFromBase64 FIRST
        text = LZString.decompressFromBase64(body.textCompressed);
        console.log(`Decompressed from Base64: ${text?.length || 0} characters`);
        
        // Fallback methods if Base64 didn't work
        if (!text || text.length < 5) {
          console.log("Base64 failed, trying UTF16...");
          text = LZString.decompressFromUTF16(body.textCompressed);
        }
        if (!text || text.length < 5) {
          console.log("UTF16 failed, trying raw decompress...");
          text = LZString.decompress(body.textCompressed);
        }
        
        console.log(`Final decompressed text length: ${text?.length || 0} characters`);
        
        if (!text || text.length < 10) {
          console.error("All decompression methods failed");
          return new Response(
            JSON.stringify({ 
              error: "Failed to decompress text - all methods returned empty result",
              suggestion: "Please disable compression in settings and try again"
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (decompressError) {
        console.error("Decompression error:", decompressError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to decompress text",
            suggestion: "Please try again without compression enabled in settings"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Validate input
    if (!text || typeof text !== "string" || text.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: "Input text is too short or invalid",
          suggestion: "Please enter BOQ text manually or use a PDF with selectable text"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for binary data
    const invalidCharCount = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
    const invalidRatio = invalidCharCount / text.length;
    
    if (invalidRatio > 0.1) {
      console.log(`Text appears to be binary data. Invalid char ratio: ${invalidRatio}`);
      return new Response(
        JSON.stringify({ 
          error: "Cannot read file content",
          suggestion: "The file appears to contain scanned images or non-selectable text. Please use OCR or enter text manually."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect document properties
    const detectedLanguage = detectLanguage(text);
    const encodingQuality = assessEncodingQuality(text);
    const outputLanguage = language === 'ar' ? 'Arabic' : 'English';

    console.log(`Starting professional BOQ analysis...`);
    console.log(`File Type: ${file_type} | Language: ${detectedLanguage} | Encoding: ${encodingQuality}`);
    console.log(`Text length: ${text.length} characters`);

    const systemPrompt = `You are a professional Quantity Surveyor and BOQ Analyst with expertise in construction cost estimation.

## YOUR ROLE
Analyze BOQ (Bill of Quantities) documents with precision and accuracy, extracting all relevant information while identifying data quality issues.

## DOCUMENT INFORMATION
- Detected Language: ${detectedLanguage}
- File Type: ${file_type}
- Encoding Quality: ${encodingQuality}

## EXTRACTION REQUIREMENTS

### 1. BOQ Line Items - CRITICAL PRICE EXTRACTION
Extract ALL line items with the following fields:
- item_no: Item number/code (e.g., "1.1", "A-001", "01.02.03")
- description: Full item description (clean, readable text)
- unit: Normalized unit (m, m², m³, kg, pcs, ton, L.S, L.M, ea, lot, day, month, trip, set)
- quantity: Numeric quantity (MUST be extracted from the document, NOT estimated)
- rate: Unit rate/price per unit (CRITICAL: Extract the ACTUAL unit price from the document. Look for columns labeled "Rate", "Unit Price", "Price/Unit", "سعر الوحدة", or similar. This is the price for ONE unit.)
- amount: Total amount (CRITICAL: Extract the ACTUAL total from the document. Look for columns labeled "Amount", "Total", "Total Price", "المبلغ", "الإجمالي", or similar. Should equal quantity × rate)
- section_trade: MUST categorize EVERY item into one of these standard construction sections:

⚠️ CRITICAL PRICE EXTRACTION RULES:
1. ALWAYS extract ACTUAL values from the document - never use 0 or placeholder values
2. If a column shows "Rate" or "Unit Price", that value goes in the "rate" field
3. If a column shows "Amount" or "Total", that value goes in the "amount" field
4. Common BOQ column order: Item No | Description | Unit | Qty | Rate | Amount
5. Arabic BOQs may use: رقم البند | الوصف | الوحدة | الكمية | سعر الوحدة | المبلغ
6. If rate is missing but amount exists: rate = amount / quantity
7. If amount is missing but rate exists: amount = rate × quantity
8. NEVER return rate=0 or amount=0 if there are visible numbers in those columns
  * "Site Preparation & Earthworks" - for excavation, grading, site clearing
  * "Foundations & Substructure" - for foundation work, piles, retaining walls
  * "Concrete Works" - for concrete slabs, columns, beams
  * "Steel & Metal Works" - for structural steel, reinforcement
  * "Masonry & Blockwork" - for bricks, blocks, masonry
  * "Roofing & Waterproofing" - for roof work, waterproofing
  * "MEP - Plumbing" - for plumbing, sanitary, water supply
  * "MEP - Electrical" - for electrical, lighting, power
  * "MEP - HVAC" - for HVAC, air conditioning, ventilation
  * "Doors & Windows" - for doors, windows, frames
  * "Finishes (Flooring, Wall, Ceiling)" - for tiles, paint, plaster, ceiling
  * "External Works" - for landscaping, paving, external utilities
  * "Preliminaries & General" - for general items, preliminaries, site setup
  IMPORTANT: NEVER use "Uncategorized" - every item MUST have a proper section_trade
- remarks: Any notes or specifications

### 2. Unit Normalization
Standardize units:
- Length: m, L.M (linear meter)
- Area: m²
- Volume: m³
- Weight: kg, ton
- Count: pcs, ea
- Lump sum: L.S, lot
- Time: day, month

### 3. Validation Checks
For each item, verify:
- Amount ≈ Quantity × Rate (within 1% tolerance)
- All required fields are present
- Unit is valid and normalized
- Description is clear and not duplicated

### 4. Section/Trade Categories (MANDATORY CATEGORIZATION)
⚠️ CRITICAL: Every item MUST be assigned to ONE of these sections. NEVER use "Uncategorized" or leave blank.
Match items to the closest appropriate section based on description keywords:

Standard sections (use these exact names):
- Site Preparation & Earthworks (keywords: excavation, grading, earthwork, site clearing, demolition)
- Foundations & Substructure (keywords: foundation, footing, pile, basement, substructure)
- Concrete Works (keywords: concrete, slab, column, beam, casting, formwork)
- Steel & Metal Works (keywords: steel, reinforcement, rebar, structural steel, metalwork)
- Masonry & Blockwork (keywords: brick, block, masonry, wall construction)
- Roofing & Waterproofing (keywords: roof, roofing, waterproofing, insulation)
- Doors & Windows (keywords: door, window, frame, glazing, curtain wall)
- Finishes (Flooring, Wall, Ceiling) (keywords: tiles, paint, plaster, flooring, ceiling, finishing)
- MEP - Electrical (keywords: electrical, lighting, power, wiring, cable, panel, switch)
- MEP - Plumbing (keywords: plumbing, sanitary, water supply, drainage, piping)
- MEP - HVAC (keywords: HVAC, air conditioning, ventilation, cooling, heating)
- External Works (keywords: landscaping, paving, external utilities, site works)
- Preliminaries & General (keywords: preliminaries, mobilization, general items, insurance, temporary works)

If you're unsure which category fits best, use the category that matches the primary construction phase or trade.

## CRITICAL RULES
1. Do NOT output corrupted or unreadable text - clean it up or mark as [UNREADABLE]
2. Respond in ${outputLanguage}
3. Prioritize accuracy over completeness
4. Flag any suspicious or inconsistent data
5. Calculate percentages and totals accurately
6. If rate/amount is missing, estimate based on typical construction costs and mark as "estimated"
7. Use the submit_boq_analysis function to return your analysis`;

    // Calculate optimal text limit based on document size
    // Gemini 2.5 Flash supports up to 1M tokens, we'll use a safe limit of 100K chars
    const MAX_TEXT_LENGTH = 100000;
    const textToAnalyze = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
    const wasTextTruncated = text.length > MAX_TEXT_LENGTH;
    
    console.log(`Text length: ${text.length} chars, using: ${textToAnalyze.length} chars${wasTextTruncated ? ' (truncated)' : ''}`);

    const userPrompt = `Analyze this BOQ document as a professional Quantity Surveyor. Extract ALL items, validate data, and provide comprehensive analysis.

IMPORTANT: This document contains ${text.length} characters${wasTextTruncated ? ` (showing first ${MAX_TEXT_LENGTH} characters)` : ''}. Extract EVERY item you can find.

DOCUMENT CONTENT:
${textToAnalyze}

${wasTextTruncated ? `\n⚠️ [Document partially shown - ${text.length - MAX_TEXT_LENGTH} additional characters exist. Focus on extracting all visible items accurately.]` : ''}

Please provide:
1. Complete extraction of ALL BOQ items with normalized units (extract every single item visible)
2. Validation of arithmetic (Amount = Qty × Rate)
3. Summary by section/trade
4. Top 10 high-value cost drivers
5. Data quality issues and risks
6. Executive summary with total items count

Use the submit_boq_analysis function to return your structured analysis.`;

    console.log("Calling AI Gateway...");
    
    const requestBody = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [boqAnalysisTool],
      tool_choice: { type: "function", function: { name: "submit_boq_analysis" } }
    };

    console.log("Request body prepared, sending to AI Gateway...");
    console.log(`Text being analyzed: ${textToAnalyze.length} characters`);

    // Helper function with timeout and retry
    const fetchWithRetry = async (retryCount = 0): Promise<Response> => {
      const maxRetries = 2;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return resp;
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        const error = fetchError as Error;
        if (error.name === 'AbortError') {
          console.error(`Request timeout (attempt ${retryCount + 1})`);
          if (retryCount < maxRetries) {
            console.log(`Retrying... (${retryCount + 2}/${maxRetries + 1})`);
            return fetchWithRetry(retryCount + 1);
          }
          throw new Error("Request timed out after multiple attempts. Please try with a smaller file.");
        }
        throw error;
      }
    };

    const response = await fetchWithRetry();
    
    console.log(`AI Gateway response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    // Read response text first to handle empty/malformed responses
    const responseText = await response.text();
    console.log(`Response text length: ${responseText.length}`);
    
    if (!responseText || responseText.trim() === "") {
      console.error("Empty response from AI Gateway");
      console.error("This may indicate the request was too large or timed out");
      throw new Error("Empty response from AI. The file may be too large. Please try with a smaller file or fewer items.")
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Response preview:", responseText.slice(0, 500));
      throw new Error("Invalid response from AI. Please try again.");
    }
    
    console.log("AI response received successfully");
    console.log("Response structure:", JSON.stringify({
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
      toolCallsLength: data.choices?.[0]?.message?.tool_calls?.length,
      hasContent: !!data.choices?.[0]?.message?.content
    }));

    // Extract tool call result
    let result: AnalysisResult;
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.name === "submit_boq_analysis") {
      try {
        console.log("Parsing tool call arguments...");
        const toolArgs = JSON.parse(toolCall.function.arguments);
        result = {
          analysis_type: "professional_boq_analysis",
          ...toolArgs
        };
        console.log("Successfully parsed tool call response with", result.items?.length || 0, "items");
      } catch (toolParseError) {
        console.error("Tool call parse error:", toolParseError);
        console.log("Raw arguments:", toolCall.function.arguments?.slice(0, 500));
        throw new Error("Failed to parse AI tool response");
      }
    } else {
      // Fallback: try to parse from message content
      const content = data.choices?.[0]?.message?.content;
      console.log("No tool call found, trying to parse content...");
      console.log("Content preview:", content?.slice(0, 500) || "No content");
      
      if (!content) {
        console.error("No content in response");
        throw new Error("No response from AI - please try again");
      }
      
      try {
        // Try direct JSON parse
        result = JSON.parse(content);
        console.log("Direct JSON parse successful");
      } catch (directParseError) {
        console.log("Direct parse failed, trying extraction methods...");
        
        try {
          // Try to extract JSON from markdown code block
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[1].trim());
            console.log("Extracted from code block");
          } else {
            // Try to find raw JSON object
            const jsonStart = content.indexOf("{");
            const jsonEnd = content.lastIndexOf("}");
            
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              const jsonStr = content.slice(jsonStart, jsonEnd + 1);
              result = JSON.parse(jsonStr);
              console.log("Extracted raw JSON");
            } else {
              throw new Error("Could not find JSON structure in response");
            }
          }
        } catch (extractError) {
          console.error("All JSON extraction methods failed:", extractError);
          throw new Error("Failed to process AI response. Please try again.");
        }
      }
    }

    // Post-process: normalize units, validate categorization, calculate prices, and recalculate if needed
    if (result.items) {
      result.items = result.items.map(item => {
        const normalizedUnit = normalizeUnit(item.unit);
        
        // Ensure rate and amount are valid numbers
        let rate = parseFloat(String(item.rate)) || 0;
        let amount = parseFloat(String(item.amount)) || 0;
        const quantity = parseFloat(String(item.quantity)) || 1;
        
        // Calculate missing values
        if (rate === 0 && amount > 0 && quantity > 0) {
          rate = amount / quantity;
        }
        if (amount === 0 && rate > 0 && quantity > 0) {
          amount = rate * quantity;
        }
        
        const calculatedAmount = quantity * rate;
        const amountDiff = Math.abs(calculatedAmount - amount);
        const tolerance = amount * 0.01;
        
        const validationNotes: string[] = item.validation_notes || [];
        let validationStatus = item.validation_status || "valid";
        
        if (amountDiff > tolerance && amount > 0) {
          validationNotes.push(`Arithmetic discrepancy: Qty(${quantity}) × Rate(${rate}) = ${calculatedAmount.toFixed(2)}, but Amount = ${amount}`);
          validationStatus = "warning";
        }
        
        // Add note if prices were calculated
        if (item.rate === 0 && rate > 0) {
          validationNotes.push(`Rate calculated from amount/quantity: ${rate.toFixed(2)}`);
        }
        if (item.amount === 0 && amount > 0) {
          validationNotes.push(`Amount calculated from rate×quantity: ${amount.toFixed(2)}`);
        }
        
        // Fix uncategorized items by smart categorization based on description
        let sectionTrade = item.section_trade || "Preliminaries & General";
        
        if (!sectionTrade || sectionTrade === "Uncategorized" || sectionTrade.trim() === "") {
          const desc = item.description.toLowerCase();
          
          // Smart categorization based on keywords
          if (desc.includes("excavat") || desc.includes("earth") || desc.includes("grading") || desc.includes("site clear")) {
            sectionTrade = "Site Preparation & Earthworks";
          } else if (desc.includes("foundation") || desc.includes("footing") || desc.includes("pile") || desc.includes("basement")) {
            sectionTrade = "Foundations & Substructure";
          } else if (desc.includes("concrete") || desc.includes("slab") || desc.includes("column") || desc.includes("beam") || desc.includes("formwork")) {
            sectionTrade = "Concrete Works";
          } else if (desc.includes("steel") || desc.includes("rebar") || desc.includes("reinforcement") || desc.includes("metal")) {
            sectionTrade = "Steel & Metal Works";
          } else if (desc.includes("brick") || desc.includes("block") || desc.includes("masonry") || desc.includes("wall")) {
            sectionTrade = "Masonry & Blockwork";
          } else if (desc.includes("roof") || desc.includes("waterproof") || desc.includes("insulation")) {
            sectionTrade = "Roofing & Waterproofing";
          } else if (desc.includes("door") || desc.includes("window") || desc.includes("frame") || desc.includes("glaz")) {
            sectionTrade = "Doors & Windows";
          } else if (desc.includes("tile") || desc.includes("paint") || desc.includes("plaster") || desc.includes("floor") || desc.includes("ceiling") || desc.includes("finish")) {
            sectionTrade = "Finishes (Flooring, Wall, Ceiling)";
          } else if (desc.includes("electr") || desc.includes("light") || desc.includes("power") || desc.includes("wiring") || desc.includes("cable") || desc.includes("panel")) {
            sectionTrade = "MEP - Electrical";
          } else if (desc.includes("plumb") || desc.includes("sanitary") || desc.includes("water") || desc.includes("drain") || desc.includes("pipe")) {
            sectionTrade = "MEP - Plumbing";
          } else if (desc.includes("hvac") || desc.includes("air condition") || desc.includes("ventilat") || desc.includes("cooling") || desc.includes("heating")) {
            sectionTrade = "MEP - HVAC";
          } else if (desc.includes("landscap") || desc.includes("paving") || desc.includes("external") || desc.includes("site work")) {
            sectionTrade = "External Works";
          } else {
            sectionTrade = "Preliminaries & General";
          }
          
          validationNotes.push(`Auto-categorized as '${sectionTrade}' based on description`);
        }
        
        return {
          ...item,
          unit: normalizedUnit,
          rate: rate,
          amount: amount,
          section_trade: sectionTrade,
          validation_status: validationStatus as "valid" | "warning" | "error",
          validation_notes: validationNotes
        };
      });
    }

    console.log(`Professional BOQ analysis complete:`);
    console.log(`- Total items: ${result.items?.length || 0}`);
    console.log(`- Total value: ${result.analysis?.total_value || 0}`);
    console.log(`- Validation issues: ${result.validation?.total_issues || 0}`);
    console.log(`- Data quality score: ${result.validation?.data_quality_score || 'N/A'}%`);

    // Generate Cost-Loaded Schedule if requested and items exist
    if (generate_schedule && result.items && result.items.length > 0) {
      console.log("Generating Cost-Loaded Project Schedule...");
      
      const totalValue = result.analysis?.total_value || result.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const currency = result.analysis?.currency || "SAR";
      
      result.cost_loaded_schedule = generateCostLoadedSchedule(result.items, totalValue, currency);
      
      console.log(`Cost-Loaded Schedule generated:`);
      console.log(`- Total activities: ${result.cost_loaded_schedule.project_summary.total_activities}`);
      console.log(`- Project duration: ${result.cost_loaded_schedule.project_summary.total_duration_days} days`);
      console.log(`- Cost variance: ${result.cost_loaded_schedule.project_summary.cost_variance} (should be 0)`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-boq function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
