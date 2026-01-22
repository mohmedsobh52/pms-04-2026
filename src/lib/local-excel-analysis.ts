/**
 * Local Excel Analysis - Deterministic analysis without AI
 * This provides instant results for Excel files by extracting and validating data locally
 */

import { ExcelBOQItem, parseArabicNumber, convertArabicNumbers } from './excel-utils';

export interface LocalAnalysisItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string;
  notes?: string;
  validation?: {
    isValid: boolean;
    issues: string[];
  };
}

export interface LocalAnalysisSummary {
  total_items: number;
  total_value: number;
  valid_items: number;
  invalid_items: number;
  missing_prices: number;
  missing_quantities: number;
  price_discrepancies: number;
  currency: string;
  categories: string[];
  quality_score: number;
  quality_issues: string[];
}

export interface LocalAnalysisResult {
  items: LocalAnalysisItem[];
  summary: LocalAnalysisSummary;
  analysis_type: 'local_excel';
  analysis_date: string;
  file_name?: string;
  processing_time_ms: number;
}

// Unit normalization map (Arabic and English)
const UNIT_NORMALIZATION: Record<string, string> = {
  // Area
  'm2': 'م²', 'sqm': 'م²', 'sq.m': 'م²', 'م.م': 'م²', 'م2': 'م²', 'متر مربع': 'م²',
  // Volume
  'm3': 'م³', 'cbm': 'م³', 'cu.m': 'م³', 'م.م.م': 'م³', 'م3': 'م³', 'متر مكعب': 'م³',
  // Length
  'm': 'م.ط', 'lm': 'م.ط', 'ml': 'م.ط', 'م.ط': 'م.ط', 'متر طولي': 'م.ط', 'متر': 'م.ط',
  // Count
  'no': 'عدد', 'nos': 'عدد', 'ea': 'عدد', 'each': 'عدد', 'pcs': 'عدد', 'pc': 'عدد',
  'عدد': 'عدد', 'قطعة': 'عدد', 'وحدة': 'عدد',
  // Weight
  'kg': 'كجم', 'kgs': 'كجم', 'كجم': 'كجم', 'كيلو': 'كجم',
  'ton': 'طن', 'tons': 'طن', 't': 'طن', 'طن': 'طن',
  // Other
  'ls': 'مقطوعية', 'l.s': 'مقطوعية', 'l.s.': 'مقطوعية', 'lumpsum': 'مقطوعية', 'مقطوعية': 'مقطوعية',
  'day': 'يوم', 'days': 'يوم', 'يوم': 'يوم',
  'hr': 'ساعة', 'hour': 'ساعة', 'hours': 'ساعة', 'ساعة': 'ساعة',
};

// Detect category from description
function detectCategory(description: string): string {
  const desc = description.toLowerCase();
  const descAr = description;
  
  // Construction categories detection
  const categories: [string[], string][] = [
    // Excavation
    [['excavat', 'dig', 'trench', 'حفر', 'ردم', 'تسوية', 'خندق'], 'أعمال الحفر والردم'],
    // Concrete
    [['concrete', 'reinforc', 'rebar', 'خرسانة', 'حديد تسليح', 'صب', 'قواعد'], 'أعمال الخرسانة'],
    // Masonry
    [['block', 'brick', 'mason', 'wall', 'بلك', 'طوب', 'بناء', 'جدار', 'حائط'], 'أعمال البناء'],
    // Plaster/Finishing
    [['plaster', 'render', 'finish', 'paint', 'لياسة', 'بياض', 'طلاء', 'دهان', 'تشطيب'], 'أعمال التشطيبات'],
    // Tiling
    [['tile', 'ceramic', 'marble', 'granite', 'بلاط', 'سيراميك', 'رخام', 'جرانيت', 'أرضيات'], 'أعمال البلاط والأرضيات'],
    // Electrical
    [['electric', 'wire', 'cable', 'light', 'power', 'كهرب', 'إنارة', 'أسلاك', 'توصيل'], 'أعمال الكهرباء'],
    // Plumbing
    [['plumb', 'pipe', 'water', 'drain', 'sanit', 'صحي', 'مياه', 'صرف', 'أنابيب', 'سباكة'], 'أعمال السباكة'],
    // HVAC
    [['hvac', 'air condition', 'ventil', 'duct', 'تكييف', 'تهوية', 'مجاري هواء'], 'أعمال التكييف'],
    // Steel
    [['steel', 'metal', 'iron', 'حديد', 'معدن', 'فولاذ', 'هيكل معدني'], 'أعمال الحديد'],
    // Doors/Windows
    [['door', 'window', 'glass', 'aluminum', 'أبواب', 'نوافذ', 'زجاج', 'ألمنيوم'], 'أعمال الأبواب والنوافذ'],
    // Roofing
    [['roof', 'insul', 'water proof', 'سقف', 'عزل', 'تسريب'], 'أعمال العزل والأسقف'],
    // Landscaping
    [['landscape', 'garden', 'plant', 'حدائق', 'تنسيق', 'زراعة', 'أشجار'], 'أعمال التنسيق الخارجي'],
  ];
  
  for (const [keywords, category] of categories) {
    if (keywords.some(kw => desc.includes(kw) || descAr.includes(kw))) {
      return category;
    }
  }
  
  return 'أعمال عامة';
}

// Normalize unit
function normalizeUnit(unit: string | undefined): string {
  if (!unit) return 'م';
  const normalized = unit.toString().toLowerCase().trim();
  return UNIT_NORMALIZATION[normalized] || unit;
}

