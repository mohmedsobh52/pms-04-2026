import { useState, useEffect } from 'react';
import { Settings2, Zap, FileText, Gauge, Layers, Archive } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';

export interface AnalysisSettings {
  maxTextLength: number; // in thousands (50, 75, 100, 150)
  autoTruncate: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number; // in seconds
  // New chunked analysis settings
  enableChunkedAnalysis: boolean;
  chunkSize: number; // in thousands (20, 30, 40, 50)
  enableCompression: boolean;
  useJobQueue: boolean;
}

const DEFAULT_SETTINGS: AnalysisSettings = {
  maxTextLength: 100,
  autoTruncate: true,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 2,
  enableChunkedAnalysis: true,
  chunkSize: 30,
  enableCompression: true,
  useJobQueue: false,
};

const STORAGE_KEY = 'analysis_settings';

export function getAnalysisSettings(): AnalysisSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load analysis settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveAnalysisSettings(settings: AnalysisSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save analysis settings:', e);
  }
}

interface AnalysisSettingsDialogProps {
  trigger?: React.ReactNode;
  onSettingsChange?: (settings: AnalysisSettings) => void;
}

export function AnalysisSettingsDialog({ trigger, onSettingsChange }: AnalysisSettingsDialogProps) {
  const { isArabic } = useLanguage();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AnalysisSettings>(getAnalysisSettings);

  useEffect(() => {
    setSettings(getAnalysisSettings());
  }, [open]);

  const handleSave = () => {
    saveAnalysisSettings(settings);
    onSettingsChange?.(settings);
    setOpen(false);
  };

  const getTextLengthLabel = (value: number) => {
    if (value <= 50) return isArabic ? 'سريع - 50 ألف حرف' : 'Fast - 50K chars';
    if (value <= 75) return isArabic ? 'متوازن - 75 ألف حرف' : 'Balanced - 75K chars';
    if (value <= 100) return isArabic ? 'عادي - 100 ألف حرف' : 'Normal - 100K chars';
    return isArabic ? 'كامل - 150 ألف حرف' : 'Full - 150K chars';
  };

  const getTextLengthColor = (value: number) => {
    if (value <= 50) return 'bg-green-500';
    if (value <= 75) return 'bg-blue-500';
    if (value <= 100) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" />
            {isArabic ? 'إعدادات التحليل' : 'Analysis Settings'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md" dir={isArabic ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {isArabic ? 'إعدادات التحليل' : 'Analysis Settings'}
          </DialogTitle>
          <DialogDescription>
            {isArabic 
              ? 'تحكم في حجم النص وإعدادات إعادة المحاولة' 
              : 'Control text size and retry settings'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Max Text Length */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {isArabic ? 'حجم النص المُرسل' : 'Text Size Limit'}
              </Label>
              <Badge className={`${getTextLengthColor(settings.maxTextLength)} text-white`}>
                {settings.maxTextLength}K
              </Badge>
            </div>
            <Slider
              value={[settings.maxTextLength]}
              onValueChange={([value]) => setSettings(s => ({ ...s, maxTextLength: value }))}
              min={50}
              max={150}
              step={25}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              {getTextLengthLabel(settings.maxTextLength)}
            </p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                {isArabic ? 'أسرع' : 'Faster'}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                {isArabic ? 'أشمل' : 'Complete'}
              </span>
            </div>
          </div>

          {/* Auto Truncate */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {isArabic ? 'تقليص تلقائي' : 'Auto Truncate'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isArabic 
                  ? 'تقليص النص تلقائياً للملفات الكبيرة' 
                  : 'Automatically trim large files'}
              </p>
            </div>
            <Switch
              checked={settings.autoTruncate}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, autoTruncate: checked }))}
            />
          </div>

          {/* Enable Retry */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                {isArabic ? 'إعادة المحاولة التلقائية' : 'Auto Retry'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isArabic 
                  ? 'إعادة المحاولة عند فشل الاتصال' 
                  : 'Retry on connection failure'}
              </p>
            </div>
            <Switch
              checked={settings.enableRetry}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, enableRetry: checked }))}
            />
          </div>

          {settings.enableRetry && (
            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>{isArabic ? 'عدد المحاولات' : 'Max Retries'}</Label>
                  <span className="text-sm font-medium">{settings.maxRetries}</span>
                </div>
                <Slider
                  value={[settings.maxRetries]}
                  onValueChange={([value]) => setSettings(s => ({ ...s, maxRetries: value }))}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>{isArabic ? 'التأخير (ثانية)' : 'Delay (seconds)'}</Label>
                  <span className="text-sm font-medium">{settings.retryDelay}s</span>
                </div>
                <Slider
                  value={[settings.retryDelay]}
                  onValueChange={([value]) => setSettings(s => ({ ...s, retryDelay: value }))}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
            </div>
          )}

          {/* Chunked Analysis Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  {isArabic ? 'التحليل المجزأ' : 'Chunked Analysis'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isArabic 
                    ? 'تقسيم الملفات الكبيرة لتحليل أفضل' 
                    : 'Split large files for better analysis'}
                </p>
              </div>
              <Switch
                checked={settings.enableChunkedAnalysis}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, enableChunkedAnalysis: checked }))}
              />
            </div>

            {settings.enableChunkedAnalysis && (
              <div className="space-y-4 pl-6 border-l-2 border-muted">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{isArabic ? 'حجم الجزء' : 'Chunk Size'}</Label>
                    <span className="text-sm font-medium">{settings.chunkSize}K</span>
                  </div>
                  <Slider
                    value={[settings.chunkSize]}
                    onValueChange={([value]) => setSettings(s => ({ ...s, chunkSize: value }))}
                    min={20}
                    max={50}
                    step={10}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Compression */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                {isArabic ? 'ضغط البيانات' : 'Data Compression'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isArabic 
                  ? 'ضغط النص قبل الإرسال (LZ-String)' 
                  : 'Compress text before sending (LZ-String)'}
              </p>
            </div>
            <Switch
              checked={settings.enableCompression}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, enableCompression: checked }))}
            />
          </div>

          {/* Job Queue (requires login) */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                {isArabic ? 'المعالجة الخلفية' : 'Background Processing'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isArabic 
                  ? 'للملفات الضخمة (يتطلب تسجيل الدخول)' 
                  : 'For huge files (requires login)'}
              </p>
            </div>
            <Switch
              checked={settings.useJobQueue}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, useJobQueue: checked }))}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave}>
            {isArabic ? 'حفظ' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
