import { useState, useEffect } from "react";
import { Calculator, TrendingUp, Users, Package, Wrench, Building2, AlertCircle, Sparkles, Loader2, Edit2, Save, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface CostBreakdownItem {
  item_description: string;
  materials: {
    items: Array<{ name: string; quantity: number; unit: string; unit_price: number; total: number }>;
    total: number;
  };
  labor: {
    items: Array<{ role: string; hours: number; hourly_rate: number; total: number }>;
    total: number;
  };
  equipment: {
    items: Array<{ name: string; duration: string; daily_rate: number; total: number }>;
    total: number;
  };
  subcontractor: number;
  overhead: number;
  admin: number;
  insurance: number;
  contingency: number;
  profit_margin: number;
  profit_amount: number;
  total_direct: number;
  total_indirect: number;
  total_cost: number;
  unit_price: number;
  recommendations: string[];
}

interface CostAnalysisResult {
  cost_analysis: CostBreakdownItem[];
  summary: {
    total_materials: number;
    total_labor: number;
    total_equipment: number;
    total_subcontractor: number;
    total_direct_costs: number;
    total_indirect_costs: number;
    total_profit: number;
    grand_total: number;
    key_insights: string[];
  };
  ai_provider: string;
}

interface CostAnalysisProps {
  items: BOQItem[];
  currency?: string;
}

export function CostAnalysis({ items, currency = "ر.س" }: CostAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CostAnalysisResult | null>(null);
  const [editedResult, setEditedResult] = useState<CostAnalysisResult | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [aiProvider, setAiProvider] = useState<'lovable' | 'openai' | 'genspark' | 'manus' | 'all'>('all');
  const { toast } = useToast();
  const { language } = useLanguage();

  // Initialize editedResult when analysisResult changes
  useEffect(() => {
    if (analysisResult) {
      setEditedResult(JSON.parse(JSON.stringify(analysisResult)));
    }
  }, [analysisResult]);

  const runCostAnalysis = async () => {
    if (!items || items.length === 0) {
      toast({
        title: "لا توجد بنود",
        description: "يرجى تحليل ملف BOQ أولاً",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-costs", {
        body: { 
          items: items.slice(0, 10),
          ai_provider: aiProvider,
          analysis_type: "detailed",
          language
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysisResult(data);
      toast({
        title: "تم التحليل بنجاح",
        description: `تم تحليل تكاليف ${data.cost_analysis?.length || 0} بند باستخدام ${data.ai_provider}`,
      });
    } catch (error) {
      console.error("Cost analysis error:", error);
      toast({
        title: "خطأ في التحليل",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحليل التكاليف",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatNumber = (num: number) => {
    return num?.toLocaleString('ar-SA') || '0';
  };

  const recalculateItemTotals = (item: CostBreakdownItem): CostBreakdownItem => {
    const materialsTotal = item.materials?.items?.reduce((sum, m) => sum + (m.total || 0), 0) || 0;
    const laborTotal = item.labor?.items?.reduce((sum, l) => sum + (l.total || 0), 0) || 0;
    const equipmentTotal = item.equipment?.items?.reduce((sum, e) => sum + (e.total || 0), 0) || 0;
    
    const totalDirect = materialsTotal + laborTotal + equipmentTotal + (item.subcontractor || 0);
    const totalIndirect = (item.overhead || 0) + (item.admin || 0) + (item.insurance || 0) + (item.contingency || 0);
    const profitAmount = (totalDirect + totalIndirect) * ((item.profit_margin || 10) / 100);
    const totalCost = totalDirect + totalIndirect + profitAmount;

    return {
      ...item,
      materials: { ...item.materials, total: materialsTotal },
      labor: { ...item.labor, total: laborTotal },
      equipment: { ...item.equipment, total: equipmentTotal },
      total_direct: totalDirect,
      total_indirect: totalIndirect,
      profit_amount: profitAmount,
      total_cost: totalCost,
      unit_price: totalCost,
    };
  };

  const recalculateSummary = (costAnalysis: CostBreakdownItem[]): CostAnalysisResult['summary'] => {
    const totalMaterials = costAnalysis.reduce((sum, item) => sum + (item.materials?.total || 0), 0);
    const totalLabor = costAnalysis.reduce((sum, item) => sum + (item.labor?.total || 0), 0);
    const totalEquipment = costAnalysis.reduce((sum, item) => sum + (item.equipment?.total || 0), 0);
    const totalSubcontractor = costAnalysis.reduce((sum, item) => sum + (item.subcontractor || 0), 0);
    const totalDirect = costAnalysis.reduce((sum, item) => sum + (item.total_direct || 0), 0);
    const totalIndirect = costAnalysis.reduce((sum, item) => sum + (item.total_indirect || 0), 0);
    const totalProfit = costAnalysis.reduce((sum, item) => sum + (item.profit_amount || 0), 0);
    const grandTotal = costAnalysis.reduce((sum, item) => sum + (item.total_cost || 0), 0);

    return {
      total_materials: totalMaterials,
      total_labor: totalLabor,
      total_equipment: totalEquipment,
      total_subcontractor: totalSubcontractor,
      total_direct_costs: totalDirect,
      total_indirect_costs: totalIndirect,
      total_profit: totalProfit,
      grand_total: grandTotal,
      key_insights: editedResult?.summary?.key_insights || [],
    };
  };

  const handleEditItem = (idx: number) => {
    setEditingItem(idx);
    setSelectedItem(idx);
  };

  const handleSaveItem = (idx: number) => {
    if (!editedResult) return;
    
    const updatedCostAnalysis = [...editedResult.cost_analysis];
    updatedCostAnalysis[idx] = recalculateItemTotals(updatedCostAnalysis[idx]);
    
    const updatedSummary = recalculateSummary(updatedCostAnalysis);
    
    setEditedResult({
      ...editedResult,
      cost_analysis: updatedCostAnalysis,
      summary: updatedSummary,
    });
    
    setEditingItem(null);
    toast({
      title: "Saved",
      description: "Cost breakdown updated successfully",
    });
  };

  const handleCancelEdit = () => {
    if (analysisResult) {
      setEditedResult(JSON.parse(JSON.stringify(analysisResult)));
    }
    setEditingItem(null);
  };

  const updateMaterialItem = (itemIdx: number, matIdx: number, field: string, value: number) => {
    if (!editedResult) return;
    
    const updatedResult = { ...editedResult };
    const material = updatedResult.cost_analysis[itemIdx].materials.items[matIdx];
    
    if (field === 'quantity') {
      material.quantity = value;
      material.total = value * material.unit_price;
    } else if (field === 'unit_price') {
      material.unit_price = value;
      material.total = material.quantity * value;
    }
    
    setEditedResult(updatedResult);
  };

  const updateLaborItem = (itemIdx: number, labIdx: number, field: string, value: number) => {
    if (!editedResult) return;
    
    const updatedResult = { ...editedResult };
    const labor = updatedResult.cost_analysis[itemIdx].labor.items[labIdx];
    
    if (field === 'hours') {
      labor.hours = value;
      labor.total = value * labor.hourly_rate;
    } else if (field === 'hourly_rate') {
      labor.hourly_rate = value;
      labor.total = labor.hours * value;
    }
    
    setEditedResult(updatedResult);
  };

  const updateIndirectCost = (itemIdx: number, field: string, value: number) => {
    if (!editedResult) return;
    
    const updatedResult = { ...editedResult };
    (updatedResult.cost_analysis[itemIdx] as any)[field] = value;
    
    setEditedResult(updatedResult);
  };

  const finalizeAnalysis = () => {
    if (!editedResult) return;
    
    setAnalysisResult(JSON.parse(JSON.stringify(editedResult)));
    toast({
      title: "Finalized",
      description: "Cost analysis has been finalized with your adjustments",
    });
  };

  const displayResult = editedResult || analysisResult;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-display text-lg font-semibold">Detailed Cost Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Direct and indirect cost analysis for each item
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'lovable', 'openai', 'genspark', 'manus'] as const).map((provider) => (
              <Button
                key={provider}
                variant={aiProvider === provider ? "default" : "outline"}
                size="sm"
                onClick={() => setAiProvider(provider)}
                className="text-xs"
              >
                {provider === 'all' ? 'Auto' : 
                 provider === 'lovable' ? 'Gemini' : 
                 provider === 'openai' ? 'GPT' :
                 provider === 'genspark' ? 'Genspark' :
                 'Manus'}
              </Button>
            ))}
          </div>
          <Button
            onClick={runCostAnalysis}
            disabled={isAnalyzing || !items?.length}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Costs
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Analysis Results */}
      {displayResult && (
        <div className="space-y-6 animate-slide-up">
          {/* Finalize Button */}
          <div className="flex justify-end">
            <Button onClick={finalizeAnalysis} variant="default" className="gap-2">
              <Check className="w-4 h-4" />
              Finalize Analysis
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Materials</span>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  {formatNumber(displayResult.summary?.total_materials || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{currency}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Labor</span>
                </div>
                <p className="text-xl font-bold text-green-600">
                  {formatNumber(displayResult.summary?.total_labor || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{currency}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Equipment</span>
                </div>
                <p className="text-xl font-bold text-orange-600">
                  {formatNumber(displayResult.summary?.total_equipment || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{currency}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Grand Total</span>
                </div>
                <p className="text-xl font-bold text-purple-600">
                  {formatNumber(displayResult.summary?.grand_total || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{currency}</p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Cost Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Materials", value: displayResult.summary?.total_materials || 0, color: "bg-blue-500" },
                { label: "Labor", value: displayResult.summary?.total_labor || 0, color: "bg-green-500" },
                { label: "Equipment", value: displayResult.summary?.total_equipment || 0, color: "bg-orange-500" },
                { label: "Indirect Costs", value: displayResult.summary?.total_indirect_costs || 0, color: "bg-gray-500" },
                { label: "Profit", value: displayResult.summary?.total_profit || 0, color: "bg-purple-500" },
              ].map((item, idx) => {
                const total = displayResult.summary?.grand_total || 1;
                const percentage = (item.value / total) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(item.value)} {currency} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className={`h-2 [&>div]:${item.color}`} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                {language === 'ar' ? 'ملخص البنود' : 'Items Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-right font-medium">{language === 'ar' ? 'رقم البند' : 'Item No.'}</th>
                      <th className="px-3 py-2 text-right font-medium">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                      <th className="px-3 py-2 text-right font-medium">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                      <th className="px-3 py-2 text-right font-medium">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
                      <th className="px-3 py-2 text-right font-medium">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                      <th className="px-3 py-2 text-right font-medium">{language === 'ar' ? 'نسبة العمالة' : 'Labor %'}</th>
                      <th className="px-3 py-2 text-right font-medium">{language === 'ar' ? 'نسبة التكاليف غير المباشرة' : 'Indirect %'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayResult.cost_analysis?.map((item, idx) => {
                      const laborPercentage = item.total_cost > 0 
                        ? ((item.labor?.total || 0) / item.total_cost * 100).toFixed(1) 
                        : '0';
                      const indirectPercentage = item.total_cost > 0 
                        ? ((item.total_indirect || 0) / item.total_cost * 100).toFixed(1) 
                        : '0';
                      const quantity = items[idx]?.quantity || 1;
                      
                      return (
                        <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-medium">{items[idx]?.item_number || idx + 1}</td>
                          <td className="px-3 py-2 max-w-[200px] truncate" title={item.item_description}>
                            {item.item_description?.substring(0, 40)}...
                          </td>
                          <td className="px-3 py-2">{formatNumber(quantity)}</td>
                          <td className="px-3 py-2">{formatNumber(item.unit_price)} {currency}</td>
                          <td className="px-3 py-2 font-semibold text-primary">{formatNumber(item.total_cost)} {currency}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                              {laborPercentage}%
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                              {indirectPercentage}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 font-semibold">
                      <td colSpan={4} className="px-3 py-2 text-right">{language === 'ar' ? 'المجموع الكلي' : 'Grand Total'}</td>
                      <td className="px-3 py-2 text-primary">{formatNumber(displayResult.summary?.grand_total || 0)} {currency}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          {displayResult.summary?.grand_total > 0 
                            ? ((displayResult.summary?.total_labor || 0) / displayResult.summary?.grand_total * 100).toFixed(1)
                            : '0'}%
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                          {displayResult.summary?.grand_total > 0 
                            ? ((displayResult.summary?.total_indirect_costs || 0) / displayResult.summary?.grand_total * 100).toFixed(1)
                            : '0'}%
                        </Badge>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{language === 'ar' ? 'تفاصيل البنود' : 'Item Details'}</span>
                <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors">
                  {language === 'ar' ? 'اضغط للتعديل' : 'Click to edit values'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayResult.cost_analysis?.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedItem === idx
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setSelectedItem(selectedItem === idx ? null : idx)}
                    >
                      <div>
                        <h4 className="font-medium">{item.item_description}</h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Direct: {formatNumber(item.total_direct)} {currency}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Indirect: {formatNumber(item.total_indirect)} {currency}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-left flex items-center gap-3">
                        <div>
                          <p className="font-bold text-primary">
                            {formatNumber(item.total_cost)} {currency}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Unit Price: {formatNumber(item.unit_price)}
                          </p>
                        </div>
                        {editingItem !== idx ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditItem(idx);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveItem(idx);
                              }}
                            >
                              <Save className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedItem === idx && (
                      <div className="mt-4 pt-4 border-t space-y-4 animate-slide-up">
                        {/* Materials */}
                        {item.materials?.items?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-500" />
                              Materials
                            </h5>
                            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                              {item.materials.items.map((mat, midx) => (
                                <div key={midx} className="flex justify-between items-center text-sm gap-2">
                                  <span className="flex-1">{mat.name}</span>
                                  {editingItem === idx ? (
                                    <>
                                      <Input
                                        type="number"
                                        value={mat.quantity}
                                        onChange={(e) => updateMaterialItem(idx, midx, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="w-20 h-8 text-xs"
                                      />
                                      <span className="text-xs text-muted-foreground">{mat.unit} ×</span>
                                      <Input
                                        type="number"
                                        value={mat.unit_price}
                                        onChange={(e) => updateMaterialItem(idx, midx, 'unit_price', parseFloat(e.target.value) || 0)}
                                        className="w-24 h-8 text-xs"
                                      />
                                      <span className="w-24 text-right font-medium">{formatNumber(mat.total)} {currency}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-muted-foreground">({mat.quantity} {mat.unit} × {mat.unit_price})</span>
                                      <span>{formatNumber(mat.total)} {currency}</span>
                                    </>
                                  )}
                                </div>
                              ))}
                              <div className="border-t pt-2 font-medium flex justify-between">
                                <span>Total Materials</span>
                                <span>{formatNumber(item.materials.total)} {currency}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Labor */}
                        {item.labor?.items?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Users className="w-4 h-4 text-green-500" />
                              Labor
                            </h5>
                            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                              {item.labor.items.map((lab, lidx) => (
                                <div key={lidx} className="flex justify-between items-center text-sm gap-2">
                                  <span className="flex-1">{lab.role}</span>
                                  {editingItem === idx ? (
                                    <>
                                      <Input
                                        type="number"
                                        value={lab.hours}
                                        onChange={(e) => updateLaborItem(idx, lidx, 'hours', parseFloat(e.target.value) || 0)}
                                        className="w-20 h-8 text-xs"
                                      />
                                      <span className="text-xs text-muted-foreground">hrs ×</span>
                                      <Input
                                        type="number"
                                        value={lab.hourly_rate}
                                        onChange={(e) => updateLaborItem(idx, lidx, 'hourly_rate', parseFloat(e.target.value) || 0)}
                                        className="w-24 h-8 text-xs"
                                      />
                                      <span className="w-24 text-right font-medium">{formatNumber(lab.total)} {currency}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-muted-foreground">({lab.hours} hrs × {lab.hourly_rate})</span>
                                      <span>{formatNumber(lab.total)} {currency}</span>
                                    </>
                                  )}
                                </div>
                              ))}
                              <div className="border-t pt-2 font-medium flex justify-between">
                                <span>Total Labor</span>
                                <span>{formatNumber(item.labor.total)} {currency}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Indirect Costs */}
                        <div>
                          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-500" />
                            Indirect Costs
                          </h5>
                          <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
                            {[
                              { label: 'Overhead', field: 'overhead' },
                              { label: 'Admin', field: 'admin' },
                              { label: 'Insurance', field: 'insurance' },
                              { label: 'Contingency', field: 'contingency' },
                            ].map(({ label, field }) => (
                              <div key={field} className="flex justify-between items-center gap-2">
                                <span>{label}</span>
                                {editingItem === idx ? (
                                  <Input
                                    type="number"
                                    value={(item as any)[field] || 0}
                                    onChange={(e) => updateIndirectCost(idx, field, parseFloat(e.target.value) || 0)}
                                    className="w-28 h-8 text-xs"
                                  />
                                ) : (
                                  <span>{formatNumber((item as any)[field])} {currency}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Profit Margin */}
                        <div>
                          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-500" />
                            Profit Margin
                          </h5>
                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="flex justify-between items-center gap-2">
                              <span>Margin (%)</span>
                              {editingItem === idx ? (
                                <Input
                                  type="number"
                                  value={item.profit_margin || 10}
                                  onChange={(e) => updateIndirectCost(idx, 'profit_margin', parseFloat(e.target.value) || 0)}
                                  className="w-28 h-8 text-xs"
                                />
                              ) : (
                                <span>{item.profit_margin || 10}%</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Recommendations */}
                        {item.recommendations?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              Recommendations
                            </h5>
                            <ul className="bg-amber-500/10 rounded-lg p-3 space-y-1">
                              {item.recommendations.map((rec, ridx) => (
                                <li key={ridx} className="text-sm text-amber-700 dark:text-amber-300">
                                  • {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          {displayResult.summary?.key_insights?.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Insights ({displayResult.ai_provider})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {displayResult.summary.key_insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!displayResult && !isAnalyzing && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Calculator className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Cost Analysis Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Run cost analysis to get detailed breakdown for each BOQ item
            </p>
            <Button onClick={runCostAnalysis} disabled={!items?.length}>
              Start Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
