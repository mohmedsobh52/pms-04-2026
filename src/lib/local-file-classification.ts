/**
 * Local file classification utility for construction project files
 * Provides fallback classification when AI credits are exhausted
 */

export interface FileToClassify {
  fileName: string;
  fileType: string;
}

export interface ClassificationResult {
  fileName: string;
  category: string;
  confidence: number;
}

// Category patterns for matching file names (bilingual support)
const CATEGORY_PATTERNS: Record<string, { en: string[]; ar: string[] }> = {
  boq: {
    en: ['boq', 'bill of quantities', 'pricing', 'cost estimate', 'quantity', 'estimate', 'price list', 'unit rate', 'rates'],
    ar: ['كمي', 'مقايس', 'تسعير', 'بنود', 'جدول الكميات', 'كميات', 'اسعار', 'تقدير', 'معدلات']
  },
  drawings: {
    en: ['drawing', 'dwg', 'plan', 'section', 'elevation', 'detail', 'layout', 'floor plan', 'architectural', 'structural', 'mep', 'mechanical', 'electrical', 'plumbing'],
    ar: ['رسم', 'مخطط', 'قطاع', 'واجهة', 'تفصيل', 'تخطيط', 'معماري', 'انشائي', 'كهرباء', 'ميكانيكي', 'صحي']
  },
  specifications: {
    en: ['spec', 'specification', 'standard', 'technical', 'requirement', 'method statement', 'quality', 'material spec'],
    ar: ['مواصفات', 'معايير', 'فني', 'متطلبات', 'شروط', 'جودة', 'طريقة عمل']
  },
  contracts: {
    en: ['contract', 'agreement', 'legal', 'terms', 'conditions', 'scope', 'appendix', 'addendum', 'amendment'],
    ar: ['عقد', 'اتفاقية', 'قانوني', 'شروط', 'نطاق', 'ملحق', 'تعديل']
  },
  quotations: {
    en: ['quotation', 'quote', 'bid', 'offer', 'proposal', 'tender', 'rfq', 'rfp', 'price offer'],
    ar: ['عرض', 'سعر', 'مناقصة', 'تسعيرة', 'اقتراح', 'طلب عرض']
  },
  reports: {
    en: ['report', 'analysis', 'study', 'summary', 'review', 'inspection', 'assessment', 'evaluation', 'survey'],
    ar: ['تقرير', 'دراسة', 'تحليل', 'ملخص', 'مراجعة', 'فحص', 'تقييم', 'مسح']
  },
  schedules: {
    en: ['schedule', 'timeline', 'gantt', 'program', 'milestone', 'planning', 'baseline', 'progress'],
    ar: ['جدول', 'زمني', 'برنامج', 'مراحل', 'تخطيط', 'تقدم']
  }
};

// File type patterns for additional classification hints
const FILE_TYPE_HINTS: Record<string, string[]> = {
  drawings: ['dwg', 'dxf', 'dgn', 'rvt'],
  boq: ['xls', 'xlsx', 'csv'],
  reports: ['doc', 'docx', 'pdf'],
  schedules: ['mpp', 'xer', 'xml']
};

/**
 * Classify files locally based on filename and type patterns
 * @param files Array of files to classify
 * @returns Array of classification results
 */
export function classifyFilesLocally(files: FileToClassify[]): ClassificationResult[] {
  return files.map(file => {
    const name = file.fileName.toLowerCase();
    const type = file.fileType.toLowerCase();
    const extension = name.split('.').pop() || '';
    
    // First, try to match by filename patterns
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      const allPatterns = [...patterns.en, ...patterns.ar];
      if (allPatterns.some(pattern => name.includes(pattern.toLowerCase()))) {
        return {
          fileName: file.fileName,
          category,
          confidence: 0.75
        };
      }
    }
    
    // If no filename match, try to match by file extension
    for (const [category, extensions] of Object.entries(FILE_TYPE_HINTS)) {
      if (extensions.includes(extension)) {
        return {
          fileName: file.fileName,
          category,
          confidence: 0.6
        };
      }
    }
    
    // Additional heuristics based on file type
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
      // Images are often drawings or site photos
      if (name.includes('site') || name.includes('موقع') || name.includes('photo') || name.includes('صورة')) {
        return { fileName: file.fileName, category: 'reports', confidence: 0.6 };
      }
      return { fileName: file.fileName, category: 'drawings', confidence: 0.5 };
    }
    
    if (type.includes('pdf')) {
      // PDFs could be anything, but often drawings or contracts
      return { fileName: file.fileName, category: 'general', confidence: 0.4 };
    }
    
    // Default fallback
    return {
      fileName: file.fileName,
      category: 'general',
      confidence: 0.5
    };
  });
}
