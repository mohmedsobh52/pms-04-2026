import { forwardRef, useState, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Target, Plus, Lightbulb, Frown, Smile, Meh } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface PricingSettings {
  contractValue: number;
  profitMargin: number;
  contingency: number;
}

interface CostTotals {
  totalStaffCosts: number;
  totalFacilitiesCosts: number;
  totalInsuranceCosts: number;
  totalGuaranteesCosts: number;
  totalIndirectCosts: number;
  totalSubcontractorsCosts: number;
}

interface PricingScenariosProps {
  pricingSettings: PricingSettings;
  totals: CostTotals;
  currency?: string;
}

interface Scenario {
  id: string;
  name: string;
  nameEn: string;
  profitMargin: number;
  contingency: number;
  costMultiplier: number;
  color: string;
  icon: 'pessimistic' | 'realistic' | 'optimistic' | 'custom';
}

const PricingScenarios = forwardRef<HTMLDivElement, PricingScenariosProps>(
  ({ pricingSettings, totals, currency = "SAR" }, ref) => {
    const { isArabic: isRTL } = useLanguage();
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customScenario, setCustomScenario] = useState<Partial<Scenario>>({
    name: "",
    nameEn: "",
    profitMargin: 10,
    contingency: 5,
    costMultiplier: 1.0
  });

  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: 'pessimistic',
      name: 'متشائم',
      nameEn: 'Pessimistic',
      profitMargin: 5,
      contingency: 8,
      costMultiplier: 1.15,
      color: '#ef4444',
      icon: 'pessimistic'
    },
    {
      id: 'realistic',
      name: 'واقعي',
      nameEn: 'Realistic',
      profitMargin: pricingSettings.profitMargin || 10,
      contingency: pricingSettings.contingency || 5,
      costMultiplier: 1.0,
      color: '#3b82f6',
      icon: 'realistic'
    },
    {
      id: 'optimistic',
      name: 'متفائل',
      nameEn: 'Optimistic',
      profitMargin: 15,
      contingency: 3,
      costMultiplier: 0.90,
      color: '#22c55e',
      icon: 'optimistic'
    }
  ]);

  const baseCosts = useMemo(() => {
    return totals.totalStaffCosts + 
           totals.totalFacilitiesCosts + 
           totals.totalInsuranceCosts + 
           totals.totalGuaranteesCosts + 
           totals.totalIndirectCosts +
           totals.totalSubcontractorsCosts;
  }, [totals]);

  // Pre-calculate realistic scenario total to avoid recursion
  const realisticScenarioData = useMemo(() => {
    const realistic = scenarios.find(s => s.id === 'realistic');
    if (!realistic) return 0;
    const adjustedCosts = baseCosts * realistic.costMultiplier;
    const profit = adjustedCosts * (realistic.profitMargin / 100);
    const contingencyAmount = adjustedCosts * (realistic.contingency / 100);
    return adjustedCosts + profit + contingencyAmount;
  }, [scenarios, baseCosts]);

  const calculateScenarioValues = (scenario: Scenario) => {
    const adjustedCosts = baseCosts * scenario.costMultiplier;
    const profit = adjustedCosts * (scenario.profitMargin / 100);
    const contingencyAmount = adjustedCosts * (scenario.contingency / 100);
    const total = adjustedCosts + profit + contingencyAmount;
    const difference = scenario.id === 'realistic' ? 0 : total - realisticScenarioData;

    return {
      costs: adjustedCosts,
      profit,
      contingencyAmount,
      total,
      difference
    };
  };

  const scenarioData = useMemo(() => {
    // Recalculate with updated realistic values
    const updatedScenarios = scenarios.map(s => {
      if (s.id === 'realistic') {
        return {
          ...s,
          profitMargin: pricingSettings.profitMargin || 10,
          contingency: pricingSettings.contingency || 5
        };
      }
      return s;
    });

    return updatedScenarios.map(scenario => {
      const values = calculateScenarioValues(scenario);
      return {
        ...scenario,
        ...values
      };
    });
  }, [scenarios, baseCosts, pricingSettings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartData = scenarioData.map(s => ({
    name: isRTL ? s.name : s.nameEn,
    total: s.total,
    color: s.color
  }));

  const getScenarioIcon = (icon: string) => {
    switch (icon) {
      case 'pessimistic': return <Frown className="h-5 w-5" />;
      case 'optimistic': return <Smile className="h-5 w-5" />;
      case 'realistic': return <Target className="h-5 w-5" />;
      default: return <Meh className="h-5 w-5" />;
    }
  };

  const handleAddCustomScenario = () => {
    if (customScenario.name && customScenario.nameEn) {
      const newScenario: Scenario = {
        id: `custom-${Date.now()}`,
        name: customScenario.name!,
        nameEn: customScenario.nameEn!,
        profitMargin: customScenario.profitMargin || 10,
        contingency: customScenario.contingency || 5,
        costMultiplier: customScenario.costMultiplier || 1.0,
        color: '#8b5cf6',
        icon: 'custom'
      };
      setScenarios([...scenarios, newScenario]);
      setShowCustomDialog(false);
      setCustomScenario({
        name: "",
        nameEn: "",
        profitMargin: 10,
        contingency: 5,
        costMultiplier: 1.0
      });
    }
  };

  const recommendedScenario = scenarioData.find(s => s.id === 'realistic');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {isRTL ? "مقارنة سيناريوهات التسعير" : "Pricing Scenarios Comparison"}
          </CardTitle>
          <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {isRTL ? "سيناريو جديد" : "New Scenario"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isRTL ? "إضافة سيناريو مخصص" : "Add Custom Scenario"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                    <Input
                      value={customScenario.name}
                      onChange={(e) => setCustomScenario({ ...customScenario, name: e.target.value })}
                      placeholder={isRTL ? "مثال: محافظ" : "e.g., Conservative"}
                    />
                  </div>
                  <div>
                    <Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                    <Input
                      value={customScenario.nameEn}
                      onChange={(e) => setCustomScenario({ ...customScenario, nameEn: e.target.value })}
                      placeholder="e.g., Conservative"
                    />
                  </div>
                </div>
                <div>
                  <Label>{isRTL ? "نسبة الربح" : "Profit Margin"}: {customScenario.profitMargin}%</Label>
                  <Slider
                    value={[customScenario.profitMargin || 10]}
                    onValueChange={(v) => setCustomScenario({ ...customScenario, profitMargin: v[0] })}
                    min={0}
                    max={30}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>{isRTL ? "نسبة الطوارئ" : "Contingency"}: {customScenario.contingency}%</Label>
                  <Slider
                    value={[customScenario.contingency || 5]}
                    onValueChange={(v) => setCustomScenario({ ...customScenario, contingency: v[0] })}
                    min={0}
                    max={15}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>{isRTL ? "معامل التكاليف" : "Cost Multiplier"}: {((customScenario.costMultiplier || 1) * 100 - 100).toFixed(0)}%</Label>
                  <Slider
                    value={[(customScenario.costMultiplier || 1) * 100]}
                    onValueChange={(v) => setCustomScenario({ ...customScenario, costMultiplier: v[0] / 100 })}
                    min={80}
                    max={130}
                    step={5}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRTL ? "أقل من 100% = تخفيض، أكثر من 100% = زيادة" : "Less than 100% = reduction, more than 100% = increase"}
                  </p>
                </div>
                <Button onClick={handleAddCustomScenario} className="w-full">
                  {isRTL ? "إضافة السيناريو" : "Add Scenario"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-start p-3 font-medium"></th>
                {scenarioData.map((scenario) => (
                  <th key={scenario.id} className="text-center p-3 font-medium" style={{ color: scenario.color }}>
                    <div className="flex flex-col items-center gap-1">
                      {getScenarioIcon(scenario.icon)}
                      <span>{isRTL ? scenario.name : scenario.nameEn}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3 font-medium">{isRTL ? "التكاليف" : "Costs"}</td>
                {scenarioData.map((scenario) => (
                  <td key={scenario.id} className="text-center p-3">
                    {formatCurrency(scenario.costs)}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">{isRTL ? "نسبة الربح" : "Profit %"}</td>
                {scenarioData.map((scenario) => (
                  <td key={scenario.id} className="text-center p-3">
                    {scenario.profitMargin}%
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">{isRTL ? "الربح المتوقع" : "Expected Profit"}</td>
                {scenarioData.map((scenario) => (
                  <td key={scenario.id} className="text-center p-3 text-green-600">
                    {formatCurrency(scenario.profit)}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">{isRTL ? "نسبة الطوارئ" : "Contingency %"}</td>
                {scenarioData.map((scenario) => (
                  <td key={scenario.id} className="text-center p-3">
                    {scenario.contingency}%
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium">{isRTL ? "الطوارئ" : "Contingency"}</td>
                {scenarioData.map((scenario) => (
                  <td key={scenario.id} className="text-center p-3">
                    {formatCurrency(scenario.contingencyAmount)}
                  </td>
                ))}
              </tr>
              <tr className="border-b bg-muted/50">
                <td className="p-3 font-bold">{isRTL ? "الإجمالي" : "Total"}</td>
                {scenarioData.map((scenario) => (
                  <td key={scenario.id} className="text-center p-3 font-bold" style={{ color: scenario.color }}>
                    {formatCurrency(scenario.total)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-medium">{isRTL ? "الفرق" : "Difference"}</td>
                {scenarioData.map((scenario) => (
                  <td key={scenario.id} className="text-center p-3">
                    {scenario.id === 'realistic' ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <span className={scenario.difference > 0 ? 'text-red-500' : 'text-green-500'}>
                        {scenario.difference > 0 ? '+' : ''}{formatCurrency(scenario.difference)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip 
                formatter={(value: number) => [`${formatCurrency(value)} ${currency}`, isRTL ? 'الإجمالي' : 'Total']}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendation */}
        {recommendedScenario && (
          <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-primary">
                {isRTL ? "التوصية" : "Recommendation"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL 
                  ? `السيناريو الواقعي هو الأنسب للتقديم بإجمالي ${formatCurrency(recommendedScenario.total)} ${currency} مع هامش ربح ${recommendedScenario.profitMargin}% ونسبة طوارئ ${recommendedScenario.contingency}%`
                  : `The realistic scenario is recommended with a total of ${currency} ${formatCurrency(recommendedScenario.total)}, ${recommendedScenario.profitMargin}% profit margin, and ${recommendedScenario.contingency}% contingency`
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

PricingScenarios.displayName = "PricingScenarios";

export default PricingScenarios;
