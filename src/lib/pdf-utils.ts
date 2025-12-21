// Simple text extraction from PDF using browser FileReader
// For production, consider using a backend service for PDF parsing

export async function extractTextFromPDF(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Simple PDF text extraction - looks for text between stream markers
        let text = "";
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const content = decoder.decode(uint8Array);
        
        // Extract readable text patterns from PDF
        // This is a simplified extraction - works for text-based PDFs
        const textMatches = content.match(/\(([^)]+)\)/g);
        if (textMatches) {
          text = textMatches
            .map(match => match.slice(1, -1))
            .filter(t => t.length > 1 && /[\u0600-\u06FFa-zA-Z0-9]/.test(t))
            .join(" ");
        }
        
        // Also try to extract from BT/ET blocks (text blocks in PDF)
        const btBlocks = content.match(/BT[\s\S]*?ET/g);
        if (btBlocks) {
          const blockText = btBlocks
            .map(block => {
              const tjMatches = block.match(/\(([^)]+)\)[\s]*Tj/g);
              if (tjMatches) {
                return tjMatches
                  .map(m => m.replace(/\)[\s]*Tj$/, "").replace(/^\(/, ""))
                  .join(" ");
              }
              return "";
            })
            .filter(Boolean)
            .join(" ");
          
          if (blockText.length > text.length) {
            text = blockText;
          }
        }
        
        // Clean up the text
        text = text
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "")
          .replace(/\s+/g, " ")
          .trim();
        
        if (text.length < 50) {
          // If extraction failed, provide instruction
          resolve(`[تعذر استخراج النص من ملف PDF. يرجى نسخ محتوى الملف يدوياً أو استخدام ملف PDF يحتوي على نص قابل للتحديد]\n\nFile: ${file.name}\nSize: ${file.size} bytes`);
        } else {
          resolve(text);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
