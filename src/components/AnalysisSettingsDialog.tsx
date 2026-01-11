import { useState, useEffect } from 'react';
import { Settings2, Zap, FileText, Gauge, Layers, Archive, Clock, SplitSquareVertical, Bot, AlertTriangle, CheckCircle2, Server } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage } from '@/hooks/useLanguage';
import { useAnalysisTracking, type AIProvider } from '@/hooks/useAnalysisTracking';

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
  // Auto-chunk for large files
  autoChunkLargeFiles: boolean;
  autoChunkThreshold: number; // in KB (size threshold for auto-chunking)
  showEstimatedTime: boolean;
  // Auto job queue for large files
  autoJobQueueThreshold: number; // in KB (size threshold for auto job queue)
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
  useJobQueue: true,
  autoChunkLargeFiles: true,
  autoChunkThreshold: 500, // 500KB
  showEstimatedTime: true,
  autoJobQueueThreshold: 200, // 200KB - auto use job queue for files > 200KB
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
  const { selectedProvider, setSelectedProvider, getStatistics } = useAnalysisTracking();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AnalysisSettings>(getAnalysisSettings);

  useEffect(() => {
    setSettings(getAnalysisSettings());
  }, [open]);

  // Get statistics for provider recommendation
  const stats = getStatistics();
  
  // Calculate provider recommendation based on error rates
  const getProviderRecommendation = (): { provider: AIProvider; reason: string; reasonAr: string } => {
    if (stats.totalAnalyses < 5) {
      return { 
        provider: 'auto', 
        reason: 'Auto mode recommended for new users',
        reasonAr: 'الوضع التلقائي موصى به للمستخدمين الجدد'
      };
    }
    
    const errorRate = stats.errorCount / stats.totalAnalyses;
    const fallbackRate = stats.fallbackCount / stats.totalAnalyses;
    
    if (errorRate > 0.3) {
      return { 
        provider: 'lovable', 
        reason: 'High error rate detected, Lovable AI recommended for stability',
        reasonAr: 'معدل أخطاء مرتفع، Lovable AI موصى به للاستقرار'
      };
    }
    
    if (fallbackRate > 0.5) {
      return { 
        provider: 'openai', 
        reason: 'Frequent fallbacks detected, OpenAI recommended for reliability',
        reasonAr: 'تبديل متكرر للمزوّد، OpenAI موصى به للموثوقية'
      };
    }
    
    return { 
      provider: 'auto', 
      reason: 'Auto mode working well based on your usage',
      reasonAr: 'الوضع التلقائي يعمل جيداً بناءً على استخدامك'
    };
  };

  const recommendation = getProviderRecommendation();

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

        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* AI Provider Selection */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <Label className="font-semibold">
                {isArabic ? 'مزوّد الذكاء الاصطناعي' : 'AI Provider'}
              </Label>
            </div>
            
            <RadioGroup
              value={selectedProvider}
              onValueChange={(value) => setSelectedProvider(value as AIProvider)}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="text-sm cursor-pointer">
                  {isArabic ? 'تلقائي' : 'Auto'}
                </Label>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="lovable" id="lovable" />
                <Label htmlFor="lovable" className="text-sm cursor-pointer">
                  Lovable AI
                </Label>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="openai" id="openai" />
                <Label htmlFor="openai" className="text-sm cursor-pointer">
                  OpenAI
                </Label>
              </div>
            </RadioGroup>

            {/* Provider Recommendation */}
            <div className={`flex items-start gap-2 p-2 rounded-md text-xs ${
              recommendation.provider === selectedProvider 
                ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
            }`}>
              {recommendation.provider === selectedProvider ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <span className="font-medium">
                  {isArabic ? 'التوصية: ' : 'Recommendation: '}
                  {recommendation.provider === 'auto' 
                    ? (isArabic ? 'تلقائي' : 'Auto')
                    : recommendation.provider === 'lovable' 
                      ? 'Lovable AI' 
                      : 'OpenAI'}
                </span>
                <p className="mt-0.5 opacity-80">
                  {isArabic ? recommendation.reasonAr : recommendation.reason}
                </p>
              </div>
            </div>

            {/* Usage Stats Summary */}
            {stats.totalAnalyses > 0 && (
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="p-2 rounded bg-background">
                  <div className="font-semibold text-green-600">{stats.successCount}</div>
                  <div className="text-muted-foreground">{isArabic ? 'ناجح' : 'Success'}</div>
                </div>
                <div className="p-2 rounded bg-background">
                  <div className="font-semibold text-yellow-600">{stats.fallbackCount}</div>
                  <div className="text-muted-foreground">{isArabic ? 'تبديل' : 'Fallback'}</div>
                </div>
                <div className="p-2 rounded bg-background">
                  <div className="font-semibold text-red-600">{stats.errorCount}</div>
                  <div className="text-muted-foreground">{isArabic ? 'خطأ' : 'Error'}</div>
                </div>
              </div>
            )}
          </div>

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

          {/* Auto-chunk large files */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <SplitSquareVertical className="h-4 w-4" />
                  {isArabic ? 'تقسيم تلقائي للملفات الكبيرة' : 'Auto-chunk Large Files'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isArabic 
                    ? 'تقسيم الملفات الكبيرة تلقائياً إلى دفعات صغيرة' 
                    : 'Automatically split large files into smaller batches'}
                </p>
              </div>
              <Switch
                checked={settings.autoChunkLargeFiles}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, autoChunkLargeFiles: checked }))}
              />
            </div>

            {settings.autoChunkLargeFiles && (
              <div className="space-y-4 pl-6 border-l-2 border-muted">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{isArabic ? 'حد التقسيم (KB)' : 'Chunk Threshold (KB)'}</Label>
                    <span className="text-sm font-medium">{settings.autoChunkThreshold} KB</span>
                  </div>
                  <Slider
                    value={[settings.autoChunkThreshold]}
                    onValueChange={([value]) => setSettings(s => ({ ...s, autoChunkThreshold: value }))}
                    min={100}
                    max={1000}
                    step={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isArabic 
                      ? `الملفات أكبر من ${settings.autoChunkThreshold} KB ستُقسم تلقائياً`
                      : `Files larger than ${settings.autoChunkThreshold} KB will be auto-chunked`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Background Job Queue */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  {isArabic ? 'المعالجة في الخلفية' : 'Background Processing'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isArabic 
                    ? 'معالجة الملفات الكبيرة تلقائياً في الخلفية' 
                    : 'Automatically process large files in background'}
                </p>
              </div>
              <Switch
                checked={settings.useJobQueue}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, useJobQueue: checked }))}
              />
            </div>

            {settings.useJobQueue && (
              <div className="space-y-4 pl-6 border-l-2 border-muted">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{isArabic ? 'حد المعالجة الخلفية (KB)' : 'Background Threshold (KB)'}</Label>
                    <span className="text-sm font-medium">{settings.autoJobQueueThreshold} KB</span>
                  </div>
                  <Slider
                    value={[settings.autoJobQueueThreshold]}
                    onValueChange={([value]) => setSettings(s => ({ ...s, autoJobQueueThreshold: value }))}
                    min={100}
                    max={500}
                    step={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isArabic 
                      ? `الملفات أكبر من ${settings.autoJobQueueThreshold} KB ستُعالج في الخلفية`
                      : `Files larger than ${settings.autoJobQueueThreshold} KB will be processed in background`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Show Estimated Time */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {isArabic ? 'عرض الوقت المتوقع' : 'Show Estimated Time'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isArabic 
                  ? 'عرض تقدير للوقت المتوقع لإكمال التحليل' 
                  : 'Display estimated time for analysis completion'}
              </p>
            </div>
            <Switch
              checked={settings.showEstimatedTime}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, showEstimatedTime: checked }))}
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
