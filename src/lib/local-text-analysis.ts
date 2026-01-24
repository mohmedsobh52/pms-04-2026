/**
 * Local Text Analysis - Deterministic analysis for Arabic/English text without AI
 * Similar to local-excel-analysis.ts but for raw text (PDF, manual input)
 * Provides instant results without rate limits
 */

export interface LocalTextItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string;
  validation?: {
    isValid: boolean;
    issues: string[];
  };
}

export interface LocalTextAnalysisSummary {
  total_items: number;
  total_value: number;
  valid_items: number;
  invalid_items: number;
  currency: string;
  categories: string[];
  quality_score: number;
  quality_issues: string[];
  detected_language: 'arabic' | 'english' | 'mixed';
}

export interface LocalTextAnalysisResult {
  items: LocalTextItem[];
  summary: LocalTextAnalysisSummary;
  analysis_type: 'local_text';
  analysis_date: string;
  processing_time_ms: number;
  extraction_method: string;
  raw_text_length: number;
}

// Arabic number conversion
const ARABIC_NUMERALS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

function convertArabicNumerals(text: string): string {
  return text.replace(/[٠-٩]/g, (match) => ARABIC_NUMERALS[match] || match);
}

function parseNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Convert Arabic numerals
  let str = convertArabicNumerals(value.toString());
  
  // Remove thousand separators and normalize decimal
  str = str.replace(/,/g, '').replace(/٫/g, '.').trim();
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

// Detect if text is primarily Arabic
export function isArabicText(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
  const arabicCount = (text.match(arabicPattern) || []).length;
  return arabicCount > text.length * 0.2;
}

// Unit patterns for extraction
const UNIT_PATTERNS: { pattern: RegExp; unit: string }[] = [
  // Arabic units
  { pattern: /م[²2]|متر\s*مربع|م\.م/gi, unit: 'م²' },
  { pattern: /م[³3]|متر\s*مكعب|م\.م\.م/gi, unit: 'م³' },
  { pattern: /م\.ط|متر\s*طولي|م\s*ط/gi, unit: 'م.ط' },
  { pattern: /عدد|قطعة|وحدة/gi, unit: 'عدد' },
  { pattern: /كجم|كيلو/gi, unit: 'كجم' },
  { pattern: /طن/gi, unit: 'طن' },
  { pattern: /مقطوعية|جملة/gi, unit: 'مقطوعية' },
  // English units
  { pattern: /\bsqm\b|\bsq\.?m\b|\bm2\b/gi, unit: 'م²' },
  { pattern: /\bcum\b|\bcu\.?m\b|\bm3\b/gi, unit: 'م³' },
  { pattern: /\blm\b|\bl\.?m\b/gi, unit: 'م.ط' },
  { pattern: /\bnos?\b|\bpcs?\b|\beach\b/gi, unit: 'عدد' },
  { pattern: /\bkg\b|\bkgs\b/gi, unit: 'كجم' },
  { pattern: /\bton\b|\btons\b/gi, unit: 'طن' },
  { pattern: /\bl\.?s\.?\b|\blump\s*sum\b/gi, unit: 'مقطوعية' },
];

function extractUnit(text: string): string {
  for (const { pattern, unit } of UNIT_PATTERNS) {
    if (pattern.test(text)) {
      return unit;
    }
  }
  return 'م'; // Default unit
}

