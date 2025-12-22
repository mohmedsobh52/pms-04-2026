import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

// Standard unit normalization map
const UNIT_NORMALIZATION: { [key: string]: string } = {
  // Length
  "meter": "m", "meters": "m", "metre": "m", "metres": "m", "متر": "m", "م": "m",
  "linear meter": "L.M", "linear metres": "L.M", "lm": "L.M", "l.m": "L.M", "م.ط": "L.M",
  // Area
  "square meter": "m²", "square meters": "m²", "sqm": "m²", "sq.m": "m²", "م2": "m²", "م٢": "m²", "متر مربع": "m²",
  // Volume
  "cubic meter": "m³", "cubic meters": "m³", "cum": "m³", "cu.m": "m³", "م3": "m³", "م٣": "m³", "متر مكعب": "m³",
  // Weight
  "kilogram": "kg", "kilograms": "kg", "kgs": "kg", "كجم": "kg", "كيلوجرام": "kg",
  "ton": "ton", "tons": "ton", "tonne": "ton", "tonnes": "ton", "طن": "ton",
  // Count
  "piece": "pcs", "pieces": "pcs", "pc": "pcs", "nos": "pcs", "no": "pcs", "number": "pcs", "عدد": "pcs", "قطعة": "pcs",
  "each": "ea", "unit": "ea", "وحدة": "ea",
  // Lump sum
  "lump sum": "L.S", "lumpsum": "L.S", "ls": "L.S", "l.s": "L.S", "مقطوعية": "L.S", "جملة": "L.S",
  "lot": "lot", "مجموعة": "lot",
  // Time
  "day": "day", "days": "day", "يوم": "day",
  "month": "month", "months": "month", "شهر": "month",
  // Other
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, analysis_type, language = 'en', file_type = 'pdf' } = await req.json();
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

### 1. BOQ Line Items
Extract ALL line items with the following fields:
- item_no: Item number/code (e.g., "1.1", "A-001", "01.02.03")
- description: Full item description (clean, readable text)
- unit: Normalized unit (m, m², m³, kg, pcs, ton, L.S, L.M, ea, lot, day, month, trip, set)
- quantity: Numeric quantity
- rate: Unit rate/price
- amount: Total amount (should equal quantity × rate)
- section_trade: Category/section (e.g., Earthworks, Concrete, Steel, MEP, Finishing)
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

### 4. Section/Trade Categories
Group items into standard construction trades:
- Site Preparation & Earthworks
- Foundations & Substructure
- Concrete Works
- Steel & Metal Works
- Masonry & Blockwork
- Roofing & Waterproofing
- Doors & Windows
- Finishes (Flooring, Wall, Ceiling)
- MEP - Electrical
- MEP - Plumbing
- MEP - HVAC
- External Works
- Preliminaries & General

## OUTPUT FORMAT (JSON)
{
  "analysis_type": "professional_boq_analysis",
  "document_info": {
    "detected_language": "${detectedLanguage}",
    "file_type": "${file_type}",
    "encoding_quality": "${encodingQuality}",
    "total_pages_estimated": number
  },
  "items": [
    {
      "item_no": "string",
      "description": "string (clean, in ${outputLanguage})",
      "unit": "string (normalized)",
      "quantity": number,
      "rate": number,
      "amount": number,
      "section_trade": "string",
      "remarks": "string or null",
      "validation_status": "valid" | "warning" | "error",
      "validation_notes": ["array of validation notes"]
    }
  ],
  "validation": {
    "total_issues": number,
    "issues": [
      {
        "item_no": "string",
        "issue_type": "missing_data" | "arithmetic_error" | "inconsistent_unit" | "duplicate" | "unclear_description",
        "severity": "low" | "medium" | "high",
        "description": "string",
        "recommendation": "string"
      }
    ],
    "data_quality_score": number (0-100),
    "arithmetic_check_passed": number,
    "arithmetic_check_failed": number
  },
  "analysis": {
    "total_items": number,
    "total_value": number,
    "currency": "SAR" or detected currency,
    "sections_summary": [
      {
        "section": "string",
        "item_count": number,
        "total_amount": number,
        "percentage_of_total": number
      }
    ],
    "high_value_items": [top 10 items by amount],
    "data_quality_issues": ["list of quality concerns"],
    "risks": ["list of identified risks"]
  },
  "executive_summary": "2-3 paragraph summary of the BOQ analysis in ${outputLanguage}"
}

## CRITICAL RULES
1. Do NOT output corrupted or unreadable text - clean it up or mark as [UNREADABLE]
2. Respond in ${outputLanguage}
3. Prioritize accuracy over completeness
4. Flag any suspicious or inconsistent data
5. Calculate percentages and totals accurately
6. If rate/amount is missing, estimate based on typical construction costs and mark as "estimated"
7. Return ONLY valid JSON, no markdown or explanation`;

    const userPrompt = `Analyze this BOQ document as a professional Quantity Surveyor. Extract all items, validate data, and provide comprehensive analysis.

DOCUMENT CONTENT:
${text.slice(0, 30000)}

${text.length > 30000 ? `\n[Document truncated - ${text.length - 30000} additional characters not shown]` : ''}

Please provide:
1. Complete extraction of all BOQ items with normalized units
2. Validation of arithmetic (Amount = Qty × Rate)
3. Summary by section/trade
4. Top 10 high-value cost drivers
5. Data quality issues and risks
6. Executive summary`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

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
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response received, parsing...");

    let result: AnalysisResult;
    try {
      result = JSON.parse(content);
    } catch (directParseError) {
      console.log("Direct parse failed, trying extraction methods...");
      
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[1].trim());
        } else {
          const jsonStart = content.indexOf("{");
          const jsonEnd = content.lastIndexOf("}");
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonStr = content.slice(jsonStart, jsonEnd + 1);
            result = JSON.parse(jsonStr);
          } else {
            throw new Error("Could not find JSON structure in response");
          }
        }
      } catch (extractError) {
        console.error("All JSON extraction methods failed");
        throw new Error("Failed to process AI response. Please try again.");
      }
    }

    // Post-process: normalize units and recalculate if needed
    if (result.items) {
      result.items = result.items.map(item => {
        const normalizedUnit = normalizeUnit(item.unit);
        const calculatedAmount = item.quantity * item.rate;
        const amountDiff = Math.abs(calculatedAmount - item.amount);
        const tolerance = item.amount * 0.01; // 1% tolerance
        
        const validationNotes: string[] = item.validation_notes || [];
        let validationStatus = item.validation_status || "valid";
        
        if (amountDiff > tolerance && item.amount > 0) {
          validationNotes.push(`Arithmetic discrepancy: Qty(${item.quantity}) × Rate(${item.rate}) = ${calculatedAmount.toFixed(2)}, but Amount = ${item.amount}`);
          validationStatus = "warning";
        }
        
        return {
          ...item,
          unit: normalizedUnit,
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