import { useState } from "react";
import { FileUp, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw, FileSpreadsheet, ChevronDown, ChevronUp, BarChart3, PieChart, DollarSign, Package, Target, ShieldAlert, Lightbulb, Download, FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { extractDataFromExcel, formatExcelDataForAnalysis } from "@/lib/excel-utils";
import { extractTextFromPDF } from "@/lib/pdf-utils";
import { exportBOQComparisonToPDF, exportBOQComparisonToExcel } from "@/lib/boq-export-utils";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Legend, LineChart, Line, CartesianGrid } from "recharts";
interface ComparisonItem {
  itemCode: string;
  description: string;
  tender: {
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  } | null;
  budget: {
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  } | null;
  variance: {
    quantity: number;
    quantityPercent: number;
    rate: number;
    ratePercent: number;
    cost: number;
    costPercent: number;
  };
  status: 'Added' | 'Omitted' | 'Modified' | 'Matched';
  riskFlag: 'High Risk' | 'Opportunity' | 'Neutral';
  matchConfidence: number;
  recommendation?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
}

interface CategoryVariance {
  category: string;
  tenderAmount: number;
  budgetAmount: number;
  variance: number;
  variancePercent: number;
  itemCount: number;
}

interface ComparisonResult {
  summary: {
    tenderTotal: number;
    budgetTotal: number;
    totalVariance: number;
    totalVariancePercent: number;
    addedItemsCount: number;
    omittedItemsCount: number;
    modifiedItemsCount: number;
    matchedItemsCount: number;
    highRiskCount: number;
    opportunityCount: number;
  };
  comparisonItems: ComparisonItem[];
  categoryVariances: CategoryVariance[];
  highRiskItems: ComparisonItem[];
  opportunities: ComparisonItem[];
  addedItems: ComparisonItem[];
  omittedItems: ComparisonItem[];
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function BOQComparison() {
  const { toast } = useToast();
  const [tenderFile, setTenderFile] = useState<File | null>(null);
  const [budgetFile, setBudgetFile] = useState<File | null>(null);
  const [tenderText, setTenderText] = useState<string>("");
  const [budgetText, setBudgetText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [activeTab, setActiveTab] = useState("comparison");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const isExcelFile = (file: File) => {
    return file.type.includes('spreadsheet') || file.type.includes('excel') || 
           file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  };

  const extractFileContent = async (file: File): Promise<string> => {
    if (isExcelFile(file)) {
      const result = await extractDataFromExcel(file);
      return formatExcelDataForAnalysis(result);
    } else {
      return await extractTextFromPDF(file);
    }
  };

  const handleFileSelect = async (type: 'tender' | 'budget', file: File) => {
    try {
      if (type === 'tender') {
        setTenderFile(file);
      } else {
        setBudgetFile(file);
      }

      toast({
        title: `Processing ${type === 'tender' ? 'Tender' : 'Budget'} BOQ...`,
        description: "Extracting content from file",
      });

      const text = await extractFileContent(file);
      
      if (type === 'tender') {
        setTenderText(text);
      } else {
        setBudgetText(text);
      }

      toast({
        title: "File processed successfully",
        description: `${file.name} is ready for comparison`,
      });
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const runComparison = async () => {
    if (!tenderText || !budgetText) {
      toast({
        title: "Missing files",
        description: "Please upload both Tender BOQ and Budget BOQ files",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("compare-boq", {
        body: { tenderText, budgetText },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setComparisonResult(data);
      toast({
        title: "Comparison complete",
        description: `Found ${data.comparisonItems?.length || 0} items to compare`,
      });
    } catch (error) {
      console.error("Comparison error:", error);
      toast({
        title: "Comparison failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRowExpand = (itemCode: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(itemCode)) {
        next.delete(itemCode);
      } else {
        next.add(itemCode);
      }
      return next;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Added':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Added</Badge>;
      case 'Omitted':
        return <Badge variant="destructive">Omitted</Badge>;
      case 'Modified':
        return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600">Modified</Badge>;
      case 'Matched':
        return <Badge variant="outline" className="border-green-500 text-green-600">Matched</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'High Risk':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> High Risk</Badge>;
      case 'Opportunity':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-1"><TrendingDown className="w-3 h-3" /> Opportunity</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Minus className="w-3 h-3" /> Neutral</Badge>;
    }
  };

  const getVarianceIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-destructive" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const statusData = comparisonResult ? [
    { name: 'Matched', value: comparisonResult.summary.matchedItemsCount, color: 'hsl(var(--chart-1))' },
    { name: 'Modified', value: comparisonResult.summary.modifiedItemsCount, color: 'hsl(var(--chart-2))' },
    { name: 'Added', value: comparisonResult.summary.addedItemsCount, color: 'hsl(var(--chart-3))' },
    { name: 'Omitted', value: comparisonResult.summary.omittedItemsCount, color: 'hsl(var(--chart-4))' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Tender vs Budget BOQ Comparison
          </CardTitle>
          <CardDescription>
            Upload Tender BOQ and Budget BOQ files to compare and analyze variances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tender BOQ Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Tender BOQ</label>
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer hover:border-primary/50 ${
                  tenderFile ? 'border-green-500 bg-green-500/5' : 'border-border'
                }`}
                onClick={() => document.getElementById('tender-file')?.click()}
              >
                <input
                  id="tender-file"
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('tender', file);
                  }}
                />
                {tenderFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-green-500" />
                    <span className="text-sm font-medium">{tenderFile.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileUp className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload Tender BOQ (PDF/Excel)</p>
                  </div>
                )}
              </div>
              {tenderText && (
                <p className="text-xs text-muted-foreground">
                  ✓ {tenderText.length.toLocaleString()} characters extracted
                </p>
              )}
            </div>

            {/* Budget BOQ Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Budget BOQ</label>
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer hover:border-primary/50 ${
                  budgetFile ? 'border-green-500 bg-green-500/5' : 'border-border'
                }`}
                onClick={() => document.getElementById('budget-file')?.click()}
              >
                <input
                  id="budget-file"
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('budget', file);
                  }}
                />
                {budgetFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-green-500" />
                    <span className="text-sm font-medium">{budgetFile.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileUp className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload Budget BOQ (PDF/Excel)</p>
                  </div>
                )}
              </div>
              {budgetText && (
                <p className="text-xs text-muted-foreground">
                  ✓ {budgetText.length.toLocaleString()} characters extracted
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Button
              onClick={runComparison}
              disabled={!tenderText || !budgetText || isProcessing}
              className="gap-2"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Comparing BOQs...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  Compare BOQs
                </>
              )}
            </Button>
            
            {comparisonResult && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    exportBOQComparisonToPDF(comparisonResult);
                    toast({ title: "PDF exported successfully" });
                  }}
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    exportBOQComparisonToExcel(comparisonResult);
                    toast({ title: "Excel exported successfully" });
                  }}
                >
                  <FileDown className="w-4 h-4" />
                  Export Excel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {comparisonResult && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tender Total</p>
                    <p className="text-lg font-bold">{formatCurrency(comparisonResult.summary.tenderTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Budget Total</p>
                    <p className="text-lg font-bold">{formatCurrency(comparisonResult.summary.budgetTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    comparisonResult.summary.totalVariance > 0 ? 'bg-destructive/10' : 'bg-green-500/10'
                  }`}>
                    {comparisonResult.summary.totalVariance > 0 ? (
                      <TrendingUp className="w-5 h-5 text-destructive" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Variance</p>
                    <p className={`text-lg font-bold ${
                      comparisonResult.summary.totalVariance > 0 ? 'text-destructive' : 'text-green-500'
                    }`}>
                      {formatCurrency(comparisonResult.summary.totalVariance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercent(comparisonResult.summary.totalVariancePercent)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Items</p>
                    <p className="text-lg font-bold">{comparisonResult.comparisonItems.length}</p>
                    <div className="flex gap-1 text-xs">
                      <span className="text-green-500">{comparisonResult.summary.matchedItemsCount} matched</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-destructive">{comparisonResult.summary.highRiskCount} risks</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Summary Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    {comparisonResult.summary.matchedItemsCount}
                  </Badge>
                  <p className="text-xs text-muted-foreground">Matched</p>
                </div>
                <div className="space-y-1">
                  <Badge variant="secondary" className="bg-amber-500 text-white">
                    {comparisonResult.summary.modifiedItemsCount}
                  </Badge>
                  <p className="text-xs text-muted-foreground">Modified</p>
                </div>
                <div className="space-y-1">
                  <Badge variant="default" className="bg-blue-500">
                    {comparisonResult.summary.addedItemsCount}
                  </Badge>
                  <p className="text-xs text-muted-foreground">Added</p>
                </div>
                <div className="space-y-1">
                  <Badge variant="destructive">
                    {comparisonResult.summary.omittedItemsCount}
                  </Badge>
                  <p className="text-xs text-muted-foreground">Omitted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Different Views */}
          <Card>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6 mb-6">
                  <TabsTrigger value="comparison" className="gap-1 text-xs">
                    <BarChart3 className="w-3 h-3" />
                    Comparison
                  </TabsTrigger>
                  <TabsTrigger value="variance" className="gap-1 text-xs">
                    <TrendingUp className="w-3 h-3" />
                    Variance
                  </TabsTrigger>
                  <TabsTrigger value="risks" className="gap-1 text-xs">
                    <ShieldAlert className="w-3 h-3" />
                    Risks
                  </TabsTrigger>
                  <TabsTrigger value="opportunities" className="gap-1 text-xs">
                    <Lightbulb className="w-3 h-3" />
                    Opportunities
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="gap-1 text-xs">
                    <PieChart className="w-3 h-3" />
                    Categories
                  </TabsTrigger>
                  <TabsTrigger value="added-omitted" className="gap-1 text-xs">
                    <Package className="w-3 h-3" />
                    Added/Omitted
                  </TabsTrigger>
                </TabsList>

                {/* Comparison Table Tab */}
                <TabsContent value="comparison">
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Item / Description</TableHead>
                            <TableHead className="text-center">Tender<br/><span className="text-xs font-normal">Qty | Rate | Amount</span></TableHead>
                            <TableHead className="text-center">Budget<br/><span className="text-xs font-normal">Qty | Rate | Amount</span></TableHead>
                            <TableHead className="text-center">Variance<br/><span className="text-xs font-normal">Qty | Rate | Cost</span></TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Risk</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparisonResult.comparisonItems.slice(0, 50).map((item, index) => (
                            <TableRow 
                              key={`${item.itemCode}-${index}`}
                              className="hover:bg-muted/30 cursor-pointer"
                              onClick={() => toggleRowExpand(`${item.itemCode}-${index}`)}
                            >
                              <TableCell>
                                {expandedRows.has(`${item.itemCode}-${index}`) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{item.itemCode}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                {item.tender ? (
                                  <div className="space-y-0.5">
                                    <p>{item.tender.quantity.toLocaleString()} {item.tender.unit}</p>
                                    <p className="text-muted-foreground">{formatCurrency(item.tender.rate)}</p>
                                    <p className="font-medium">{formatCurrency(item.tender.amount)}</p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                {item.budget ? (
                                  <div className="space-y-0.5">
                                    <p>{item.budget.quantity.toLocaleString()} {item.budget.unit}</p>
                                    <p className="text-muted-foreground">{formatCurrency(item.budget.rate)}</p>
                                    <p className="font-medium">{formatCurrency(item.budget.amount)}</p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-center gap-1">
                                    {getVarianceIcon(item.variance.quantity)}
                                    <span className={item.variance.quantity !== 0 ? (item.variance.quantity > 0 ? 'text-destructive' : 'text-green-500') : ''}>
                                      {formatPercent(item.variance.quantityPercent)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-center gap-1">
                                    {getVarianceIcon(item.variance.rate)}
                                    <span className={item.variance.rate !== 0 ? (item.variance.rate > 0 ? 'text-destructive' : 'text-green-500') : ''}>
                                      {formatPercent(item.variance.ratePercent)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-center gap-1 font-medium">
                                    {getVarianceIcon(item.variance.cost)}
                                    <span className={item.variance.cost !== 0 ? (item.variance.cost > 0 ? 'text-destructive' : 'text-green-500') : ''}>
                                      {formatCurrency(item.variance.cost)}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {getStatusBadge(item.status)}
                              </TableCell>
                              <TableCell className="text-center">
                                {getRiskBadge(item.riskFlag)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {comparisonResult.comparisonItems.length > 50 && (
                      <div className="p-4 text-center text-sm text-muted-foreground border-t">
                        Showing 50 of {comparisonResult.comparisonItems.length} items
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Detailed Variance Breakdown Tab */}
                <TabsContent value="variance">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Detailed Variance Breakdown</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Item-by-item analysis with commercial recommendations and priority classification
                    </p>
                    
                    <div className="rounded-lg border overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-primary/5">
                              <TableHead className="whitespace-nowrap">Item Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right whitespace-nowrap">Tender Qty</TableHead>
                              <TableHead className="text-right whitespace-nowrap">Budget Qty</TableHead>
                              <TableHead className="text-right whitespace-nowrap">Qty Variance</TableHead>
                              <TableHead className="text-right whitespace-nowrap">Tender Rate</TableHead>
                              <TableHead className="text-right whitespace-nowrap">Budget Rate</TableHead>
                              <TableHead className="text-right whitespace-nowrap">Rate Variance</TableHead>
                              <TableHead className="text-right whitespace-nowrap">Cost Variance</TableHead>
                              <TableHead className="text-center">Priority</TableHead>
                              <TableHead>Recommendation</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comparisonResult.comparisonItems.map((item, index) => (
                              <TableRow key={index} className="hover:bg-muted/30">
                                <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                                <TableCell className="max-w-xs">
                                  <span className="line-clamp-2 text-sm">{item.description}</span>
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {item.tender?.quantity?.toLocaleString() || '—'}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {item.budget?.quantity?.toLocaleString() || '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {getVarianceIcon(item.variance.quantity)}
                                    <span className={cn(
                                      "text-sm font-medium",
                                      item.variance.quantity > 0 ? "text-destructive" : 
                                      item.variance.quantity < 0 ? "text-green-500" : ""
                                    )}>
                                      {formatPercent(item.variance.quantityPercent)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {item.tender?.rate ? formatCurrency(item.tender.rate) : '—'}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {item.budget?.rate ? formatCurrency(item.budget.rate) : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {getVarianceIcon(item.variance.rate)}
                                    <span className={cn(
                                      "text-sm font-medium",
                                      item.variance.rate > 0 ? "text-destructive" : 
                                      item.variance.rate < 0 ? "text-green-500" : ""
                                    )}>
                                      {formatPercent(item.variance.ratePercent)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={cn(
                                    "font-medium",
                                    item.variance.cost > 0 ? "text-destructive" : 
                                    item.variance.cost < 0 ? "text-green-500" : ""
                                  )}>
                                    {formatCurrency(item.variance.cost)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.priority ? (
                                    <Badge variant={
                                      item.priority === 'Critical' ? 'destructive' :
                                      item.priority === 'High' ? 'default' :
                                      item.priority === 'Medium' ? 'secondary' : 'outline'
                                    } className={cn(
                                      item.priority === 'Critical' && 'bg-red-600',
                                      item.priority === 'High' && 'bg-orange-500',
                                      item.priority === 'Medium' && 'bg-amber-500 text-white',
                                      item.priority === 'Low' && 'border-green-500 text-green-600'
                                    )}>
                                      {item.priority}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {item.recommendation || '—'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* High Risk Items Tab */}
                <TabsContent value="risks">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <ShieldAlert className="w-5 h-5" />
                      <h3 className="font-semibold">High Risk Items ({comparisonResult.highRiskItems.length})</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Items with variance &gt;10% or cost impact &gt;50,000 SAR
                    </p>
                    
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-destructive/5">
                            <TableHead>Item</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Tender Amount</TableHead>
                            <TableHead className="text-right">Budget Amount</TableHead>
                            <TableHead className="text-right">Cost Variance</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparisonResult.highRiskItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.itemCode}</TableCell>
                              <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                              <TableCell className="text-right">
                                {item.tender ? formatCurrency(item.tender.amount) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.budget ? formatCurrency(item.budget.amount) : '—'}
                              </TableCell>
                              <TableCell className="text-right text-destructive font-medium">
                                {formatCurrency(item.variance.cost)} ({formatPercent(item.variance.costPercent)})
                              </TableCell>
                              <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                {/* Opportunities Tab */}
                <TabsContent value="opportunities">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-500">
                      <Lightbulb className="w-5 h-5" />
                      <h3 className="font-semibold">Cost Saving Opportunities ({comparisonResult.opportunities.length})</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Items where Tender is lower than Budget - potential savings
                    </p>
                    
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-green-500/5">
                            <TableHead>Item</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Tender Amount</TableHead>
                            <TableHead className="text-right">Budget Amount</TableHead>
                            <TableHead className="text-right">Savings</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparisonResult.opportunities.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.itemCode}</TableCell>
                              <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                              <TableCell className="text-right">
                                {item.tender ? formatCurrency(item.tender.amount) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.budget ? formatCurrency(item.budget.amount) : '—'}
                              </TableCell>
                              <TableCell className="text-right text-green-500 font-medium">
                                {formatCurrency(Math.abs(item.variance.cost))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Category Variance Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Category-wise Variance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={comparisonResult.categoryVariances} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                            <YAxis type="category" dataKey="category" width={100} fontSize={11} />
                            <Tooltip 
                              formatter={(value: number) => [formatCurrency(value), 'Variance']}
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Bar dataKey="variance" name="Variance">
                              {comparisonResult.categoryVariances.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.variance > 0 ? 'hsl(var(--destructive))' : 'hsl(142.1 76.2% 36.3%)'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Status Distribution Pie Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Item Status Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsPieChart>
                            <Pie
                              data={statusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Category Details Table */}
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base">Category Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Category</TableHead>
                              <TableHead className="text-right">Tender Amount</TableHead>
                              <TableHead className="text-right">Budget Amount</TableHead>
                              <TableHead className="text-right">Variance</TableHead>
                              <TableHead className="text-right">Variance %</TableHead>
                              <TableHead className="text-center">Items</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comparisonResult.categoryVariances.map((cat, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{cat.category}</TableCell>
                                <TableCell className="text-right">{formatCurrency(cat.tenderAmount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(cat.budgetAmount)}</TableCell>
                                <TableCell className={`text-right font-medium ${cat.variance > 0 ? 'text-destructive' : 'text-green-500'}`}>
                                  {formatCurrency(cat.variance)}
                                </TableCell>
                                <TableCell className={`text-right ${cat.variancePercent > 0 ? 'text-destructive' : 'text-green-500'}`}>
                                  {formatPercent(cat.variancePercent)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline">{cat.itemCount}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Added/Omitted Tab */}
                <TabsContent value="added-omitted">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Added Items */}
                    <Card>
                      <CardHeader className="bg-blue-500/5">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Badge className="bg-blue-500">{comparisonResult.addedItems.length}</Badge>
                          Added Items
                        </CardTitle>
                        <CardDescription>Items in Tender but not in Budget</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {comparisonResult.addedItems.map((item, index) => (
                            <div key={index} className="p-3 rounded-lg border bg-blue-500/5">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-sm">{item.itemCode}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                </div>
                                <p className="text-sm font-bold text-blue-600">
                                  +{formatCurrency(item.tender?.amount || 0)}
                                </p>
                              </div>
                            </div>
                          ))}
                          {comparisonResult.addedItems.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No added items found</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Omitted Items */}
                    <Card>
                      <CardHeader className="bg-destructive/5">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Badge variant="destructive">{comparisonResult.omittedItems.length}</Badge>
                          Omitted Items
                        </CardTitle>
                        <CardDescription>Items in Budget but not in Tender</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {comparisonResult.omittedItems.map((item, index) => (
                            <div key={index} className="p-3 rounded-lg border bg-destructive/5">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-sm">{item.itemCode}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                </div>
                                <p className="text-sm font-bold text-destructive">
                                  -{formatCurrency(item.budget?.amount || 0)}
                                </p>
                              </div>
                            </div>
                          ))}
                          {comparisonResult.omittedItems.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No omitted items found</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
