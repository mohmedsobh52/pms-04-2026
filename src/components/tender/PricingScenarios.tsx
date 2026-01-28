import React, { useMemo, useState, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/useLanguage";
import { TrendingUp, TrendingDown, Target, Plus, Trash2, BarChart3, Sliders, Sparkles, Check } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";

interface PricingSettings {
  contractValue: number;
  profitMargin: number;
  contingency: number;
  projectDuration?: number;
  currency?: string;
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
  directCosts?: number;
  currency?: string;
  onPricingChange?: (profit: number, contingency: number) => void;
}

interface Scenario {
  id: string;
  name: string;
  nameAr: string;
  profitMargin: number;
  contingency: number;
  color: string;
  icon: React.ReactNode;
  isCustom?: boolean;
}

const PricingScenarios = forwardRef<HTMLDivElement, PricingScenariosProps>(
  ({ pricingSettings, totals, directCosts = 0, currency = "SAR", onPricingChange }, ref) => {
    const { language } = useLanguage();
    const isArabic = language === "ar";
    
    const [customScenario, setCustomScenario] = useState({
      name: "",
      nameAr: "",
      profitMargin: 10,
      contingency: 5,
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [customScenarios, setCustomScenarios] = useState<Scenario[]>([]);
    
    // Interactive simulation state
    const [simulatedProfit, setSimulatedProfit] = useState(pricingSettings.profitMargin);
    const [simulatedContingency, setSimulatedContingency] = useState(pricingSettings.contingency);

    // Calculate base costs including direct costs
    const baseCosts = useMemo(() => {
      return directCosts + 
             totals.totalStaffCosts + 
             totals.totalFacilitiesCosts + 
             totals.totalInsuranceCosts + 
             totals.totalGuaranteesCosts + 
             totals.totalIndirectCosts +
             totals.totalSubcontractorsCosts;
    }, [totals, directCosts]);

    const defaultScenarios: Scenario[] = [
      {
        id: "optimistic",
        name: "Optimistic",
        nameAr: "متفائل",
        profitMargin: pricingSettings.profitMargin * 1.5,
        contingency: pricingSettings.contingency * 0.5,
        color: "hsl(var(--chart-2))",
        icon: <TrendingUp className="w-4 h-4" />,
      },
      {
        id: "realistic",
        name: "Realistic",
        nameAr: "واقعي",
        profitMargin: pricingSettings.profitMargin,
        contingency: pricingSettings.contingency,
        color: "hsl(var(--chart-1))",
        icon: <Target className="w-4 h-4" />,
      },
      {
        id: "pessimistic",
        name: "Pessimistic",
        nameAr: "متشائم",
        profitMargin: pricingSettings.profitMargin * 0.5,
        contingency: pricingSettings.contingency * 2,
        color: "hsl(var(--chart-5))",
        icon: <TrendingDown className="w-4 h-4" />,
      },
    ];

    const allScenarios = [...defaultScenarios, ...customScenarios];

    const scenarioData = useMemo(() => {
      return allScenarios.map((scenario) => {
        const profit = baseCosts * (scenario.profitMargin / 100);
        const contingency = baseCosts * (scenario.contingency / 100);
        const total = baseCosts + profit + contingency;
        const difference = total - pricingSettings.contractValue;
        const differencePercent = pricingSettings.contractValue > 0 
          ? ((difference / pricingSettings.contractValue) * 100).toFixed(1)
          : "0";

        return {
          id: scenario.id,
          name: isArabic ? scenario.nameAr : scenario.name,
          profitMargin: scenario.profitMargin,
          contingency: scenario.contingency,
          baseCosts,
          directCosts,
          indirectCosts: baseCosts - directCosts,
          profit,
          contingencyAmount: contingency,
          total,
          difference,
          differencePercent,
          color: scenario.color,
          icon: scenario.icon,
          isCustom: scenario.isCustom,
        };
      });
    }, [allScenarios, baseCosts, directCosts, pricingSettings.contractValue, isArabic]);

    // Interactive simulation calculations
    const simulatedTotal = useMemo(() => {
      const profit = baseCosts * (simulatedProfit / 100);
      const contingency = baseCosts * (simulatedContingency / 100);
      return baseCosts + profit + contingency;
    }, [baseCosts, simulatedProfit, simulatedContingency]);

    const formatCurrency = (value: number) => {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toFixed(2);
    };

    const formatFullCurrency = (value: number) => {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    };

    const handleAddCustomScenario = () => {
      if (customScenario.name || customScenario.nameAr) {
        const newScenario: Scenario = {
          id: `custom-${Date.now()}`,
          name: customScenario.name || `Custom ${customScenarios.length + 1}`,
          nameAr: customScenario.nameAr || `مخصص ${customScenarios.length + 1}`,
          profitMargin: customScenario.profitMargin,
          contingency: customScenario.contingency,
          color: "hsl(var(--chart-4))",
          icon: <Target className="w-4 h-4" />,
          isCustom: true,
        };
        setCustomScenarios([...customScenarios, newScenario]);
        setCustomScenario({ name: "", nameAr: "", profitMargin: 10, contingency: 5 });
        setIsDialogOpen(false);
      }
    };

    const handleRemoveCustomScenario = (id: string) => {
      setCustomScenarios(customScenarios.filter(s => s.id !== id));
    };

    const handleApplyScenario = (profit: number, contingency: number) => {
      if (onPricingChange) {
        onPricingChange(profit, contingency);
      }
    };

    const chartData = scenarioData.map(scenario => ({
      name: scenario.name,
      [isArabic ? "التكاليف المباشرة" : "Direct Costs"]: scenario.directCosts,
      [isArabic ? "التكاليف غير المباشرة" : "Indirect Costs"]: scenario.indirectCosts,
      [isArabic ? "الربح" : "Profit"]: scenario.profit,
      [isArabic ? "الاحتياطي" : "Contingency"]: scenario.contingencyAmount,
      total: scenario.total,
    }));

    return (
      <div ref={ref} className="space-y-6">
        {/* Interactive Simulation Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              {isArabic ? "محاكاة التسعير التفاعلية" : "Interactive Pricing Simulation"}
            </CardTitle>
            <CardDescription>
              {isArabic 
                ? "غيّر النسب وشاهد التأثير مباشرة على السعر النهائي" 
                : "Adjust percentages and see the impact on final price in real-time"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profit Margin Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">{isArabic ? "نسبة الربح" : "Profit Margin"}</Label>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {simulatedProfit.toFixed(1)}%
                  </Badge>
                </div>
                <Slider
                  value={[simulatedProfit]}
                  onValueChange={(v) => setSimulatedProfit(v[0])}
                  min={0}
                  max={30}
                  step={0.5}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span className="text-chart-2 font-medium">
                    = {currency} {formatCurrency(baseCosts * simulatedProfit / 100)}
                  </span>
                  <span>30%</span>
                </div>
              </div>

              {/* Contingency Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">{isArabic ? "نسبة الاحتياطي" : "Contingency"}</Label>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {simulatedContingency.toFixed(1)}%
                  </Badge>
                </div>
                <Slider
                  value={[simulatedContingency]}
                  onValueChange={(v) => setSimulatedContingency(v[0])}
                  min={0}
                  max={15}
                  step={0.5}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span className="text-chart-3 font-medium">
                    = {currency} {formatCurrency(baseCosts * simulatedContingency / 100)}
                  </span>
                  <span>15%</span>
                </div>
              </div>
            </div>

            {/* Live Result */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{isArabic ? "إجمالي التكاليف" : "Total Costs"}</p>
                  <p className="text-lg font-bold">{currency} {formatCurrency(baseCosts)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{isArabic ? "الربح" : "Profit"}</p>
                  <p className="text-lg font-bold text-chart-2">+{formatCurrency(baseCosts * simulatedProfit / 100)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{isArabic ? "الاحتياطي" : "Contingency"}</p>
                  <p className="text-lg font-bold text-chart-3">+{formatCurrency(baseCosts * simulatedContingency / 100)}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-2 -m-2">
                  <p className="text-xs text-muted-foreground mb-1">{isArabic ? "السعر النهائي" : "Final Price"}</p>
                  <p className="text-xl font-bold text-primary">
                    {currency} {formatCurrency(simulatedTotal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Apply Button */}
            {onPricingChange && (
              <Button 
                className="w-full gap-2"
                onClick={() => handleApplyScenario(simulatedProfit, simulatedContingency)}
              >
                <Check className="w-4 h-4" />
                {isArabic ? "تطبيق على إعدادات العطاء" : "Apply to Tender Settings"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Scenarios Comparison Card */}
        <Card className="tender-card-safe">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4 tender-card-header">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {isArabic ? "مقارنة سيناريوهات التسعير" : "Pricing Scenarios Comparison"}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? "قارن بين السيناريوهات المختلفة واختر الأنسب" 
                  : "Compare different scenarios and choose the best fit"}
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 relative z-[65] pointer-events-auto">
                  <Plus className="w-4 h-4" />
                  {isArabic ? "سيناريو مخصص" : "Custom Scenario"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {isArabic ? "إضافة سيناريو مخصص" : "Add Custom Scenario"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{isArabic ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                      <Input
                        value={customScenario.name}
                        onChange={(e) => setCustomScenario(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Conservative"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isArabic ? "الاسم (عربي)" : "Name (Arabic)"}</Label>
                      <Input
                        value={customScenario.nameAr}
                        onChange={(e) => setCustomScenario(prev => ({ ...prev, nameAr: e.target.value }))}
                        placeholder="مثال: محافظ"
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "نسبة الربح (%)" : "Profit Margin (%)"}</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[customScenario.profitMargin]}
                        onValueChange={(v) => setCustomScenario(prev => ({ ...prev, profitMargin: v[0] }))}
                        min={0}
                        max={30}
                        step={0.5}
                        className="flex-1"
                      />
                      <Badge variant="outline" className="w-16 justify-center">
                        {customScenario.profitMargin}%
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isArabic ? "نسبة الاحتياطي (%)" : "Contingency (%)"}</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[customScenario.contingency]}
                        onValueChange={(v) => setCustomScenario(prev => ({ ...prev, contingency: v[0] }))}
                        min={0}
                        max={15}
                        step={0.5}
                        className="flex-1"
                      />
                      <Badge variant="outline" className="w-16 justify-center">
                        {customScenario.contingency}%
                      </Badge>
                    </div>
                  </div>
                  {/* Preview */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      {isArabic ? "معاينة النتيجة:" : "Preview Result:"}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {currency} {formatFullCurrency(
                        baseCosts * (1 + customScenario.profitMargin/100 + customScenario.contingency/100)
                      )}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {isArabic ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button onClick={handleAddCustomScenario}>
                    {isArabic ? "إضافة" : "Add"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {/* Comparison Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-start p-3 font-medium text-muted-foreground">
                      {isArabic ? "التفاصيل" : "Details"}
                    </th>
                    {scenarioData.map((scenario) => (
                      <th key={scenario.id} className="text-center p-3 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <span style={{ color: scenario.color }}>{scenario.icon}</span>
                          <span>{scenario.name}</span>
                          {scenario.isCustom && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleRemoveCustomScenario(scenario.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Direct Costs Row */}
                  <tr className="border-b bg-chart-2/10">
                    <td className="p-3 font-medium">
                      {isArabic ? "التكاليف المباشرة (BOQ)" : "Direct Costs (BOQ)"}
                    </td>
                    {scenarioData.map((scenario) => (
                      <td key={scenario.id} className="text-center p-3 text-chart-2 font-medium">
                        {formatCurrency(scenario.directCosts)}
                      </td>
                    ))}
                  </tr>
                  {/* Indirect Costs Row */}
                  <tr className="border-b">
                    <td className="p-3 font-medium text-muted-foreground">
                      {isArabic ? "التكاليف غير المباشرة" : "Indirect Costs"}
                    </td>
                    {scenarioData.map((scenario) => (
                      <td key={scenario.id} className="text-center p-3">
                        {formatCurrency(scenario.indirectCosts)}
                      </td>
                    ))}
                  </tr>
                  {/* Total Costs Row */}
                  <tr className="border-b bg-muted/30">
                    <td className="p-3 font-medium">
                      {isArabic ? "إجمالي التكاليف" : "Total Costs"}
                    </td>
                    {scenarioData.map((scenario) => (
                      <td key={scenario.id} className="text-center p-3 font-bold">
                        {formatCurrency(scenario.baseCosts)}
                      </td>
                    ))}
                  </tr>
                  {/* Profit Row */}
                  <tr className="border-b">
                    <td className="p-3 font-medium text-muted-foreground">
                      {isArabic ? "الربح" : "Profit"}
                    </td>
                    {scenarioData.map((scenario) => (
                      <td key={scenario.id} className="text-center p-3">
                        <span className="text-chart-2">{scenario.profitMargin.toFixed(1)}%</span>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          ({formatCurrency(scenario.profit)})
                        </span>
                      </td>
                    ))}
                  </tr>
                  {/* Contingency Row */}
                  <tr className="border-b">
                    <td className="p-3 font-medium text-muted-foreground">
                      {isArabic ? "الاحتياطي" : "Contingency"}
                    </td>
                    {scenarioData.map((scenario) => (
                      <td key={scenario.id} className="text-center p-3">
                        <span className="text-chart-3">{scenario.contingency.toFixed(1)}%</span>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          ({formatCurrency(scenario.contingencyAmount)})
                        </span>
                      </td>
                    ))}
                  </tr>
                  {/* Total Row */}
                  <tr className="border-b bg-primary/5">
                    <td className="p-3 font-bold">{isArabic ? "الإجمالي" : "Total"}</td>
                    {scenarioData.map((scenario) => (
                      <td 
                        key={scenario.id} 
                        className="text-center p-3 font-bold text-lg"
                        style={{ color: scenario.color }}
                      >
                        {formatCurrency(scenario.total)}
                      </td>
                    ))}
                  </tr>
                  {/* Difference Row */}
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">
                      {isArabic ? "الفرق عن قيمة العقد" : "Difference from Contract"}
                    </td>
                    {scenarioData.map((scenario) => (
                      <td 
                        key={scenario.id} 
                        className={`text-center p-3 ${
                          scenario.difference > 0 
                            ? "text-destructive" 
                            : scenario.difference < 0 
                              ? "text-chart-2" 
                              : ""
                        }`}
                      >
                        {scenario.difference > 0 ? "+" : ""}{formatCurrency(scenario.difference)}
                        <br />
                        <span className="text-xs">
                          ({scenario.difference > 0 ? "+" : ""}{scenario.differencePercent}%)
                        </span>
                      </td>
                    ))}
                  </tr>
                  {/* Apply Button Row */}
                  {onPricingChange && (
                    <tr>
                      <td className="p-3"></td>
                      {scenarioData.map((scenario) => (
                        <td key={scenario.id} className="text-center p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleApplyScenario(scenario.profitMargin, scenario.contingency)}
                          >
                            <Sparkles className="w-3 h-3" />
                            {isArabic ? "تطبيق" : "Apply"}
                          </Button>
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bar Chart */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)} 
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${currency} ${formatFullCurrency(value)}`, ""]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey={isArabic ? "التكاليف المباشرة" : "Direct Costs"} 
                    stackId="a" 
                    fill="hsl(var(--chart-2))" 
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar 
                    dataKey={isArabic ? "التكاليف غير المباشرة" : "Indirect Costs"} 
                    stackId="a" 
                    fill="hsl(var(--chart-1))" 
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar 
                    dataKey={isArabic ? "الربح" : "Profit"} 
                    stackId="a" 
                    fill="hsl(var(--chart-3))" 
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar 
                    dataKey={isArabic ? "الاحتياطي" : "Contingency"} 
                    stackId="a" 
                    fill="hsl(var(--chart-4))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recommendation */}
            <div className="mt-6 p-4 bg-chart-2/10 rounded-lg border border-chart-2/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-chart-2/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-chart-2" />
                </div>
                <div>
                  <h4 className="font-medium text-chart-2">
                    {isArabic ? "التوصية" : "Recommendation"}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isArabic
                      ? `بناءً على السيناريو الواقعي، السعر المقترح هو ${currency} ${formatFullCurrency(scenarioData[1]?.total || 0)} مع هامش ربح ${pricingSettings.profitMargin}% واحتياطي ${pricingSettings.contingency}%.`
                      : `Based on the realistic scenario, the suggested price is ${currency} ${formatFullCurrency(scenarioData[1]?.total || 0)} with a ${pricingSettings.profitMargin}% profit margin and ${pricingSettings.contingency}% contingency.`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

PricingScenarios.displayName = "PricingScenarios";

export default PricingScenarios;
