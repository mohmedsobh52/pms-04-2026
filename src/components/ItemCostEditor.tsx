import { useState, useEffect, useCallback } from "react";
import { Calculator, DollarSign, Users, Building2, TrendingUp, Edit2, Save, X, Copy, FileDown, FileUp, Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CostInputs, CalculatedCosts, CostTemplate } from "@/hooks/useDynamicCostCalculator";
import { toast } from "sonner";

interface AvailableItem {
  itemId: string;
  description: string;
  calculatedUnitPrice: number;
}

interface ItemCostEditorProps {
  itemId: string;
  itemDescription: string;
  quantity: number;
  currentCosts: CostInputs;
  calculatedCosts: CalculatedCosts & { aiSuggestedRate?: number };
  onSave: (itemId: string, costs: CostInputs) => void;
  onCopyFrom?: (sourceItemId: string) => CostInputs | null;
  onSaveAsTemplate?: (costs: CostInputs, name: string) => void;
  onApplyTemplate?: (templateId?: string) => CostInputs | null;
  onDeleteTemplate?: (templateId: string) => boolean;
  savedTemplate?: CostTemplate | null;
  savedTemplates?: CostTemplate[];
  availableItems?: AvailableItem[];
  currency?: string;
}

export function ItemCostEditor({
  itemId,
  itemDescription,
  quantity,
  currentCosts,
  calculatedCosts,
  onSave,
  onCopyFrom,
  onSaveAsTemplate,
  onApplyTemplate,
  onDeleteTemplate,
  savedTemplate,
  savedTemplates = [],
  availableItems = [],
  currency = "SAR",
}: ItemCostEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editedCosts, setEditedCosts] = useState<CostInputs>(currentCosts);
  const [liveCalculated, setLiveCalculated] = useState<CalculatedCosts>(calculatedCosts);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showNewTemplateInput, setShowNewTemplateInput] = useState(false);

  useEffect(() => {
    setEditedCosts(currentCosts);
  }, [currentCosts]);

  // Calculate live values when costs change
  useEffect(() => {
    const totalLabor = (editedCosts.generalLabor || 0) + (editedCosts.equipmentOperator || 0);
    const totalIndirect = (editedCosts.overhead || 0) + (editedCosts.admin || 0) + 
                          (editedCosts.insurance || 0) + (editedCosts.contingency || 0);
    const totalDirect = (editedCosts.materials || 0) + (editedCosts.equipment || 0) + 
                        totalLabor + (editedCosts.subcontractor || 0);
    const baseCost = totalDirect + totalIndirect;
    const profitAmount = baseCost * ((editedCosts.profitMargin || 0) / 100);
    const calculatedUnitPrice = baseCost + profitAmount;

    setLiveCalculated({
      totalLabor,
      totalIndirect,
      totalDirect,
      profitAmount,
      calculatedUnitPrice,
    });
  }, [editedCosts]);

  const handleInputChange = useCallback((field: keyof CostInputs, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedCosts(prev => ({ ...prev, [field]: numValue }));
  }, []);

  const handleSave = () => {
    onSave(itemId, editedCosts);
    setIsOpen(false);
  };

  const handleCopyFromItem = (sourceItemId: string) => {
    if (onCopyFrom) {
      const copiedCosts = onCopyFrom(sourceItemId);
      if (copiedCosts) {
        setEditedCosts(copiedCosts);
        toast.success("تم نسخ التكاليف بنجاح");
      }
    }
  };

  const handleSaveAsTemplate = () => {
    if (onSaveAsTemplate && newTemplateName.trim()) {
      onSaveAsTemplate(editedCosts, newTemplateName.trim());
      setNewTemplateName("");
      setShowNewTemplateInput(false);
      toast.success("تم حفظ القالب بنجاح");
    } else if (!newTemplateName.trim()) {
      toast.error("يرجى إدخال اسم للقالب");
    }
  };

  const handleApplyTemplate = (templateId?: string) => {
    if (onApplyTemplate) {
      const templateCosts = onApplyTemplate(templateId);
      if (templateCosts) {
        setEditedCosts(templateCosts);
        toast.success("تم تطبيق القالب بنجاح");
      } else {
        toast.error("لا يوجد قالب محفوظ");
      }
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (onDeleteTemplate) {
      onDeleteTemplate(templateId);
      toast.success("تم حذف القالب بنجاح");
    }
  };

  const filteredAvailableItems = availableItems.filter(
    item => item.itemId !== itemId && item.calculatedUnitPrice > 0
  );

  const handleCancel = () => {
    setEditedCosts(currentCosts);
    setIsOpen(false);
  };

  const formatNumber = (num: number) => num.toLocaleString('ar-SA', { maximumFractionDigits: 2 });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-7 px-2">
          <Edit2 className="w-3 h-3" />
          <span className="text-xs">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Cost Calculator
          </DialogTitle>
          <DialogDescription className="text-sm">
            {itemDescription}
          </DialogDescription>
        </DialogHeader>

        {/* AI Suggested Rate Display */}
        {calculatedCosts.aiSuggestedRate && calculatedCosts.aiSuggestedRate > 0 && (
          <Card className="border-dashed border-purple-500/50 bg-purple-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="font-semibold text-sm">AI Suggested Rate</span>
                </div>
                <Badge variant="secondary" className="text-purple-600">
                  {calculatedCosts.aiSuggestedRate.toLocaleString()} {currency}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Template Actions - Updated for multiple templates */}
        <Card className="border-dashed border-accent/50 bg-accent/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileDown className="w-4 h-4 text-accent-foreground" />
              <h4 className="font-semibold text-sm">قوالب التكاليف</h4>
              <Badge variant="secondary" className="ml-auto text-xs">
                {savedTemplates.length} قالب
              </Badge>
            </div>
            
            {/* Existing Templates List */}
            {savedTemplates.length > 0 && (
              <ScrollArea className="h-24 mb-3 border rounded p-2">
                <div className="space-y-1">
                  {savedTemplates.map((template) => (
                    <div 
                      key={template.id} 
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-sm"
                    >
                      <span className="font-medium truncate flex-1">{template.name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApplyTemplate(template.id)}
                          className="h-6 px-2"
                        >
                          <FileUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="h-6 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* New Template Input */}
            {showNewTemplateInput ? (
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="اسم القالب..."
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveAsTemplate}
                  className="h-8 px-3"
                >
                  <Save className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewTemplateInput(false);
                    setNewTemplateName("");
                  }}
                  className="h-8 px-3"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewTemplateInput(true)}
                className="w-full gap-1"
              >
                <Plus className="w-3 h-3" />
                حفظ كقالب جديد
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Copy From Section */}
        {filteredAvailableItems.length > 0 && (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Copy className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">نسخ التكاليف من بند آخر</h4>
              </div>
              <div className="flex gap-2">
                <Select onValueChange={handleCopyFromItem}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="اختر بند للنسخ منه..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAvailableItems.map((item) => (
                      <SelectItem key={item.itemId} value={item.itemId}>
                        <div className="flex items-center justify-between gap-4">
                          <span className="truncate max-w-[200px]">{item.description}</span>
                          <Badge variant="secondary" className="text-xs">
                            {item.calculatedUnitPrice.toLocaleString('ar-SA')} {currency}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6 py-4">
          {/* Labor Costs */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-green-500" />
                <h4 className="font-semibold text-sm">Labor Costs</h4>
                <Badge variant="outline" className="ml-auto">
                  {formatNumber(liveCalculated.totalLabor)} {currency}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">General Labor</Label>
                  <Input
                    type="number"
                    value={editedCosts.generalLabor || ""}
                    onChange={(e) => handleInputChange("generalLabor", e.target.value)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Equipment Operator</Label>
                  <Input
                    type="number"
                    value={editedCosts.equipmentOperator || ""}
                    onChange={(e) => handleInputChange("equipmentOperator", e.target.value)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials & Equipment (Optional) */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <h4 className="font-semibold text-sm">Direct Costs</h4>
                <Badge variant="outline" className="ml-auto">
                  {formatNumber(liveCalculated.totalDirect)} {currency}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Materials</Label>
                  <Input
                    type="number"
                    value={editedCosts.materials || ""}
                    onChange={(e) => handleInputChange("materials", e.target.value)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Equipment</Label>
                  <Input
                    type="number"
                    value={editedCosts.equipment || ""}
                    onChange={(e) => handleInputChange("equipment", e.target.value)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Subcontractor</Label>
                  <Input
                    type="number"
                    value={editedCosts.subcontractor || ""}
                    onChange={(e) => handleInputChange("subcontractor", e.target.value)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Indirect Costs */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-orange-500" />
                <h4 className="font-semibold text-sm">Indirect Costs</h4>
                <Badge variant="outline" className="ml-auto">
                  {formatNumber(liveCalculated.totalIndirect)} {currency}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Overhead</Label>
                  <Input
                    type="number"
                    value={editedCosts.overhead || ""}
                    onChange={(e) => handleInputChange("overhead", e.target.value)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Admin</Label>
                  <Input
                    type="number"
                    value={editedCosts.admin || ""}
                    onChange={(e) => handleInputChange("admin", e.target.value)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Insurance</Label>
                  <Input
                    type="number"
                    value={editedCosts.insurance || ""}
                    onChange={(e) => handleInputChange("insurance", e.target.value)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Contingency</Label>
                  <Input
                    type="number"
                    value={editedCosts.contingency || ""}
                    onChange={(e) => handleInputChange("contingency", e.target.value)}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profit Margin */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <h4 className="font-semibold text-sm">Profit Margin</h4>
                <Badge variant="outline" className="ml-auto">
                  {formatNumber(liveCalculated.profitAmount)} {currency}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Profit Margin (%)</Label>
                  <Input
                    type="number"
                    value={editedCosts.profitMargin || ""}
                    onChange={(e) => handleInputChange("profitMargin", e.target.value)}
                    placeholder="10"
                    className="h-9"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calculated Unit Price Summary */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  <h4 className="font-bold">Calculated Unit Price</h4>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatNumber(liveCalculated.calculatedUnitPrice)} {currency}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatNumber(liveCalculated.calculatedUnitPrice * quantity)} {currency}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
