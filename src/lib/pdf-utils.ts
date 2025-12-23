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
    
    // Try UTF-8 first, then Windows-1256 (Arabic encoding)
    let content = "";
    try {
      const utf8Decoder = new TextDecoder("utf-8", { fatal: false });
      content = utf8Decoder.decode(uint8Array);
    } catch {
      // Fallback to Windows-1256 for Arabic PDFs
      const arabicDecoder = new TextDecoder("windows-1256", { fatal: false });
      content = arabicDecoder.decode(uint8Array);
    }
    
    let extractedText = "";
    
    // Method 1: Extract text from PDF stream objects (most reliable)
    const streamMatches = content.match(/stream[\s\S]*?endstream/g);
    if (streamMatches) {
      for (const stream of streamMatches) {
        // Look for text showing operators (Tj, TJ)
        const textOps = stream.match(/\(([^)]*)\)\s*Tj/g);
        if (textOps) {
          const texts = textOps.map(op => {
            const match = op.match(/\(([^)]*)\)/);
            return match ? match[1] : '';
          });
          extractedText += texts.join(' ') + '\n';
        }
        
        // Look for TJ arrays (multiple text segments)
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
    
    // Method 2: Extract text from parentheses patterns (fallback)
    if (extractedText.length < 100) {
      const textMatches = content.match(/\(([^)]+)\)/g);
      if (textMatches) {
        const filtered = textMatches
          .map(match => match.slice(1, -1))
          .filter(t => t.length > 1 && /[\u0600-\u06FFa-zA-Z0-9]/.test(t))
          .filter(t => !t.startsWith('/') && !t.includes('<<') && !t.includes('endobj'));
        extractedText = filtered.join(" ");
      }
    }
    
    // Method 3: Extract text from content streams more aggressively
    if (extractedText.length < 100) {
      const btMatches = content.match(/BT[\s\S]*?ET/g);
      if (btMatches) {
        for (const bt of btMatches) {
          const textParts = bt.match(/\(([^)]*)\)/g);
          if (textParts) {
            extractedText += textParts.map(p => p.slice(1, -1)).join(' ') + ' ';
          }
        }
      }
    }
    
    // Clean up the text - handle Arabic properly
    extractedText = extractedText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, " ")
      .replace(/\\(\d{3})/g, (_, oct) => {
        // Handle octal encoding for Arabic characters
        const charCode = parseInt(oct, 8);
        return String.fromCharCode(charCode);
      })
      .replace(/\s+/g, " ")
      .trim();
    
    console.log("Raw extracted text length:", extractedText.length);
    console.log("First 200 chars:", extractedText.substring(0, 200));
    
    // CRITICAL: Check for binary/corrupted data FIRST before validation
    const binaryCharCount = (extractedText.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x80-\xFF]/g) || []).length;
    const binaryRatio = extractedText.length > 0 ? binaryCharCount / extractedText.length : 1;
    
    console.log(`Binary check: ${binaryCharCount} invalid chars out of ${extractedText.length} (${(binaryRatio * 100).toFixed(2)}%)`);
    
    if (binaryRatio > 0.3) {
      // More than 30% binary/invalid characters - this is corrupted data
      console.log("⚠️ Binary data detected - extraction failed");
      return `[فشل استخراج النص]

ملف: ${file.name}
الحجم: ${(file.size / 1024).toFixed(2)} KB

💡 هذا الملف يحتوي على:
- صور ممسوحة ضوئياً (Scanned PDF)
- نص في شكل صور (يحتاج OCR)
- تنسيق PDF محمي أو مشفر

🔧 الحل:
1. افتح ملف PDF
2. حدد النص بالماوس (Ctrl+A)
3. انسخه (Ctrl+C)
4. الصقه في المربع أدناه

أو استخدم برنامج OCR لتحويل الصور إلى نص`;
    }
    
    // After cleaning, check if we have enough valid text
    const hasArabic = /[\u0600-\u06FF]/.test(extractedText);
    const hasEnglish = /[a-zA-Z]/.test(extractedText);
    const hasNumbers = /\d/.test(extractedText);
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 2).length;
    
    // If after cleaning we still don't have useful content
    if (extractedText.length < 50 || (!hasArabic && !hasEnglish) || wordCount < 10) {
      console.log(`Extraction failed: ${extractedText.length} chars, ${wordCount} words`);
      
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
    
    console.log(`Successfully extracted ${extractedText.length} characters, ${wordCount} words`);
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
  if (text.includes("[فشل استخراج النص]") || text.includes("[تعذر استخراج النص") || text.includes("[لم يتم العثور")) {
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
