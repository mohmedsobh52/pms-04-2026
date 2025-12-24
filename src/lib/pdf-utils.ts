import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '@/integrations/supabase/client';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
  usedOCR?: boolean;
}

// Configuration for batch processing
const BATCH_CONFIG = {
  CHUNK_SIZE: 10, // Pages per chunk
  MAX_PARALLEL_CHUNKS: 3, // Process 3 chunks in parallel
  LARGE_PDF_THRESHOLD: 50, // PDFs with 50+ pages use batch processing
};

// Convert PDF page to base64 image
async function pageToImage(page: any, scale: number = 2): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Cannot create canvas context');
  }
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  return canvas.toDataURL('image/png');
}

// Process a single page and extract text
async function extractPageText(pdf: any, pageNum: number): Promise<string> {
  try {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    let pageText = "";
    let lastY = -1;
    
    for (const item of textContent.items) {
      if ('str' in item && item.str) {
        const currentY = 'transform' in item ? item.transform[5] : -1;
        if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
          pageText += "\n";
        } else if (pageText.length > 0 && !pageText.endsWith(" ") && !item.str.startsWith(" ")) {
          pageText += " ";
        }
        pageText += item.str;
        lastY = currentY;
      }
    }
    
    return pageText.trim();
  } catch (error) {
    console.warn(`Error extracting page ${pageNum}:`, error);
    return "";
  }
}

// Process a chunk of pages in parallel
async function processChunk(
  pdf: any, 
  startPage: number, 
  endPage: number,
  onProgress?: (current: number, total: number) => void,
  totalPages?: number
): Promise<{ text: string; successCount: number }> {
  const pagePromises: Promise<{ pageNum: number; text: string }>[] = [];
  
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    pagePromises.push(
      extractPageText(pdf, pageNum).then(text => ({ pageNum, text }))
    );
  }
  
  const results = await Promise.all(pagePromises);
  let chunkText = "";
  let successCount = 0;
  
  // Sort by page number and combine
  results.sort((a, b) => a.pageNum - b.pageNum);
  
  for (const result of results) {
    if (result.text.length > 0) {
      chunkText += `--- Page ${result.pageNum} ---\n${result.text}\n\n`;
      successCount++;
    }
    onProgress?.(result.pageNum, totalPages || endPage);
  }
  
  return { text: chunkText, successCount };
}

// Batch process large PDFs with parallel chunk processing
export async function batchExtractFromPDF(
  pdf: any,
  onProgress?: (current: number, total: number) => void
): Promise<{ text: string; successCount: number; failedCount: number }> {
  const totalPages = pdf.numPages;
  const chunks: Array<{ start: number; end: number }> = [];
  
  // Create chunks
  for (let i = 1; i <= totalPages; i += BATCH_CONFIG.CHUNK_SIZE) {
    chunks.push({
      start: i,
      end: Math.min(i + BATCH_CONFIG.CHUNK_SIZE - 1, totalPages)
    });
  }
  
  console.log(`Batch processing ${totalPages} pages in ${chunks.length} chunks`);
  
  let fullText = "";
  let totalSuccess = 0;
  let processedPages = 0;
  
  // Process chunks in parallel batches
  for (let i = 0; i < chunks.length; i += BATCH_CONFIG.MAX_PARALLEL_CHUNKS) {
    const parallelChunks = chunks.slice(i, i + BATCH_CONFIG.MAX_PARALLEL_CHUNKS);
    
    const chunkResults = await Promise.all(
      parallelChunks.map(chunk => 
        processChunk(pdf, chunk.start, chunk.end, (current) => {
          processedPages = Math.max(processedPages, current);
          onProgress?.(processedPages, totalPages);
        }, totalPages)
      )
    );
    
    for (const result of chunkResults) {
      fullText += result.text;
      totalSuccess += result.successCount;
    }
  }
  
  return {
    text: fullText.trim(),
    successCount: totalSuccess,
    failedCount: totalPages - totalSuccess
  };
}

// Extract text using OCR (AI Vision)
async function extractWithOCR(
  pdf: any, 
  fileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const numPages = pdf.numPages;
  let fullText = '';
  
  console.log(`Starting OCR extraction for ${numPages} pages`);
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      onProgress?.(pageNum, numPages);
      console.log(`OCR processing page ${pageNum}/${numPages}`);
      
      const page = await pdf.getPage(pageNum);
      const imageBase64 = await pageToImage(page);
      
      const { data, error } = await supabase.functions.invoke('ocr-extract', {
        body: {
          imageBase64,
          pageNumber: pageNum,
          totalPages: numPages,
          fileName,
        },
      });
      
      if (error) {
        console.error(`OCR error on page ${pageNum}:`, error);
        fullText += `\n[خطأ في صفحة ${pageNum}]\n`;
        continue;
      }
      
      if (data?.success && data?.text) {
        fullText += `\n--- صفحة ${pageNum} ---\n${data.text}\n`;
      } else if (data?.error) {
        console.error(`OCR failed on page ${pageNum}:`, data.error);
        fullText += `\n[فشل OCR في صفحة ${pageNum}: ${data.error}]\n`;
      }
      
      // Small delay between pages to avoid rate limiting
      if (pageNum < numPages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (pageError) {
      console.error(`Error processing page ${pageNum}:`, pageError);
      fullText += `\n[خطأ في معالجة صفحة ${pageNum}]\n`;
    }
  }
  
  return fullText.trim();
}

