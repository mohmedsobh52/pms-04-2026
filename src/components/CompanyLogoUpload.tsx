import { useState, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

const LOGO_STORAGE_KEY = 'boq_company_logo';

interface CompanyLogoUploadProps {
  onLogoChange?: (logoDataUrl: string | null) => void;
}

export function getStoredLogo(): string | null {
  try {
    return localStorage.getItem(LOGO_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function CompanyLogoUpload({ onLogoChange }: CompanyLogoUploadProps) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [logo, setLogo] = useState<string | null>(() => getStoredLogo());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onLogoChange?.(logo);
  }, [logo, onLogoChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "الرجاء اختيار ملف صورة" : "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "حجم الملف كبير جداً (الحد الأقصى 2MB)" : "File size too large (max 2MB)",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      // Resize image to reasonable dimensions for storage
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 300;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const resizedDataUrl = canvas.toDataURL('image/png', 0.9);
        
        try {
          localStorage.setItem(LOGO_STORAGE_KEY, resizedDataUrl);
          setLogo(resizedDataUrl);
          toast({
            title: isArabic ? "تم الحفظ" : "Logo Saved",
            description: isArabic ? "تم حفظ لوجو الشركة بنجاح" : "Company logo saved successfully",
          });
        } catch (e) {
          toast({
            title: isArabic ? "خطأ" : "Error",
            description: isArabic ? "فشل حفظ اللوجو" : "Failed to save logo",
            variant: "destructive",
          });
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    try {
      localStorage.removeItem(LOGO_STORAGE_KEY);
      setLogo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast({
        title: isArabic ? "تم الحذف" : "Logo Removed",
        description: isArabic ? "تم حذف لوجو الشركة" : "Company logo removed",
      });
    } catch (e) {
      console.error('Error removing logo:', e);
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {logo ? (
            <div className="relative">
              <img 
                src={logo} 
                alt="Company Logo" 
                className="w-16 h-16 object-contain rounded-lg border border-border bg-white"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 w-6 h-6"
                onClick={removeLogo}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1">
            <p className="font-medium text-sm mb-1">
              {isArabic ? "لوجو الشركة" : "Company Logo"}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              {isArabic ? "سيظهر في تقارير PDF" : "Will appear in PDF reports"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {logo 
                ? (isArabic ? "تغيير اللوجو" : "Change Logo")
                : (isArabic ? "رفع لوجو" : "Upload Logo")
              }
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