// Category detection based on keywords
const CATEGORY_KEYWORDS: { keywords: string[]; category: string }[] = [
  { keywords: ['حفر', 'ردم', 'تسوية', 'خندق', 'excavat', 'trench', 'earth'], category: 'أعمال الحفر والردم' },
  { keywords: ['خرسانة', 'concrete', 'صب', 'قواعد', 'أعمدة', 'سقف', 'reinforce'], category: 'أعمال الخرسانة' },
  { keywords: ['بلك', 'طوب', 'بناء', 'جدار', 'block', 'brick', 'mason', 'wall'], category: 'أعمال البناء' },
  { keywords: ['لياسة', 'بياض', 'طلاء', 'دهان', 'تشطيب', 'plaster', 'paint', 'finish'], category: 'أعمال التشطيبات' },
  { keywords: ['بلاط', 'سيراميك', 'رخام', 'جرانيت', 'أرضي', 'tile', 'ceramic', 'marble'], category: 'أعمال البلاط' },
  { keywords: ['كهرب', 'إنارة', 'أسلاك', 'توصيل', 'لوحة', 'electric', 'wire', 'light', 'power'], category: 'أعمال الكهرباء' },
  { keywords: ['صحي', 'مياه', 'صرف', 'أنابيب', 'سباكة', 'plumb', 'pipe', 'water', 'drain'], category: 'أعمال السباكة' },
  { keywords: ['تكييف', 'تهوية', 'hvac', 'air condition', 'ventil', 'duct'], category: 'أعمال التكييف' },
  { keywords: ['حديد', 'معدن', 'فولاذ', 'هيكل', 'steel', 'metal', 'iron'], category: 'أعمال الحديد' },
  { keywords: ['أبواب', 'نوافذ', 'زجاج', 'ألمنيوم', 'door', 'window', 'glass', 'aluminum'], category: 'أعمال الأبواب والنوافذ' },
  { keywords: ['عزل', 'سقف', 'تسريب', 'roof', 'insul', 'waterproof'], category: 'أعمال العزل' },
  { keywords: ['حدائق', 'تنسيق', 'زراعة', 'خارجي', 'landscape', 'garden'], category: 'أعمال خارجية' },
];

function detectCategory(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => lowerDesc.includes(kw) || description.includes(kw))) {
      return category;
    }
  }
  
  return 'أعمال عامة';
}

// Multiple regex patterns to extract BOQ items from text
const ITEM_PATTERNS = [
  // Pattern 1: [1.1] Description ... Qty Unit @ Rate = Amount
  /\[?([\d\.]+)\]?\s*[-–]?\s*(.{10,200}?)\s+(\d+[\.,]?\d*)\s*(م[²³]?|عدد|طن|كجم|م\.ط|sqm|cum|nos?|pcs|lm)\s*[×x@]\s*(\d+[\.,]?\d*)\s*[=]\s*(\d+[\.,]?\d*)/gi,
  
  // Pattern 2: Item# | Description | Qty | Unit | Rate | Amount (table-like)
  /([\d\.]+)\s*[|\t]\s*(.{10,200}?)\s*[|\t]\s*(\d+[\.,]?\d*)\s*[|\t]\s*(\S+)\s*[|\t]\s*(\d+[\.,]?\d*)\s*[|\t]\s*(\d+[\.,]?\d*)/g,
  
  // Pattern 3: Arabic format - رقم البند: وصف - الكمية × السعر = الإجمالي
  /([\d\.٠-٩]+)\s*[-–:]\s*(.{10,200}?)\s*[-–]\s*الكمية[:\s]*([\d٠-٩,\.]+)\s*.+?السعر[:\s]*([\d٠-٩,\.]+)\s*.+?الإجمالي[:\s]*([\d٠-٩,\.]+)/gi,
  
  // Pattern 4: Simple numbered list with amounts
  /^([\d\.]+)\s+(.{15,200}?)\s+(\d+[\.,]?\d*)\s+(\S{1,15})\s+(\d+[\.,]?\d*)\s+(\d+[\.,]?\d*)$/gm,
  
  // Pattern 5: Arabic BOQ format - بند رقم X - الوصف
  /بند\s*(?:رقم)?\s*([\d\.٠-٩]+)[:\s-]+(.{10,200}?)\s*(?:الكمية|كمية)[:\s]*([\d٠-٩,\.]+)\s*(?:الوحدة)?[:\s]*(\S+)?\s*(?:السعر|سعر)[:\s]*([\d٠-٩,\.]+)/gi,
];

// Alternative simpler patterns for fallback
const SIMPLE_PATTERNS = [
  // Numbers followed by text and amounts at line end
  /^([\d\.]+)[)\.\s]+(.{10,150}?)\s{2,}(\d{1,10}[\.,]?\d{0,3})$/gm,
  
  // Arabic numbered items
  /([\d٠-٩\.]+)\s*[-–\.]\s*(.{10,150})/g,
];

