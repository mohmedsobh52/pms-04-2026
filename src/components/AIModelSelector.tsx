import { useState } from "react";
import { Brain, Zap, Cpu, Sparkles, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/useLanguage";
import { useAnalysisTracking, AIModel } from "@/hooks/useAnalysisTracking";

const MODEL_INFO: Record<AIModel, {
  icon: typeof Brain;
  color: string;
  speed: 'fast' | 'medium' | 'slow';
  accuracy: 'high' | 'very-high' | 'excellent';
  cost: 'low' | 'medium' | 'high';
  description: { en: string; ar: string };
  features: { en: string[]; ar: string[] };
}> = {
  'google/gemini-2.5-flash': {
    icon: Zap,
    color: 'text-yellow-500',
    speed: 'fast',
    accuracy: 'high',
    cost: 'low',
    description: {
      en: 'Fastest model - great for quick analyses',
      ar: 'أسرع نموذج - مثالي للتحليلات السريعة'
    },
    features: {
      en: ['Fast processing', 'Cost effective', 'Good accuracy'],
      ar: ['معالجة سريعة', 'تكلفة منخفضة', 'دقة جيدة']
    }
  },
  'google/gemini-2.5-pro': {
    icon: Sparkles,
    color: 'text-purple-500',
    speed: 'medium',
    accuracy: 'very-high',
    cost: 'medium',
    description: {
      en: 'Balanced model - best for detailed BOQ analysis',
      ar: 'نموذج متوازن - الأفضل لتحليل BOQ التفصيلي'
    },
    features: {
      en: ['Higher accuracy', 'Better reasoning', 'Construction expertise'],
      ar: ['دقة أعلى', 'تفكير أفضل', 'خبرة البناء']
    }
  },
  'openai/gpt-5': {
    icon: Brain,
    color: 'text-green-500',
    speed: 'slow',
    accuracy: 'excellent',
    cost: 'high',
    description: {
      en: 'Most powerful - for complex cost estimation',
      ar: 'الأقوى - لتقدير التكاليف المعقدة'
    },
    features: {
      en: ['Excellent accuracy', 'Deep analysis', 'Market insights'],
      ar: ['دقة ممتازة', 'تحليل عميق', 'رؤى السوق']
    }
  },
  'openai/gpt-5-mini': {
    icon: Cpu,
    color: 'text-blue-500',
    speed: 'fast',
    accuracy: 'high',
    cost: 'low',
    description: {
      en: 'Efficient GPT - good balance of speed and quality',
      ar: 'جي بي تي فعال - توازن جيد بين السرعة والجودة'
    },
    features: {
      en: ['Good performance', 'Quick results', 'Reliable'],
      ar: ['أداء جيد', 'نتائج سريعة', 'موثوق']
    }
  }
};

const SPEED_LABELS = {
  fast: { en: 'Fast', ar: 'سريع', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  medium: { en: 'Medium', ar: 'متوسط', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  slow: { en: 'Slow', ar: 'بطيء', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
};

const ACCURACY_LABELS = {
  high: { en: 'High', ar: 'عالية', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  'very-high': { en: 'Very High', ar: 'عالية جداً', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  excellent: { en: 'Excellent', ar: 'ممتازة', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
};

export function AIModelSelector() {
  const { isArabic } = useLanguage();
  const { selectedModel, setSelectedModel, getModelDisplayName, getModelDisplayNameAr } = useAnalysisTracking();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          {isArabic ? "اختيار نموذج الذكاء الاصطناعي" : "AI Model Selection"}
        </CardTitle>
        <CardDescription>
          {isArabic 
            ? "اختر نموذج AI المناسب للتحليلات المتقدمة"
            : "Choose the AI model for advanced analyses"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedModel}
          onValueChange={(value) => setSelectedModel(value as AIModel)}
          className="grid gap-4"
        >
          {(Object.keys(MODEL_INFO) as AIModel[]).map((model) => {
            const info = MODEL_INFO[model];
            const Icon = info.icon;
            const speedLabel = SPEED_LABELS[info.speed];
            const accuracyLabel = ACCURACY_LABELS[info.accuracy];
            
            return (
              <div key={model} className="relative">
                <RadioGroupItem
                  value={model}
                  id={model}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={model}
                  className="flex items-start gap-4 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                >
                  <div className={`mt-1 ${info.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {isArabic ? getModelDisplayNameAr(model) : getModelDisplayName(model)}
                      </span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={speedLabel.color}>
                          {isArabic ? speedLabel.ar : speedLabel.en}
                        </Badge>
                        <Badge variant="outline" className={accuracyLabel.color}>
                          {isArabic ? accuracyLabel.ar : accuracyLabel.en}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? info.description.ar : info.description.en}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(isArabic ? info.features.ar : info.features.en).map((feature, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {isArabic 
              ? "سيتم استخدام النموذج المختار في جميع التحليلات المستقبلية. النماذج الأقوى تعطي نتائج أدق لكنها أبطأ."
              : "The selected model will be used for all future analyses. More powerful models give more accurate results but are slower."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
