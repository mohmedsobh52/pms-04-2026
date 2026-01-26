import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onLogoChange?.(logo);
  }, [logo, onLogoChange]);

  const processFile = useCallback((file: File) => {
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
  }, [isArabic, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
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
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">
            {isArabic ? "شعار الشركة" : "Company Logo"}
          </CardTitle>
        </div>
        <CardDescription>
          {isArabic 
            ? "يظهر الشعار في التقارير والفواتير"
            : "The logo will appear in reports and invoices"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logo ? (
          <div className="flex items-center gap-6">
            {/* Logo Preview */}
            <div className="relative">
              <div className="w-32 h-32 rounded-lg border-2 border-border bg-white p-2 flex items-center justify-center">
                <img 
                  src={logo} 
                  alt="Company Logo" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 w-7 h-7"
                onClick={removeLogo}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Logo Info & Change Button */}
            <div className="flex-1 space-y-3">
              <div className="text-sm text-muted-foreground">
                {isArabic 
                  ? "الشعار محفوظ محلياً وسيظهر في جميع التقارير"
                  : "Logo is saved locally and will appear in all reports"}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {isArabic ? "تغيير الشعار" : "Change Logo"}
              </Button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer",
              "flex flex-col items-center justify-center text-center gap-4",
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
              isDragging ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Cloud className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="font-medium text-foreground">
                {isArabic ? "اسحب الشعار هنا أو اضغط للتصفح" : "Drag logo here or click to browse"}
              </p>
              <p className="text-sm text-muted-foreground">
                PNG, JPG {isArabic ? "حتى" : "up to"} 2MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload className="w-4 h-4" />
              {isArabic ? "رفع شعار" : "Upload Logo"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
