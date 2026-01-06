import { useState, useEffect } from "react";
import { Settings2, Save, RotateCcw, Building2, Home, Factory, Landmark, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AnalyzerWeight {
  id: string;
  name: string;
  nameAr: string;
  weight: number;
}

interface ProjectTypePreset {
  id: string;
  name: string;
  nameAr: string;
  icon: any;
  weights: Record<string, number>;
}

const DEFAULT_ANALYZERS: AnalyzerWeight[] = [
  { id: "construction_expert", name: "Construction Expert", nameAr: "خبير البناء", weight: 35 },
  { id: "market_analyst", name: "Market Analyst", nameAr: "محلل السوق", weight: 30 },
  { id: "quantity_surveyor", name: "Quantity Surveyor", nameAr: "مهندس كميات", weight: 25 },
  { id: "risk_assessor", name: "Risk Assessor", nameAr: "مقيّم المخاطر", weight: 10 },
];

const PROJECT_PRESETS: ProjectTypePreset[] = [
  {
    id: "residential",
    name: "Residential",
    nameAr: "سكني",
    icon: Home,
    weights: { construction_expert: 40, market_analyst: 25, quantity_surveyor: 25, risk_assessor: 10 },
  },
  {
    id: "commercial",
    name: "Commercial",
    nameAr: "تجاري",
    icon: Building2,
    weights: { construction_expert: 30, market_analyst: 35, quantity_surveyor: 25, risk_assessor: 10 },
  },
  {
    id: "industrial",
    name: "Industrial",
    nameAr: "صناعي",
    icon: Factory,
    weights: { construction_expert: 35, market_analyst: 20, quantity_surveyor: 30, risk_assessor: 15 },
  },
  {
    id: "government",
    name: "Government",
    nameAr: "حكومي",
    icon: Landmark,
    weights: { construction_expert: 30, market_analyst: 30, quantity_surveyor: 30, risk_assessor: 10 },
  },
  {
    id: "infrastructure",
    name: "Infrastructure",
    nameAr: "بنية تحتية",
    icon: Construction,
    weights: { construction_expert: 35, market_analyst: 20, quantity_surveyor: 25, risk_assessor: 20 },
  },
];

interface AnalyzerWeightsDialogProps {
  onWeightsChange?: (weights: Record<string, number>) => void;
}

export function AnalyzerWeightsDialog({ onWeightsChange }: AnalyzerWeightsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [analyzers, setAnalyzers] = useState<AnalyzerWeight[]>(DEFAULT_ANALYZERS);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const { toast } = useToast();

  // Load saved weights from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("analyzer_weights");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnalyzers(analyzers.map(a => ({
          ...a,
          weight: parsed[a.id] ?? a.weight
        })));
      } catch (e) {
        console.error("Failed to load analyzer weights:", e);
      }
    }
  }, []);

  const totalWeight = analyzers.reduce((sum, a) => sum + a.weight, 0);

  const handleWeightChange = (id: string, value: number[]) => {
    setAnalyzers(prev => prev.map(a => 
      a.id === id ? { ...a, weight: value[0] } : a
    ));
    setSelectedPreset("");
  };

  const handlePresetChange = (presetId: string) => {
    const preset = PROJECT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setAnalyzers(prev => prev.map(a => ({
        ...a,
        weight: preset.weights[a.id] ?? a.weight
      })));
      setSelectedPreset(presetId);
    }
  };

  const handleNormalize = () => {
    if (totalWeight === 0) return;
    const factor = 100 / totalWeight;
    setAnalyzers(prev => prev.map(a => ({
      ...a,
      weight: Math.round(a.weight * factor)
    })));
  };

  const handleReset = () => {
    setAnalyzers(DEFAULT_ANALYZERS);
    setSelectedPreset("");
  };

  const handleSave = () => {
    const weights: Record<string, number> = {};
    analyzers.forEach(a => {
      weights[a.id] = a.weight;
    });
    
    localStorage.setItem("analyzer_weights", JSON.stringify(weights));
    
    if (onWeightsChange) {
      // Normalize for API (0-1 scale)
      const normalizedWeights: Record<string, number> = {};
      const total = analyzers.reduce((sum, a) => sum + a.weight, 0);
      analyzers.forEach(a => {
        normalizedWeights[a.id] = total > 0 ? a.weight / total : 0.25;
      });
      onWeightsChange(normalizedWeights);
    }

    toast({
      title: "✅ تم الحفظ",
      description: "تم حفظ أوزان المحللين بنجاح",
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          <span className="hidden md:inline">أوزان المحللين</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            تخصيص أوزان المحللين
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Type Presets */}
          <div className="space-y-2">
            <Label>نوع المشروع (إعدادات مسبقة)</Label>
            <div className="grid grid-cols-5 gap-2">
              {PROJECT_PRESETS.map(preset => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === preset.id;
                return (
                  <Button
                    key={preset.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex-col h-auto py-2 gap-1",
                      isSelected && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => handlePresetChange(preset.id)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{preset.nameAr}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Weight Sliders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>أوزان المحللين</Label>
              <span className={cn(
                "text-sm font-medium",
                totalWeight === 100 ? "text-green-600" : "text-yellow-600"
              )}>
                المجموع: {totalWeight}%
              </span>
            </div>

            {analyzers.map(analyzer => (
              <div key={analyzer.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{analyzer.nameAr}</span>
                  <span className="text-sm text-muted-foreground w-12 text-left">
                    {analyzer.weight}%
                  </span>
                </div>
                <Slider
                  value={[analyzer.weight]}
                  onValueChange={(value) => handleWeightChange(analyzer.id, value)}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Total Warning */}
          {totalWeight !== 100 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ مجموع الأوزان ليس 100%. سيتم تطبيع الأوزان تلقائياً عند التحليل.
              </p>
              <Button 
                variant="link" 
                size="sm" 
                onClick={handleNormalize}
                className="text-yellow-700 dark:text-yellow-300 p-0 h-auto mt-1"
              >
                انقر لتطبيع الأوزان إلى 100%
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              إعادة تعيين
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              حفظ الإعدادات
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