function extractItemsFromText(text: string): LocalTextItem[] {
  const items: LocalTextItem[] = [];
  const seenKeys = new Set<string>();
  
  // Try each pattern
  for (const pattern of ITEM_PATTERNS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [, itemNo, description, qtyStr, unitStr, rateStr, amountStr] = match;
      
      if (!itemNo || !description || description.length < 5) continue;
      
      const quantity = parseNumber(qtyStr);
      const unitPrice = parseNumber(rateStr);
      const totalPrice = parseNumber(amountStr) || (quantity * unitPrice);
      
      // Create unique key to avoid duplicates
      const key = `${convertArabicNumerals(itemNo)}-${description.slice(0, 30)}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      
      const item: LocalTextItem = {
        item_number: convertArabicNumerals(itemNo.trim()),
        description: description.trim(),
        unit: extractUnit(unitStr || description),
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        category: detectCategory(description),
      };
      
      // Validate
      const issues: string[] = [];
      if (quantity <= 0) issues.push('كمية مفقودة');
      if (unitPrice <= 0) issues.push('سعر مفقود');
      if (totalPrice > 0 && quantity > 0 && unitPrice > 0) {
        const expected = quantity * unitPrice;
        if (Math.abs(expected - totalPrice) / Math.max(expected, 1) > 0.01) {
          issues.push('تباين في الحساب');
        }
      }
      
      item.validation = { isValid: issues.length === 0, issues };
      items.push(item);
    }
  }
  
  // If no items found, try simpler patterns
  if (items.length === 0) {
    for (const pattern of SIMPLE_PATTERNS) {
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [, itemNo, description, amountStr] = match;
        
        if (!itemNo || !description || description.length < 5) continue;
        
        const key = `${convertArabicNumerals(itemNo)}-${description.slice(0, 30)}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        
        const item: LocalTextItem = {
          item_number: convertArabicNumerals(itemNo.trim()),
          description: description.trim(),
          unit: extractUnit(description),
          quantity: 1,
          unit_price: parseNumber(amountStr),
          total_price: parseNumber(amountStr),
          category: detectCategory(description),
        };
        
        item.validation = { isValid: false, issues: ['بيانات جزئية'] };
        items.push(item);
      }
    }
  }
  
  return items;
}

// Extract items by line-by-line analysis (for structured text)
function extractItemsByLineAnalysis(text: string): LocalTextItem[] {
  const lines = text.split('\n').filter(line => line.trim().length > 10);
  const items: LocalTextItem[] = [];
  
  // Look for lines that look like BOQ items
  const numberPattern = /^([\d\.٠-٩]+)/;
  const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*$/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if line starts with a number (item number)
    const numMatch = trimmed.match(numberPattern);
    if (!numMatch) continue;
    
    // Check if line ends with an amount
    const amountMatch = trimmed.match(amountPattern);
    
    // Extract description (between item number and amount)
    const itemNo = numMatch[1];
    const afterNum = trimmed.slice(numMatch[0].length).trim();
    
    let description = afterNum;
    let totalPrice = 0;
    
    if (amountMatch) {
      const amountStart = afterNum.lastIndexOf(amountMatch[1]);
      if (amountStart > 20) {
        description = afterNum.slice(0, amountStart).trim();
        totalPrice = parseNumber(amountMatch[1]);
      }
    }
    
    // Skip if description too short or too long
    if (description.length < 10 || description.length > 300) continue;
    
    // Skip header-like lines
    if (/^(رقم|بند|وصف|كمية|سعر|إجمالي|item|desc|qty|unit|rate|amount)/i.test(description)) continue;
    
    const item: LocalTextItem = {
      item_number: convertArabicNumerals(itemNo),
      description,
      unit: extractUnit(description),
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      category: detectCategory(description),
    };
    
    item.validation = { 
      isValid: totalPrice > 0, 
      issues: totalPrice <= 0 ? ['بيانات جزئية'] : [] 
    };
    
    items.push(item);
  }
  
  return items;
}

