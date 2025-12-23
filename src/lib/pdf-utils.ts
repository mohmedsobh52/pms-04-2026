import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log("Starting PDF extraction for:", file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    
    // Use PDF.js to properly parse the PDF
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log(`PDF loaded: ${pdf.numPages} pages`);
    
    let fullText = "";
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items with proper spacing
        const pageText = textContent.items
          .map((item: any) => {
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .join(' ');
        
        fullText += pageText + '\n';
      } catch (pageError) {
        console.warn(`Error extracting page ${pageNum}:`, pageError);
      }
    }
    
    // Clean up the extracted text
    let extractedText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    console.log("Extracted text length:", extractedText.length);
    console.log("First 300 chars:", extractedText.substring(0, 300));
    
    // Validate the extracted text
    const hasArabic = /[\u0600-\u06FF]/.test(extractedText);
    const hasEnglish = /[a-zA-Z]/.test(extractedText);
    const hasNumbers = /\d/.test(extractedText);
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 1).length;
    
    console.log(`Validation: Arabic=${hasArabic}, English=${hasEnglish}, Numbers=${hasNumbers}, Words=${wordCount}`);
    
    // Check if extraction was successful
    if (extractedText.length < 50 || wordCount < 10) {
      console.log("⚠️ Insufficient text extracted - PDF may contain images only");
      return `[فشل استخراج النص]

ملف: ${file.name}
الحجم: ${(file.size / 1024).toFixed(2)} KB
عدد الصفحات: ${pdf.numPages}

💡 هذا الملف يحتوي على:
- صور ممسوحة ضوئياً (Scanned PDF)
- نص في شكل صور (يحتاج OCR)
- أو لا يحتوي على نص قابل للتحديد

🔧 الحل:
1. افتح ملف PDF الأصلي
2. حدد النص بالماوس (Ctrl+A)
3. انسخه (Ctrl+C)
4. الصقه في المربع أدناه`;
    }
    
    console.log(`✅ Successfully extracted ${extractedText.length} characters, ${wordCount} words`);
    return extractedText;
    
  } catch (error) {
    console.error("PDF extraction error:", error);
    
    // Return a helpful error message
    return `[فشل قراءة ملف PDF]

ملف: ${file.name}
الخطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}

🔧 الحل:
1. تأكد من أن الملف ليس محمياً بكلمة مرور
2. جرب فتح الملف ونسخ النص يدوياً
3. الصق المحتوى في المربع أدناه`;
  }
}

// Check if text contains binary data
export function containsBinaryData(text: string): boolean {
  // Check for control characters (binary data indicators)
  const invalidCharCount = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  const invalidRatio = invalidCharCount / text.length;
  return invalidRatio > 0.05; // More than 5% invalid chars means binary
}

// Validate extracted text quality
export function validateExtractedText(text: string): {
  isValid: boolean;
  hasArabic: boolean;
  hasNumbers: boolean;
  wordCount: number;
  issues: string[];
  isBinary: boolean;
} {
  const issues: string[] = [];
  
  // Check for binary data first
  const isBinary = containsBinaryData(text);
  if (isBinary) {
    issues.push("النص يحتوي على بيانات ثنائية غير صالحة");
    return {
      isValid: false,
      hasArabic: false,
      hasNumbers: false,
      wordCount: 0,
      issues,
      isBinary: true,
    };
  }
  
  // Check for error messages from extraction
  if (text.includes("[فشل استخراج النص]") || text.includes("[فشل قراءة ملف PDF]") || text.includes("[تعذر استخراج النص") || text.includes("[لم يتم العثور")) {
    issues.push("فشل استخراج النص من الملف");
    return {
      isValid: false,
      hasArabic: false,
      hasNumbers: false,
      wordCount: 0,
      issues,
      isBinary: false,
    };
  }
  
  // Check for Arabic text
  const arabicPattern = /[\u0600-\u06FF]/;
  const hasArabic = arabicPattern.test(text);
  
  // Check for numbers (quantities)
  const numberPattern = /\d+/;
  const hasNumbers = numberPattern.test(text);
  
  // Word count
  const wordCount = text.split(/\s+/).filter(w => w.length > 1).length;
  
  if (!hasArabic && !text.match(/[a-zA-Z]/)) {
    issues.push("لا يحتوي على نص مقروء");
  }
  
  if (!hasNumbers) {
    issues.push("لا يحتوي على أرقام (كميات)");
  }
  
  if (wordCount < 20) {
    issues.push("عدد الكلمات قليل جداً");
  }
  
  return {
    isValid: issues.length === 0 && wordCount >= 20,
    hasArabic,
    hasNumbers,
    wordCount,
    issues,
    isBinary: false,
  };
}
