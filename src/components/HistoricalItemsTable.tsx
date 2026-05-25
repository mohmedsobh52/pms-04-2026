import { useState, useMemo } from "react";
import { Plus, Trash2, Save, Download, Search, Edit3, Check, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createWorkbook, addJsonSheet, downloadWorkbook } from "@/lib/exceljs-utils";
import { NormalizedHistoricalItem, createEmptyItem, calculateTotal } from "@/lib/historical-data-utils";
import { addHistoricalSuggestion } from "@/lib/historical-suggestions";

interface HistoricalItemsTableProps {
  items: NormalizedHistoricalItem[];
  onItemsChange: (items: NormalizedHistoricalItem[]) => void;
  fileId?: string; // If provided, saves directly to DB
  projectName?: string;
  readOnly?: boolean;
}

export function HistoricalItemsTable({ items, onItemsChange, fileId, projectName, readOnly = false }: HistoricalItemsTableProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item =>
      item.item_number.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.description_ar.toLowerCase().includes(q) ||
      item.item_code.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const totalValue = useMemo(() => 
    items.reduce((sum, item) => sum + (item.total_price || 0), 0),
    [items]
  );

  const startEdit = (rowId: string, field: string, currentValue: any) => {
    if (readOnly) return;
    setEditingCell({ rowId, field });
    setEditValue(String(currentValue ?? ""));
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const confirmEdit = () => {
    if (!editingCell) return;
    const { rowId, field } = editingCell;

    const updatedItems = items.map(item => {
      if (item.id !== rowId) return item;
      const updated = { ...item };

      if (field === 'quantity' || field === 'unit_price') {
        const numVal = parseFloat(editValue) || 0;
        (updated as any)[field] = numVal;
        updated.total_price = calculateTotal(
          field === 'quantity' ? numVal : updated.quantity,
          field === 'unit_price' ? numVal : updated.unit_price
        );
      } else if (field === 'total_price') {
        updated.total_price = parseFloat(editValue) || 0;
      } else {
        (updated as any)[field] = editValue;
      }
      return updated;
    });

    onItemsChange(updatedItems);
    cancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const addItem = () => {
    onItemsChange([...items, createEmptyItem()]);
  };

  const deleteItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const saveToDatabase = async () => {
    if (!fileId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("historical_pricing_files")
        .update({
          items: items as any,
          items_count: items.length,
          total_value: totalValue,
        })
        .eq("id", fileId);

      if (error) throw error;
      toast({ title: "✅ تم الحفظ", description: `تم تحديث ${items.length} بند بنجاح` });
    } catch (error: any) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const exportToExcel = () => {
    if (items.length === 0) return;
    const exportData = items.map(item => ({
      'Item No': item.item_number,
      'Description': item.description,
      'وصف البند': item.description_ar,
      'Unit': item.unit,
      'Quantity': item.quantity,
      'Unit Price': item.unit_price,
      'Total': item.total_price,
      'Item Code': item.item_code,
    }));

    const wb = createWorkbook();
    addJsonSheet(wb, exportData, 'BOQ Data');
    downloadWorkbook(wb, `${projectName || 'historical_data'}.xlsx`);
    toast({ title: "✅ تم التصدير", description: `تم تصدير ${items.length} بند` });
  };

  const renderCell = (item: NormalizedHistoricalItem, field: keyof NormalizedHistoricalItem) => {
    const isEditing = editingCell?.rowId === item.id && editingCell?.field === field;
    const value = item[field];
    const isNumeric = field === 'quantity' || field === 'unit_price' || field === 'total_price';

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            type={isNumeric ? "number" : "text"}
            step={isNumeric ? "0.01" : undefined}
            className="h-7 text-xs min-w-[60px]"
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={confirmEdit}>
            <Check className="w-3 h-3 text-green-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
            <X className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      );
    }

    const displayValue = isNumeric
      ? (value as number)?.toLocaleString() || '0'
      : String(value || '-');

    return (
      <div
        className={`cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 min-h-[24px] flex items-center group ${!readOnly ? '' : 'cursor-default'}`}
        onClick={() => !readOnly && startEdit(item.id, field, value)}
        title={!readOnly ? "اضغط للتعديل" : undefined}
      >
        <span className="text-xs truncate max-w-[200px]">{displayValue}</span>
        {!readOnly && (
          <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 mr-1 flex-shrink-0" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{items.length} بند</Badge>
          <Badge variant="outline">{totalValue.toLocaleString()} إجمالي</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pr-7 w-[150px]"
            />
          </div>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1 h-8 text-xs">
              <Plus className="w-3 h-3" /> إضافة بند
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1 h-8 text-xs">
            <Download className="w-3 h-3" /> تصدير
          </Button>
          {fileId && !readOnly && (
            <Button size="sm" onClick={saveToDatabase} disabled={isSaving} className="gap-1 h-8 text-xs">
              <Save className="w-3 h-3" /> {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="h-[350px] border rounded-lg">
        <div className="min-w-max">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs whitespace-nowrap px-2 w-[60px]">م</TableHead>
                <TableHead className="text-xs whitespace-nowrap px-2">Description</TableHead>
                <TableHead className="text-xs whitespace-nowrap px-2">وصف البند</TableHead>
                <TableHead className="text-xs whitespace-nowrap px-2 w-[60px]">الوحدة</TableHead>
                <TableHead className="text-xs whitespace-nowrap px-2 w-[80px]">الكمية</TableHead>
                <TableHead className="text-xs whitespace-nowrap px-2 w-[90px]">سعر الوحدة</TableHead>
                <TableHead className="text-xs whitespace-nowrap px-2 w-[90px]">الإجمالي</TableHead>
                <TableHead className="text-xs whitespace-nowrap px-2 w-[80px]">كود البند</TableHead>
                {!readOnly && (
                  <TableHead className="text-xs whitespace-nowrap px-2 w-[80px]"></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={readOnly ? 8 : 9} className="text-center text-muted-foreground text-xs py-8">
                    {searchQuery ? "لا توجد نتائج مطابقة" : "لا توجد بنود"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-2">{renderCell(item, 'item_number')}</TableCell>
                    <TableCell className="px-2">{renderCell(item, 'description')}</TableCell>
                    <TableCell className="px-2">{renderCell(item, 'description_ar')}</TableCell>
                    <TableCell className="px-2">{renderCell(item, 'unit')}</TableCell>
                    <TableCell className="px-2">{renderCell(item, 'quantity')}</TableCell>
                    <TableCell className="px-2">{renderCell(item, 'unit_price')}</TableCell>
                    <TableCell className="px-2">
                      <span className="text-xs font-medium">{(item.total_price ?? 0).toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="px-2">{renderCell(item, 'item_code')}</TableCell>
                    {!readOnly && (
                      <TableCell className="px-1">
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="إضافة كاقتراح سعر"
                            onClick={() => {
                              addHistoricalSuggestion({
                                source_file_id: fileId || "",
                                source_project_name: projectName || "",
                                source_project_date: null,
                                item_number: item.item_number,
                                description: item.description,
                                description_ar: item.description_ar,
                                unit: item.unit,
                                quantity: item.quantity,
                                unit_price: item.unit_price,
                                total_price: item.total_price,
                                currency: "SAR",
                              });
                              toast({ title: "✅ تمت إضافة الاقتراح", description: `${item.description_ar || item.description || item.item_number}` });
                            }}
                          >
                            <Lightbulb className="w-3 h-3 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
