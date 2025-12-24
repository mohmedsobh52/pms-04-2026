import { useState, useMemo, useRef } from "react";
import { Layers, Check, CheckSquare, Square, Calculator, FileDown, FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { CostTemplate } from "@/hooks/useDynamicCostCalculator";
import { toast } from "sonner";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface BulkApplyCostsDialogProps {
  items: BOQItem[];
  savedTemplate: CostTemplate | null;
  savedTemplates?: CostTemplate[];
  onApplyToItems: (items: Array<{ itemId: string; quantity: number }>, templateId?: string) => number;
  onDeleteTemplate?: (templateId: string) => boolean;
  onExportTemplates?: () => string;
  onImportTemplates?: (jsonString: string) => { success: boolean; count: number; error?: string };
  currency?: string;
}

export function BulkApplyCostsDialog({
  items,
  savedTemplate,
  savedTemplates = [],
  onApplyToItems,
  onDeleteTemplate,
  onExportTemplates,
  onImportTemplates,
  currency = "SAR",
}: BulkApplyCostsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const activeTemplate = useMemo(() => {
    if (selectedTemplateId) {
      return savedTemplates.find(t => t.id === selectedTemplateId) || null;
    }
    return savedTemplate;
  }, [selectedTemplateId, savedTemplates, savedTemplate]);

  const handleToggleItem = (itemNumber: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemNumber)) {
        newSet.delete(itemNumber);
      } else {
        newSet.add(itemNumber);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.item_number)));
    }
  };

  const handleApply = () => {
    if (selectedItems.size === 0) {
      toast.error("يرجى اختيار بند واحد على الأقل");
      return;
    }

    if (!activeTemplate) {
      toast.error("يرجى اختيار قالب أولاً");
      return;
    }

    const itemsToApply = items
      .filter(item => selectedItems.has(item.item_number))
      .map(item => ({ itemId: item.item_number, quantity: item.quantity }));

    const appliedCount = onApplyToItems(itemsToApply, activeTemplate.id);
    
    if (appliedCount > 0) {
      toast.success(`تم تطبيق القالب "${activeTemplate.name}" على ${appliedCount} بند بنجاح`);
      setIsOpen(false);
      setSelectedItems(new Set());
    } else {
      toast.error("لم يتم تطبيق القالب");
    }
  };

  const handleExport = () => {
    if (onExportTemplates) {
      const jsonContent = onExportTemplates();
      const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cost_templates_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${savedTemplates.length} قالب بنجاح`);
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImportTemplates) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = onImportTemplates(content);
      if (result.success) {
        toast.success(`تم استيراد ${result.count} قالب جديد بنجاح`);
      } else {
        toast.error(result.error || "فشل في استيراد القوالب");
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (onDeleteTemplate) {
      onDeleteTemplate(templateId);
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId("");
      }
      toast.success("تم حذف القالب بنجاح");
    }
  };

  const formatNumber = (num: number) => num.toLocaleString('ar-SA', { maximumFractionDigits: 2 });

  const templateSummary = useMemo(() => {
    if (!activeTemplate) return null;
    
    const { costs } = activeTemplate;
    const totalLabor = costs.generalLabor + costs.equipmentOperator;
    const totalIndirect = costs.overhead + costs.admin + costs.insurance + costs.contingency;
    const totalDirect = costs.materials + costs.equipment + totalLabor + costs.subcontractor;
    const baseCost = totalDirect + totalIndirect;
    const profitAmount = baseCost * (costs.profitMargin / 100);
    const unitPrice = baseCost + profitAmount;

    return {
      totalLabor,
      totalIndirect,
      totalDirect,
      profitAmount,
      unitPrice,
      profitMargin: costs.profitMargin,
    };
  }, [activeTemplate]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          disabled={savedTemplates.length === 0 && !savedTemplate}
        >
          <Layers className="w-4 h-4" />
          تطبيق على عدة بنود
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            تطبيق القالب على عدة بنود
          </DialogTitle>
          <DialogDescription>
            اختر القالب والبنود التي تريد تطبيق التكاليف عليها
          </DialogDescription>
        </DialogHeader>

        {/* Template Selection & Export/Import */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Select 
              value={selectedTemplateId || (savedTemplate?.id || "")} 
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="اختر قالب التكاليف..." />
              </SelectTrigger>
              <SelectContent>
                {savedTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span>{template.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Export/Import Buttons */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              disabled={savedTemplates.length === 0}
              title="تصدير القوالب"
            >
              <FileDown className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleImportClick}
              title="استيراد القوالب"
            >
              <FileUp className="w-4 h-4" />
            </Button>
            <input
              type="file"
              ref={importInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Templates List with Delete */}
          {savedTemplates.length > 0 && (
            <ScrollArea className="h-20 border rounded p-2">
              <div className="flex flex-wrap gap-1">
                {savedTemplates.map((template) => (
                  <Badge 
                    key={template.id} 
                    variant={activeTemplate?.id === template.id ? "default" : "secondary"}
                    className="cursor-pointer gap-1 pr-1"
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    {template.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                      className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Template Summary */}
        {activeTemplate && templateSummary && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">القالب: {activeTemplate.name}</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">العمالة</div>
                  <div className="font-semibold">{formatNumber(templateSummary.totalLabor)} {currency}</div>
                </div>
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">غير مباشرة</div>
                  <div className="font-semibold">{formatNumber(templateSummary.totalIndirect)} {currency}</div>
                </div>
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">هامش الربح</div>
                  <div className="font-semibold">{templateSummary.profitMargin}%</div>
                </div>
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">سعر الوحدة</div>
                  <div className="font-bold text-primary">{formatNumber(templateSummary.unitPrice)} {currency}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!activeTemplate && savedTemplates.length === 0 && (
          <Card className="border-dashed border-destructive/30 bg-destructive/5">
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">
                لا يوجد قالب محفوظ. يرجى حفظ قالب من أحد البنود أولاً.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Items Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">اختر البنود ({selectedItems.size} / {items.length})</span>
            <Button variant="ghost" size="sm" onClick={handleSelectAll} className="gap-1">
              {selectedItems.size === items.length ? (
                <>
                  <CheckSquare className="w-4 h-4" />
                  إلغاء تحديد الكل
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  تحديد الكل
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="h-[250px] border rounded-lg">
            <div className="p-2 space-y-1">
              {items.map((item) => (
                <div
                  key={item.item_number}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedItems.has(item.item_number)
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() => handleToggleItem(item.item_number)}
                >
                  <Checkbox
                    checked={selectedItems.has(item.item_number)}
                    onCheckedChange={() => handleToggleItem(item.item_number)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.item_number}
                      </Badge>
                      <span className="text-sm truncate">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>الكمية: {item.quantity} {item.unit}</span>
                      {item.unit_price && (
                        <span>السعر الحالي: {formatNumber(item.unit_price)} {currency}</span>
                      )}
                    </div>
                  </div>
                  {selectedItems.has(item.item_number) && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedItems.size > 0 && activeTemplate && templateSummary && (
              <span>
                الإجمالي المتوقع: {formatNumber(templateSummary.unitPrice * selectedItems.size)} {currency}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={selectedItems.size === 0 || !activeTemplate}
              className="gap-1"
            >
              <Check className="w-4 h-4" />
              تطبيق على {selectedItems.size} بند
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}