/**
 * Perform local analysis on text content - NO AI REQUIRED
 * Uses regex patterns to extract BOQ items
 */
export function performLocalTextAnalysis(
  text: string,
  options: { fileName?: string } = {}
): LocalTextAnalysisResult {
  const startTime = performance.now();
  
  // Detect language
  const detectedLanguage = isArabicText(text) 
    ? 'arabic' 
    : /[a-zA-Z]/.test(text) 
      ? (/[\u0600-\u06FF]/.test(text) ? 'mixed' : 'english')
      : 'arabic';
  
  // Try pattern extraction first
  let items = extractItemsFromText(text);
  let extractionMethod = 'pattern_matching';
  
  // If few items found, try line-by-line analysis
  if (items.length < 5) {
    const lineItems = extractItemsByLineAnalysis(text);
    if (lineItems.length > items.length) {
      items = lineItems;
      extractionMethod = 'line_analysis';
    }
  }
  
  // Remove duplicates by item_number
  const uniqueItems = items.filter((item, index, self) => 
    index === self.findIndex(i => i.item_number === item.item_number)
  );
  
  // Calculate summary
  const validItems = uniqueItems.filter(item => item.validation?.isValid);
  const totalValue = uniqueItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const categories = [...new Set(uniqueItems.map(item => item.category))];
  
  // Quality score
  const validRatio = uniqueItems.length > 0 ? validItems.length / uniqueItems.length : 0;
  const hasAmounts = uniqueItems.filter(i => i.total_price > 0).length;
  const amountRatio = uniqueItems.length > 0 ? hasAmounts / uniqueItems.length : 0;
  const qualityScore = Math.round(validRatio * 50 + amountRatio * 50);
  
  // Quality issues
  const qualityIssues: string[] = [];
  if (uniqueItems.length === 0) {
    qualityIssues.push('لم يتم العثور على بنود');
  }
  if (validRatio < 0.5) {
    qualityIssues.push(`${uniqueItems.length - validItems.length} بند به مشاكل`);
  }
  if (amountRatio < 0.5) {
    qualityIssues.push('العديد من البنود بدون أسعار');
  }
  
  const endTime = performance.now();
  
  return {
    items: uniqueItems,
    summary: {
      total_items: uniqueItems.length,
      total_value: totalValue,
      valid_items: validItems.length,
      invalid_items: uniqueItems.length - validItems.length,
      currency: 'SAR',
      categories,
      quality_score: qualityScore,
      quality_issues: qualityIssues,
      detected_language: detectedLanguage,
    },
    analysis_type: 'local_text',
    analysis_date: new Date().toISOString(),
    processing_time_ms: Math.round(endTime - startTime),
    extraction_method: extractionMethod,
    raw_text_length: text.length,
  };
}

/**
 * Check if local text analysis produced meaningful results
 * Returns true if we should offer AI enrichment
 */
export function shouldUseAIForText(result: LocalTextAnalysisResult): boolean {
  // Use AI if:
  // 1. Very few items found (less than 5)
  // 2. Quality score is very low (< 30)
  // 3. Most items have no prices
  
  if (result.items.length < 5) return true;
  if (result.summary.quality_score < 30) return true;
  
  const itemsWithPrices = result.items.filter(i => i.total_price > 0).length;
  if (itemsWithPrices < result.items.length * 0.3) return true;
  
  return false;
}

/**
 * Quick check if text looks like it contains BOQ data
 */
export function textContainsBOQData(text: string): boolean {
  // Check for common BOQ indicators
  const indicators = [
    /\d+\.\d+\s+.{10,}?\s+\d+/,  // Numbered items with quantities
    /جدول\s*كميات|bill\s*of\s*quantit/i,  // BOQ header
    /الكمية|كمية|quantity|qty/i,  // Quantity column
    /السعر|سعر|rate|price/i,  // Price column
    /الإجمالي|إجمالي|total|amount/i,  // Total column
    /بند\s*رقم|item\s*no/i,  // Item number
  ];
  
  const matchCount = indicators.filter(pattern => pattern.test(text)).length;
  return matchCount >= 2;
}