// Validate item and detect issues
function validateItem(item: LocalAnalysisItem): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for missing data
  if (!item.description || item.description.trim().length < 3) {
    issues.push('وصف ناقص أو غير واضح');
  }
  
  if (!item.quantity || item.quantity <= 0) {
    issues.push('الكمية مفقودة أو صفر');
  }
  
  if (!item.unit_price || item.unit_price <= 0) {
    issues.push('سعر الوحدة مفقود أو صفر');
  }
  
  // Check price calculation (Amount ≈ Qty × Rate within 1% tolerance)
  if (item.quantity > 0 && item.unit_price > 0 && item.total_price > 0) {
    const expectedTotal = item.quantity * item.unit_price;
    const tolerance = 0.01; // 1%
    const difference = Math.abs(expectedTotal - item.total_price) / Math.max(expectedTotal, 1);
    
    if (difference > tolerance) {
      issues.push(`تباين في الحساب: المتوقع ${expectedTotal.toFixed(2)} ≠ الفعلي ${item.total_price.toFixed(2)}`);
    }
  }
  
  // Check for suspiciously high/low values
  if (item.unit_price > 1000000) {
    issues.push('سعر الوحدة مرتفع جداً');
  }
  
  if (item.quantity > 1000000) {
    issues.push('الكمية مرتفعة جداً');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Convert Excel items to normalized analysis items
 */
export function convertExcelToAnalysisItems(excelItems: ExcelBOQItem[]): LocalAnalysisItem[] {
  return excelItems.map((item, index) => {
    const quantity = parseArabicNumber(item.quantity) || 0;
    const unitPrice = parseArabicNumber(item.unitPrice) || 0;
    let totalPrice = parseArabicNumber(item.totalPrice) || 0;
    
    // Calculate total if missing
    if (totalPrice === 0 && quantity > 0 && unitPrice > 0) {
      totalPrice = quantity * unitPrice;
    }
    
    const description = item.description?.trim() || '';
    
    const analysisItem: LocalAnalysisItem = {
      item_number: convertArabicNumbers(item.itemNo || `${index + 1}`),
      description,
      unit: normalizeUnit(item.unit),
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      category: detectCategory(description),
      notes: item.notes,
    };
    
    // Add validation
    analysisItem.validation = validateItem(analysisItem);
    
    return analysisItem;
  });
}

/**
 * Perform local analysis on Excel items - NO AI REQUIRED
 * This is deterministic and instant
 */
export function performLocalExcelAnalysis(
  excelItems: ExcelBOQItem[],
  fileName?: string
): LocalAnalysisResult {
  const startTime = performance.now();
  
  // Convert items
  const items = convertExcelToAnalysisItems(excelItems);
  
  // Calculate summary
  const validItems = items.filter(item => item.validation?.isValid);
  const invalidItems = items.filter(item => !item.validation?.isValid);
  const missingPrices = items.filter(item => !item.unit_price || item.unit_price <= 0);
  const missingQuantities = items.filter(item => !item.quantity || item.quantity <= 0);
  const priceDiscrepancies = items.filter(item => 
    item.validation?.issues.some(i => i.includes('تباين'))
  );
  
  // Get unique categories
  const categories = [...new Set(items.map(item => item.category))];
  
  // Calculate total value
  const totalValue = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  
  // Calculate quality score (0-100)
  const validRatio = items.length > 0 ? validItems.length / items.length : 0;
  const completenessRatio = items.length > 0 
    ? items.filter(i => i.quantity > 0 && i.unit_price > 0 && i.description).length / items.length 
    : 0;
  const qualityScore = Math.round((validRatio * 60 + completenessRatio * 40));
  
  // Collect quality issues
  const qualityIssues: string[] = [];
  if (missingPrices.length > 0) {
    qualityIssues.push(`${missingPrices.length} بند بدون سعر وحدة`);
  }
  if (missingQuantities.length > 0) {
    qualityIssues.push(`${missingQuantities.length} بند بدون كمية`);
  }
  if (priceDiscrepancies.length > 0) {
    qualityIssues.push(`${priceDiscrepancies.length} بند به تباين في الحساب`);
  }
  if (items.filter(i => !i.description || i.description.length < 5).length > 0) {
    qualityIssues.push(`${items.filter(i => !i.description || i.description.length < 5).length} بند بوصف ناقص`);
  }
  
  const endTime = performance.now();
  
  return {
    items,
    summary: {
      total_items: items.length,
      total_value: totalValue,
      valid_items: validItems.length,
      invalid_items: invalidItems.length,
      missing_prices: missingPrices.length,
      missing_quantities: missingQuantities.length,
      price_discrepancies: priceDiscrepancies.length,
      currency: 'SAR',
      categories,
      quality_score: qualityScore,
      quality_issues: qualityIssues,
    },
    analysis_type: 'local_excel',
    analysis_date: new Date().toISOString(),
    file_name: fileName,
    processing_time_ms: Math.round(endTime - startTime),
  };
}

/**
 * Check if items need AI enrichment
 */
export function shouldOfferAIEnrichment(result: LocalAnalysisResult): boolean {
  // Offer AI enrichment if:
  // 1. Quality score is below 80
  // 2. More than 20% items have issues
  // 3. Categories are mostly "general"
  
  const generalCategoryRatio = result.items.filter(i => i.category === 'أعمال عامة').length / Math.max(result.items.length, 1);
  
  return (
    result.summary.quality_score < 80 ||
    result.summary.invalid_items > result.summary.total_items * 0.2 ||
    generalCategoryRatio > 0.5
  );
}
