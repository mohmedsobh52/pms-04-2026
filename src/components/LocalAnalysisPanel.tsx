import { useState } from "react";
import { Calculator, FileSpreadsheet, CheckCircle, Download, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { ExcelBOQItem } from "@/lib/excel-utils";

export interface LocalAnalysisResult {
  items: LocalAnalysisItem[];
  totals: {
    subtotal: number;
    itemsCount: number;
    averageUnitPrice: number;
  };
  summary: {
    unitsUsed: string[];
    hasAllPrices: boolean;
    hasAllQuantities: boolean;
    completenessScore: number;
  };
  analysisDate: string;
  analysisType: 'local';
}

export interface LocalAnalysisItem {
  itemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface LocalAnalysisPanelProps {
  excelItems?: ExcelBOQItem[];
  textContent?: string;
  onAnalysisComplete: (result: LocalAnalysisResult) => void;
  isAnalyzing?: boolean;
}

// Parse items from extracted text
function parseTextToItems(text: string): LocalAnalysisItem[] {
  const items: LocalAnalysisItem[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Pattern to detect item lines (numbers, descriptions, prices)
  const itemPattern = /^[\\s]*(\d+[\\.\-]?\d*|[٠-٩]+[\\.\-]?[٠-٩]*)\s*[|\t,;]?\s*(.+?)\s*[|\t,;]?\s*(م[٢٣]?|م\.?[طل]?|كجم?|طن|لتر|عدد|unit|m[23]?|kg|ton|pcs?|no\.?|nos?|ea\.?|lf|lm|sqm?|cum?)?\s*[|\t,;]?\s*([٠-٩,\.\d]+)?\s*[|\t,;]?\s*([٠-٩,\.\d]+)?\s*[|\t,;]?\s*([٠-٩,\.\d]+)?/i;
  
  for (const line of lines) {
    // Skip header-like lines
    if (line.includes('البند') || line.includes('الوصف') || line.includes('description') || line.includes('item')) {
      continue;
    }
    
    const match = line.match(itemPattern);
    if (match) {
      const [, itemNo, desc, unit, qty, price, total] = match;
      
      // Skip if no meaningful description
      if (!desc || desc.trim().length < 3) continue;
      
      const parseNum = (val: string | undefined): number => {
        if (!val) return 0;
        const cleaned = val.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        return parseFloat(cleaned.replace(/,/g, '')) || 0;
      };
      
      const quantity = parseNum(qty);
      const unitPrice = parseNum(price);
      const totalPrice = parseNum(total) || (quantity * unitPrice);
      
      if (desc.trim()) {
        items.push({
          itemNumber: itemNo?.trim() || String(items.length + 1),
          description: desc.trim(),
          unit: unit?.trim() || '',
          quantity,
          unitPrice,
          totalPrice,
        });
      }
    }
  }
  
  return items;
}

// Convert Excel items to local analysis items
function convertExcelItems(excelItems: ExcelBOQItem[]): LocalAnalysisItem[] {
  return excelItems
    .filter(item => item.description || item.itemNo)
    .map((item, index) => ({
      itemNumber: item.itemNo || String(index + 1),
      description: item.description || '',
      unit: item.unit || '',
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || ((item.quantity || 0) * (item.unitPrice || 0)),
    }));
}

// Calculate totals and summary
function calculateSummary(items: LocalAnalysisItem[]): LocalAnalysisResult {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemsWithPrices = items.filter(item => item.unitPrice > 0);
  const itemsWithQuantities = items.filter(item => item.quantity > 0);
  const unitsUsed = [...new Set(items.map(item => item.unit).filter(Boolean))];
  
  const completenessScore = Math.round(
    ((itemsWithPrices.length / Math.max(items.length, 1)) * 50) +
    ((itemsWithQuantities.length / Math.max(items.length, 1)) * 50)
  );
  
  return {
    items,
    totals: {
      subtotal,
      itemsCount: items.length,
      averageUnitPrice: itemsWithPrices.length > 0 
        ? itemsWithPrices.reduce((sum, item) => sum + item.unitPrice, 0) / itemsWithPrices.length 
        : 0,
    },
    summary: {
      unitsUsed,
      hasAllPrices: itemsWithPrices.length === items.length,
      hasAllQuantities: itemsWithQuantities.length === items.length,
      completenessScore,
    },
    analysisDate: new Date().toISOString(),
    analysisType: 'local',
  };
}

export function LocalAnalysisPanel({
  excelItems,
  textContent,
  onAnalysisComplete,
  isAnalyzing = false,
}: LocalAnalysisPanelProps) {
  const { isArabic } = useLanguage();
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<LocalAnalysisResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const hasData = (excelItems && excelItems.length > 0) || (textContent && textContent.length > 100);

  const runLocalAnalysis = async () => {
    setAnalyzing(true);
    setProgress(10);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      setProgress(30);

      let items: LocalAnalysisItem[] = [];

      // Process Excel items if available
      if (excelItems && excelItems.length > 0) {
        items = convertExcelItems(excelItems);
        setProgress(60);
      } 
      // Otherwise parse text content
      else if (textContent) {
        items = parseTextToItems(textContent);
        setProgress(60);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      setProgress(80);

      // Calculate summary
      const analysisResult = calculateSummary(items);
      setProgress(100);

      setResult(analysisResult);
      onAnalysisComplete(analysisResult);
    } catch (error) {
      console.error('Local analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ar-SA', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(num);
  };

  if (!hasData && !result) return null;

  return (
    <Card className="border-green-500/20 bg-green-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-green-600" />
            <span>{isArabic ? 'التحليل المحلي (بدون AI)' : 'Local Analysis (No AI)'}</span>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            {isArabic ? 'سريع ومجاني' : 'Fast & Free'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info */}
        <div className="text-sm text-muted-foreground bg-background p-3 rounded-lg">
          <p>
            {isArabic 
              ? '📊 يستخرج الأرقام والنصوص مباشرة من الجداول بدون استخدام الذكاء الاصطناعي. مناسب للملفات المنسقة بشكل جيد.'
              : '📊 Extracts numbers and text directly from tables without AI. Best for well-formatted files.'}
          </p>
        </div>

        {/* Progress */}
        {analyzing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{isArabic ? 'جاري التحليل...' : 'Analyzing...'}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Results Summary */}
        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">{isArabic ? 'البنود' : 'Items'}</p>
                <p className="font-bold text-lg text-green-600">{result.totals.itemsCount}</p>
              </div>
              <div className="text-center p-2 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">{isArabic ? 'الإجمالي' : 'Total'}</p>
                <p className="font-bold text-lg">{formatNumber(result.totals.subtotal)}</p>
              </div>
              <div className="text-center p-2 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">{isArabic ? 'الاكتمال' : 'Complete'}</p>
                <p className="font-bold text-lg">{result.summary.completenessScore}%</p>
              </div>
            </div>

            {/* Preview */}
            <Collapsible open={showPreview} onOpenChange={setShowPreview}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    {isArabic ? 'عرض البنود المستخرجة' : 'View Extracted Items'}
                  </span>
                  {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="max-h-60 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">{isArabic ? 'رقم' : '#'}</TableHead>
                        <TableHead>{isArabic ? 'الوصف' : 'Description'}</TableHead>
                        <TableHead className="w-16">{isArabic ? 'الوحدة' : 'Unit'}</TableHead>
                        <TableHead className="w-20">{isArabic ? 'الكمية' : 'Qty'}</TableHead>
                        <TableHead className="w-24">{isArabic ? 'السعر' : 'Price'}</TableHead>
                        <TableHead className="w-24">{isArabic ? 'الإجمالي' : 'Total'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.items.slice(0, 20).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{item.itemNumber}</TableCell>
                          <TableCell className="text-xs max-w-48 truncate">{item.description}</TableCell>
                          <TableCell className="text-xs">{item.unit}</TableCell>
                          <TableCell className="text-xs">{item.quantity}</TableCell>
                          <TableCell className="text-xs">{formatNumber(item.unitPrice)}</TableCell>
                          <TableCell className="text-xs font-medium">{formatNumber(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {result.items.length > 20 && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      {isArabic 
                        ? `... و ${result.items.length - 20} بند آخر`
                        : `... and ${result.items.length - 20} more items`}
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Action Button */}
        {!result && (
          <Button 
            onClick={runLocalAnalysis} 
            className="w-full gap-2 bg-green-600 hover:bg-green-700"
            disabled={analyzing || isAnalyzing || !hasData}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {analyzing 
              ? (isArabic ? 'جاري التحليل...' : 'Analyzing...')
              : (isArabic ? 'تحليل محلي سريع' : 'Quick Local Analysis')}
          </Button>
        )}

        {result && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>{isArabic ? 'اكتمل التحليل المحلي' : 'Local analysis complete'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
