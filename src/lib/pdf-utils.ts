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
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Use simple text extraction from PDF binary
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const content = decoder.decode(uint8Array);
    
    let extractedText = "";
    
    // Method 1: Extract text from PDF stream objects
    const streamMatches = content.match(/stream[\s\S]*?endstream/g);
    if (streamMatches) {
      for (const stream of streamMatches) {
        // Look for text showing operators (Tj, TJ, ')
        const textOps = stream.match(/\(([^)]*)\)\s*Tj/g);
        if (textOps) {
          const texts = textOps.map(op => {
            const match = op.match(/\(([^)]*)\)/);
            return match ? match[1] : '';
          });
          extractedText += texts.join(' ') + '\n';
        }
        
        // Look for TJ arrays
        const tjArrays = stream.match(/\[([^\]]*)\]\s*TJ/g);
        if (tjArrays) {
          for (const arr of tjArrays) {
            const textParts = arr.match(/\(([^)]*)\)/g);
            if (textParts) {
              const texts = textParts.map(p => p.slice(1, -1));
              extractedText += texts.join('') + ' ';
            }
          }
        }
      }
    }
    
    // Method 2: Extract text from parentheses patterns
    if (extractedText.length < 100) {
      const textMatches = content.match(/\(([^)]+)\)/g);
      if (textMatches) {
        const filtered = textMatches
          .map(match => match.slice(1, -1))
          .filter(t => t.length > 1 && /[\u0600-\u06FFa-zA-Z0-9]/.test(t))
          .filter(t => !t.startsWith('/') && !t.includes('<<'));
        extractedText = filtered.join(" ");
      }
    }
    
    // Clean up the text
    extractedText = extractedText
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\s+/g, " ")
      .trim();
    
    // CRITICAL: Check for binary data before returning
    const invalidCharCount = (extractedText.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
    const invalidRatio = invalidCharCount / (extractedText.length || 1);
    
    if (invalidRatio > 0.05 || extractedText.length < 50) {
      console.log(`Extraction failed: ${extractedText.length} chars, ${(invalidRatio * 100).toFixed(1)}% invalid`);
      
      // Return a clear error message, not the binary data
      return `[فشل استخراج النص]

ملف: ${file.name}
الحجم: ${(file.size / 1024).toFixed(2)} KB

💡 هذا الملف يحتوي على:
- صور ممسوحة ضوئياً (Scanned PDF)
- نص في شكل صور
- تنسيق PDF محمي

🔧 الحل:
1. افتح ملف PDF
2. حدد النص بالماوس (Ctrl+A)
3. انسخه (Ctrl+C)
4. الصقه في المربع أدناه`;
    }
    
    console.log(`Successfully extracted ${extractedText.length} characters`);
    return extractedText;
    
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`فشل في قراءة الملف: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
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
  if (text.includes("[تعذر استخراج النص") || text.includes("[لم يتم العثور")) {
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