export async function extractTextFromPDF(
  file: File,
  options?: {
    useOCR?: boolean;
    onOCRProgress?: (current: number, total: number) => void;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<string> {
  try {
    console.log("Starting PDF extraction for:", file.name);
    console.log("File size:", (file.size / 1024 / 1024).toFixed(2), "MB");
    
    const arrayBuffer = await file.arrayBuffer();
    
    // Use PDF.js to properly parse the PDF
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    console.log(`PDF loaded: ${totalPages} pages`);
    
    let fullText = "";
    let successfulPages = 0;
    let failedPages = 0;
    
    // Use batch processing for large PDFs (50+ pages)
    if (totalPages >= BATCH_CONFIG.LARGE_PDF_THRESHOLD) {
      console.log(`Large PDF detected (${totalPages} pages), using batch processing...`);
      const batchResult = await batchExtractFromPDF(pdf, options?.onProgress);
      fullText = batchResult.text;
      successfulPages = batchResult.successCount;
      failedPages = batchResult.failedCount;
    } else {
      // Standard extraction for smaller PDFs
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          options?.onProgress?.(pageNum, totalPages);
          
          const pageText = await extractPageText(pdf, pageNum);
          
          if (pageText.length > 0) {
            fullText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
            successfulPages++;
          }
          
          if (pageNum % 5 === 0 || pageNum === totalPages || totalPages <= 10) {
            console.log(`Extracted page ${pageNum}/${totalPages} (${pageText.length} chars)`);
          }
        } catch (pageError) {
          console.warn(`Error extracting page ${pageNum}:`, pageError);
          failedPages++;
        }
      }
    }
    
    console.log(`Extraction complete: ${successfulPages} successful, ${failedPages} failed out of ${totalPages} pages`);
    
    // Clean up the extracted text while preserving important formatting
    let extractedText = fullText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    console.log("Extracted text length:", extractedText.length);
    console.log("First 300 chars:", extractedText.substring(0, 300));
    
    // Validate the extracted text
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 1).length;
    
    console.log(`Standard extraction: ${extractedText.length} chars, ${wordCount} words`);
    
    // Check if extraction was successful
    const needsOCR = extractedText.length < 50 || wordCount < 10;
    
    if (needsOCR) {
      console.log("⚠️ Insufficient text - attempting OCR extraction");
      
      // If user requested OCR or we need it
      if (options?.useOCR !== false) {
        try {
          const ocrText = await extractWithOCR(pdf, file.name, options?.onOCRProgress);
          
          if (ocrText && ocrText.length > 50) {
            console.log(`✅ OCR extracted ${ocrText.length} characters`);
            return ocrText;
          }
        } catch (ocrError) {
          console.error("OCR extraction failed:", ocrError);
        }
      }
      
      // If OCR also failed or wasn't used
      return `[فشل استخراج النص - يمكنك تجربة OCR]

ملف: ${file.name}
الحجم: ${(file.size / 1024).toFixed(2)} KB
عدد الصفحات: ${pdf.numPages}

💡 هذا الملف يحتوي على:
- صور ممسوحة ضوئياً (Scanned PDF)
- نص في شكل صور (يحتاج OCR)

🔧 الحلول:
1. اضغط على زر "استخدم OCR" لاستخراج النص بالذكاء الاصطناعي
2. أو افتح ملف PDF الأصلي وانسخ النص يدوياً`;
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

// Standalone OCR extraction function
export async function extractWithOCROnly(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    return await extractWithOCR(pdf, file.name, onProgress);
  } catch (error) {
    console.error("OCR extraction error:", error);
    throw error;
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
  needsOCR: boolean;
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
      needsOCR: true,
    };
  }
  
  // Check for error messages from extraction
  const needsOCR = text.includes("[فشل استخراج النص - يمكنك تجربة OCR]");
  
  if (text.includes("[فشل استخراج النص") || text.includes("[فشل قراءة ملف PDF]") || text.includes("[تعذر استخراج النص") || text.includes("[لم يتم العثور")) {
    issues.push("فشل استخراج النص من الملف");
    return {
      isValid: false,
      hasArabic: false,
      hasNumbers: false,
      wordCount: 0,
      issues,
      isBinary: false,
      needsOCR,
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
    needsOCR: false,
  };
}
