import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useColumnMappingTemplates, ColumnMappingTemplate } from '@/hooks/useColumnMappingTemplates';
import { 
  Check, X, RotateCcw, FileSpreadsheet, AlertTriangle, Columns, Table2, ArrowRight,
  Save, Trash2, Download, Upload, GitCompare, Eye, Filter, ArrowDown, ArrowUp
} from 'lucide-react';
import { ExcelBOQItem, reExtractWithMapping } from '@/lib/excel-utils';
import { toast } from 'sonner';

interface ExcelDataPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  items: ExcelBOQItem[];
  onConfirm: (items: ExcelBOQItem[]) => void;
  fileName?: string;
  rawData?: (string | number | undefined)[][];
  detectedHeaderRow?: number;
  columnMapping?: Record<string, number>;
}

const COLUMN_FIELDS = [
  { key: 'itemNo', labelEn: 'Item No.', labelAr: 'رقم البند' },
  { key: 'description', labelEn: 'Description', labelAr: 'الوصف' },
  { key: 'unit', labelEn: 'Unit', labelAr: 'الوحدة' },
  { key: 'quantity', labelEn: 'Quantity', labelAr: 'الكمية' },
  { key: 'unitPrice', labelEn: 'Unit Price', labelAr: 'سعر الوحدة' },
  { key: 'totalPrice', labelEn: 'Total Price', labelAr: 'السعر الإجمالي' },
];

export function ExcelDataPreview({ 
  isOpen, 
  onClose, 
  items: initialItems, 
  onConfirm,
  fileName,
  rawData,
  detectedHeaderRow = 0,
  columnMapping: initialColumnMapping = {}
}: ExcelDataPreviewProps) {
  const { isArabic } = useLanguage();
  const { 
    templates, 
    addTemplate, 
    deleteTemplate, 
    incrementUsage,
    findMatchingTemplate,
    downloadTemplatesFile,
    importFromFile,
  } = useColumnMappingTemplates();
  
  const [editedItems, setEditedItems] = useState<ExcelBOQItem[]>(initialItems);
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'remap' | 'compare'>('preview');
  
  // Column remapping state
  const [customMapping, setCustomMapping] = useState<Record<string, number | undefined>>(initialColumnMapping);
  const [headerRowOffset, setHeaderRowOffset] = useState(detectedHeaderRow);
  
  // Template state
  const [templateName, setTemplateName] = useState('');
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [suggestedTemplate, setSuggestedTemplate] = useState<{ template: { id: string; name: string; mapping: Record<string, number>; headerRowIndex: number }; score: number } | null>(null);
  
  // Refs for scroll navigation
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset when items change
  React.useEffect(() => {
    setEditedItems(initialItems);
    setCustomMapping(initialColumnMapping);
    setHeaderRowOffset(detectedHeaderRow);
  }, [initialItems, initialColumnMapping, detectedHeaderRow]);

  // Auto-detect matching template when headers change
  React.useEffect(() => {
    if (!rawData || rawData.length === 0) return;
    
    const headerRow = rawData[detectedHeaderRow] || [];
    const headerStrings = headerRow.map(h => h?.toString()?.trim() || '').filter(Boolean);
    
    if (headerStrings.length > 0) {
      const match = findMatchingTemplate(headerStrings);
      if (match && match.score > 30) {
        setSuggestedTemplate(match);
      } else {
        setSuggestedTemplate(null);
      }
    }
  }, [rawData, detectedHeaderRow, findMatchingTemplate]);

  const displayItems = useMemo(() => editedItems.slice(0, 50), [editedItems]);

  // Get raw data headers and sample rows
  const rawHeaders = useMemo(() => {
    if (!rawData || rawData.length <= headerRowOffset) return [];
    const headerRow = rawData[headerRowOffset] || [];
    return headerRow.map((h, idx) => ({
      index: idx,
      value: h?.toString()?.trim() || `Column ${idx + 1}`,
    }));
  }, [rawData, headerRowOffset]);

  const rawSampleRows = useMemo(() => {
    if (!rawData) return [];
    return rawData.slice(headerRowOffset + 1, headerRowOffset + 6).filter(r => r && r.length > 0);
  }, [rawData, headerRowOffset]);

  // Comparison data - show raw vs extracted side by side
  const comparisonData = useMemo(() => {
    if (!rawData || editedItems.length === 0) return [];
    
    const dataRows = rawData.slice(headerRowOffset + 1, headerRowOffset + 21);
    return dataRows.map((rawRow, idx) => ({
      rowIndex: idx,
      raw: rawRow,
      extracted: editedItems[idx] || null,
    }));
  }, [rawData, headerRowOffset, editedItems]);

  const stats = useMemo(() => {
    const withDescription = editedItems.filter(i => i.description && i.description.trim().length > 3).length;
    const withQuantity = editedItems.filter(i => i.quantity && i.quantity > 0).length;
    const withPrice = editedItems.filter(i => i.unitPrice && i.unitPrice > 0).length;
    const totalValue = editedItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
    
    return { withDescription, withQuantity, withPrice, totalValue, total: editedItems.length };
  }, [editedItems]);

  const handleStartEdit = (rowIndex: number, field: string, currentValue: string | number | undefined) => {
    setEditingCell({ row: rowIndex, field });
    setEditValue(currentValue?.toString() || '');
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    
    setEditedItems(prev => prev.map((item, idx) => {
      if (idx !== editingCell.row) return item;
      
      const newItem = { ...item };
      const field = editingCell.field as keyof ExcelBOQItem;
      
      if (field === 'quantity' || field === 'unitPrice' || field === 'totalPrice') {
        newItem[field] = parseFloat(editValue) || 0;
      } else {
        (newItem as Record<string, unknown>)[field] = editValue;
      }
      
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? parseFloat(editValue) || 0 : (item.quantity || 0);
        const price = field === 'unitPrice' ? parseFloat(editValue) || 0 : (item.unitPrice || 0);
        newItem.totalPrice = qty * price;
      }
      
      return newItem;
    }));
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    else if (e.key === 'Escape') handleCancelEdit();
  };

  const handleReset = () => {
    setEditedItems(initialItems);
    setEditingCell(null);
    setCustomMapping(initialColumnMapping);
    setHeaderRowOffset(detectedHeaderRow);
  };

  const handleConfirm = () => {
    onConfirm(editedItems);
    onClose();
  };

  const handleDeleteRow = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Delete all rows with zero quantity
  const handleDeleteZeroQuantityRows = () => {
    const zeroQtyCount = editedItems.filter(item => !item.quantity || item.quantity === 0).length;
    if (zeroQtyCount === 0) {
      toast.info(isArabic ? 'لا توجد صفوف بكمية صفر' : 'No rows with zero quantity');
      return;
    }
    
    setEditedItems(prev => prev.filter(item => item.quantity && item.quantity > 0));
    toast.success(
      isArabic 
        ? `تم حذف ${zeroQtyCount} صف بكمية صفر` 
        : `Deleted ${zeroQtyCount} rows with zero quantity`
    );
  };

  // Scroll navigation functions
  const handleScrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  const handleScrollToTop = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Count zero quantity items
  const zeroQuantityCount = useMemo(() => {
    return editedItems.filter(item => !item.quantity || item.quantity === 0).length;
  }, [editedItems]);

  // Apply custom column mapping
  const handleApplyMapping = () => {
    if (!rawData) return;
    
    const cleanMapping: Record<string, number> = {};
    Object.entries(customMapping).forEach(([key, value]) => {
      if (value !== undefined && value !== -1) {
        cleanMapping[key] = value;
      }
    });
    
    const newItems = reExtractWithMapping(rawData, headerRowOffset, cleanMapping);
    setEditedItems(newItems);
    setActiveTab('preview');
    toast.success(isArabic ? `تم استخراج ${newItems.length} بند` : `Extracted ${newItems.length} items`);
  };

  const updateColumnMapping = (field: string, columnIndex: number | undefined) => {
    setCustomMapping(prev => ({ ...prev, [field]: columnIndex }));
  };

  // Template functions
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error(isArabic ? 'أدخل اسم القالب' : 'Enter template name');
      return;
    }
    
    const cleanMapping: Record<string, number> = {};
    Object.entries(customMapping).forEach(([key, value]) => {
      if (value !== undefined && value !== -1) {
        cleanMapping[key] = value;
      }
    });
    
    // Get header signature for smart matching
    const headerRow = rawData?.[headerRowOffset] || [];
    const headerSignature = headerRow.map(h => h?.toString()?.trim() || '').filter(Boolean);
    
    addTemplate(templateName.trim(), cleanMapping, headerRowOffset, headerSignature);
    toast.success(isArabic ? 'تم حفظ القالب بنجاح' : 'Template saved successfully');
    setTemplateName('');
    setShowTemplateInput(false);
  };

  const handleApplyTemplate = (template: ColumnMappingTemplate) => {
    setCustomMapping(template.mapping);
    setHeaderRowOffset(template.headerRowIndex);
    incrementUsage(template.id);
    setSuggestedTemplate(null);
    toast.success(isArabic ? `تم تطبيق القالب: ${template.name}` : `Applied template: ${template.name}`);
  };

  const handleDeleteTemplate = (template: ColumnMappingTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTemplate(template.id);
    toast.success(isArabic ? 'تم حذف القالب' : 'Template deleted');
  };

  // Export/Import handlers
  const handleExportTemplates = () => {
    downloadTemplatesFile();
    toast.success(isArabic ? 'تم تصدير القوالب بنجاح' : 'Templates exported successfully');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const result = await importFromFile(file);
    if (result.success) {
      toast.success(isArabic ? `تم استيراد ${result.count} قالب بنجاح` : `Imported ${result.count} templates successfully`);
    } else {
      toast.error(isArabic ? `فشل الاستيراد: ${result.error}` : `Import failed: ${result.error}`);
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleApplySuggestedTemplate = () => {
    if (suggestedTemplate) {
      handleApplyTemplate(suggestedTemplate.template as ColumnMappingTemplate);
    }
  };

  const renderCell = (item: ExcelBOQItem, field: string, rowIndex: number) => {
    const value = item[field as keyof ExcelBOQItem];
    const isEditing = editingCell?.row === rowIndex && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-xs"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
            <Check className="h-3 w-3 text-success" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
            <X className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      );
    }
    
    const displayValue = typeof value === 'number' 
      ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : value?.toString() || '-';
    
    const isEmpty = !value || (typeof value === 'string' && !value.trim());
    
    return (
      <div 
        className={`cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded text-xs ${isEmpty ? 'text-muted-foreground italic' : ''}`}
        onClick={() => handleStartEdit(rowIndex, field, value)}
        title={isArabic ? 'انقر للتعديل' : 'Click to edit'}
      >
        {isEmpty ? (isArabic ? 'فارغ' : 'Empty') : displayValue}
      </div>
    );
  };

  const hasRemappingData = rawData && rawData.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {isArabic ? 'معاينة البيانات المستخرجة' : 'Preview Extracted Data'}
            {fileName && <Badge variant="secondary" className="text-xs">{fileName}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {hasRemappingData && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'remap' | 'compare')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview" className="gap-2">
                <Table2 className="h-4 w-4" />
                {isArabic ? 'معاينة البيانات' : 'Data Preview'}
              </TabsTrigger>
              <TabsTrigger value="remap" className="gap-2">
                <Columns className="h-4 w-4" />
                {isArabic ? 'إعادة تعيين الأعمدة' : 'Remap Columns'}
              </TabsTrigger>
              <TabsTrigger value="compare" className="gap-2">
                <GitCompare className="h-4 w-4" />
                {isArabic ? 'مقارنة البيانات' : 'Compare Data'}
              </TabsTrigger>
            </TabsList>

            {/* Preview Tab */}
            <TabsContent value="preview" className="flex-1 flex flex-col mt-4">
              {/* Suggested Template Banner */}
              {suggestedTemplate && suggestedTemplate.score > 50 && (
                <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg mb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      {isArabic 
                        ? `تم اكتشاف قالب مطابق: "${suggestedTemplate.template.name}" (${Math.round(suggestedTemplate.score)}% تطابق)`
                        : `Matching template found: "${suggestedTemplate.template.name}" (${Math.round(suggestedTemplate.score)}% match)`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSuggestedTemplate(null)}>
                      {isArabic ? 'تجاهل' : 'Dismiss'}
                    </Button>
                    <Button size="sm" onClick={handleApplySuggestedTemplate}>
                      {isArabic ? 'تطبيق القالب' : 'Apply Template'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Stats and Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b">
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="gap-1">
                    {isArabic ? 'إجمالي البنود' : 'Total Items'}: {stats.total}
                  </Badge>
                  <Badge variant={stats.withDescription === stats.total ? 'default' : 'secondary'} className="gap-1">
                    {isArabic ? 'مع وصف' : 'With Description'}: {stats.withDescription}
                  </Badge>
                  <Badge variant={stats.withQuantity === stats.total ? 'default' : 'secondary'} className="gap-1">
                    {isArabic ? 'مع كمية' : 'With Quantity'}: {stats.withQuantity}
                  </Badge>
                  <Badge variant={stats.withPrice === stats.total ? 'default' : 'secondary'} className="gap-1">
                    {isArabic ? 'مع سعر' : 'With Price'}: {stats.withPrice}
                  </Badge>
                  <Badge variant="outline" className="gap-1 font-bold">
                    {isArabic ? 'القيمة الإجمالية' : 'Total Value'}: {stats.totalValue.toLocaleString()} SAR
                  </Badge>
                </div>
                
                {/* Delete Zero Quantity Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDeleteZeroQuantityRows}
                  className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={zeroQuantityCount === 0}
                >
                  <Filter className="h-4 w-4" />
                  {isArabic 
                    ? `حذف صفوف الكمية صفر (${zeroQuantityCount})` 
                    : `Remove Zero Qty (${zeroQuantityCount})`}
                </Button>
              </div>

              {/* Warnings */}
              {(stats.withDescription < stats.total * 0.5 || stats.withQuantity < stats.total * 0.5) && (
                <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/30 rounded-md text-sm mt-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  <span>
                    {isArabic 
                      ? 'بعض البنود تحتاج مراجعة. انقر على "إعادة تعيين الأعمدة" أو "مقارنة البيانات" للتصحيح.'
                      : 'Some items need review. Click "Remap Columns" or "Compare Data" to correct.'}
                  </span>
                </div>
              )}

              {/* Table with Side Navigation */}
              <div className="relative flex-1 mt-2">
                {/* Side Navigation Buttons */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10 rounded-full shadow-lg border bg-background/95 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground"
                    onClick={handleScrollToTop}
                    title={isArabic ? 'الذهاب للأعلى' : 'Go to top'}
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-10 w-10 rounded-full shadow-lg border bg-background/95 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground"
                    onClick={handleScrollToBottom}
                    title={isArabic ? 'الذهاب للأسفل' : 'Go to bottom'}
                  >
                    <ArrowDown className="h-5 w-5" />
                  </Button>
                </div>
                
                <ScrollArea className="h-[400px] border rounded-md" ref={scrollAreaRef}>
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead className="min-w-[80px]">{isArabic ? 'رقم البند' : 'Item No.'}</TableHead>
                      <TableHead className="min-w-[200px]">{isArabic ? 'الوصف' : 'Description'}</TableHead>
                      <TableHead className="min-w-[60px]">{isArabic ? 'الوحدة' : 'Unit'}</TableHead>
                      <TableHead className="min-w-[80px] text-right">{isArabic ? 'الكمية' : 'Qty'}</TableHead>
                      <TableHead className="min-w-[100px] text-right">{isArabic ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                      <TableHead className="min-w-[100px] text-right">{isArabic ? 'الإجمالي' : 'Total'}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayItems.map((item, index) => (
                      <TableRow key={index} className="group">
                        <TableCell className="text-center text-xs text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>{renderCell(item, 'itemNo', index)}</TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="truncate">{renderCell(item, 'description', index)}</div>
                        </TableCell>
                        <TableCell>{renderCell(item, 'unit', index)}</TableCell>
                        <TableCell className="text-right">{renderCell(item, 'quantity', index)}</TableCell>
                        <TableCell className="text-right">{renderCell(item, 'unitPrice', index)}</TableCell>
                        <TableCell className="text-right">{renderCell(item, 'totalPrice', index)}</TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteRow(index)}
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {editedItems.length > 50 && (
                  <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30">
                    {isArabic 
                      ? `يتم عرض أول 50 بند من ${editedItems.length} بند`
                      : `Showing first 50 of ${editedItems.length} items`}
                  </div>
                )}
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Remap Columns Tab */}
            <TabsContent value="remap" className="flex-1 flex flex-col mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                {isArabic 
                  ? 'اختر العمود المناسب لكل حقل من الملف الأصلي. يمكنك حفظ التعيين كقالب لاستخدامه لاحقاً.'
                  : 'Select the appropriate column for each field. You can save the mapping as a template for future use.'}
              </div>

              {/* Hidden file input for import */}
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />

              {/* Saved Templates with Export/Import */}
              <div className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {isArabic ? 'القوالب المحفوظة' : 'Saved Templates'} ({templates.length})
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleExportTemplates}
                      disabled={templates.length === 0}
                      className="h-7 gap-1 text-xs"
                    >
                      <Download className="h-3 w-3" />
                      {isArabic ? 'تصدير' : 'Export'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleImportClick}
                      className="h-7 gap-1 text-xs"
                    >
                      <Upload className="h-3 w-3" />
                      {isArabic ? 'استيراد' : 'Import'}
                    </Button>
                  </div>
                </div>
                
                {templates.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {templates.map(template => (
                      <Badge 
                        key={template.id}
                        variant="secondary" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors gap-1 pr-1"
                        onClick={() => handleApplyTemplate(template)}
                      >
                        {template.name}
                        <span className="text-xs opacity-60">({template.usageCount})</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-4 w-4 ml-1 hover:bg-destructive/20"
                          onClick={(e) => handleDeleteTemplate(template, e)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? 'لا توجد قوالب محفوظة. احفظ تعيين الأعمدة كقالب لاستخدامه لاحقاً.' : 'No saved templates. Save a column mapping as a template for future use.'}
                  </p>
                )}
              </div>

              {/* Header row selector */}
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">{isArabic ? 'صف العناوين:' : 'Header Row:'}</span>
                <Select value={headerRowOffset.toString()} onValueChange={(v) => setHeaderRowOffset(parseInt(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                      <SelectItem key={i} value={i.toString()}>
                        {isArabic ? `الصف ${i + 1}` : `Row ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Column mapping selectors */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {COLUMN_FIELDS.map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-sm font-medium">{isArabic ? field.labelAr : field.labelEn}</label>
                    <Select 
                      value={customMapping[field.key]?.toString() ?? '-1'} 
                      onValueChange={(v) => updateColumnMapping(field.key, v === '-1' ? undefined : parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isArabic ? 'اختر عمود' : 'Select column'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">{isArabic ? '-- لا شيء --' : '-- None --'}</SelectItem>
                        {rawHeaders.map(header => (
                          <SelectItem key={header.index} value={header.index.toString()}>
                            {header.index + 1}: {header.value.substring(0, 30)}{header.value.length > 30 ? '...' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Raw data preview */}
              <div className="flex-1 border rounded-md overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-sm font-medium border-b">
                  {isArabic ? 'معاينة البيانات الخام (أول 5 صفوف)' : 'Raw Data Preview (First 5 rows)'}
                </div>
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center">#</TableHead>
                        {rawHeaders.map(header => (
                          <TableHead key={header.index} className="min-w-[100px] text-xs">
                            <div className="font-bold text-primary">{header.index + 1}</div>
                            <div className="truncate text-muted-foreground">{header.value}</div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawSampleRows.map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          <TableCell className="text-center text-xs text-muted-foreground">{rowIdx + 1}</TableCell>
                          {rawHeaders.map(header => (
                            <TableCell key={header.index} className="text-xs max-w-[150px]">
                              <div className="truncate">{row[header.index]?.toString() || '-'}</div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2">
                {/* Save template */}
                {showTemplateInput ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={isArabic ? 'اسم القالب...' : 'Template name...'}
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-48"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                    />
                    <Button size="sm" onClick={handleSaveTemplate}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowTemplateInput(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowTemplateInput(true)} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isArabic ? 'حفظ كقالب' : 'Save as Template'}
                  </Button>
                )}

                <Button onClick={handleApplyMapping} className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  {isArabic ? 'تطبيق التعيين' : 'Apply Mapping'}
                </Button>
              </div>
            </TabsContent>

            {/* Compare Tab - Side by Side Comparison */}
            <TabsContent value="compare" className="flex-1 flex flex-col mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                {isArabic 
                  ? 'مقارنة البيانات الأصلية من Excel مع البيانات المستخرجة جنباً إلى جنب للتحقق من صحة الاستخراج.'
                  : 'Compare original Excel data with extracted data side by side to verify extraction accuracy.'}
              </div>

              <ScrollArea className="flex-1 border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-10 text-center border-r">#</TableHead>
                      {/* Original Data Headers */}
                      <TableHead colSpan={rawHeaders.length} className="text-center bg-blue-50 dark:bg-blue-950 border-r">
                        <div className="flex items-center justify-center gap-2">
                          <Eye className="h-4 w-4" />
                          {isArabic ? 'البيانات الأصلية (Excel)' : 'Original Data (Excel)'}
                        </div>
                      </TableHead>
                      {/* Extracted Data Headers */}
                      <TableHead colSpan={6} className="text-center bg-green-50 dark:bg-green-950">
                        <div className="flex items-center justify-center gap-2">
                          <Check className="h-4 w-4" />
                          {isArabic ? 'البيانات المستخرجة' : 'Extracted Data'}
                        </div>
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="w-10 border-r"></TableHead>
                      {/* Original columns */}
                      {rawHeaders.slice(0, 6).map(header => (
                        <TableHead key={`raw-${header.index}`} className="text-xs min-w-[100px] bg-blue-50/50 dark:bg-blue-950/50">
                          <div className="text-primary font-bold">{header.index + 1}</div>
                          <div className="truncate text-muted-foreground">{header.value}</div>
                        </TableHead>
                      ))}
                      <TableHead className="border-r bg-blue-50/50 dark:bg-blue-950/50"></TableHead>
                      {/* Extracted columns */}
                      <TableHead className="text-xs bg-green-50/50 dark:bg-green-950/50">{isArabic ? 'رقم' : 'No.'}</TableHead>
                      <TableHead className="text-xs min-w-[150px] bg-green-50/50 dark:bg-green-950/50">{isArabic ? 'الوصف' : 'Desc'}</TableHead>
                      <TableHead className="text-xs bg-green-50/50 dark:bg-green-950/50">{isArabic ? 'وحدة' : 'Unit'}</TableHead>
                      <TableHead className="text-xs text-right bg-green-50/50 dark:bg-green-950/50">{isArabic ? 'كمية' : 'Qty'}</TableHead>
                      <TableHead className="text-xs text-right bg-green-50/50 dark:bg-green-950/50">{isArabic ? 'سعر' : 'Price'}</TableHead>
                      <TableHead className="text-xs text-right bg-green-50/50 dark:bg-green-950/50">{isArabic ? 'إجمالي' : 'Total'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.map((row, idx) => {
                      const hasExtracted = row.extracted !== null;
                      const descMatch = hasExtracted && row.extracted.description && 
                        row.raw.some(cell => cell?.toString().includes(row.extracted.description?.substring(0, 20) || ''));
                      
                      return (
                        <TableRow key={idx} className={!hasExtracted ? 'bg-red-50/30 dark:bg-red-950/30' : ''}>
                          <TableCell className="text-center text-xs text-muted-foreground border-r">
                            {idx + 1}
                          </TableCell>
                          {/* Original data cells */}
                          {rawHeaders.slice(0, 6).map(header => (
                            <TableCell key={`raw-${header.index}`} className="text-xs max-w-[120px] bg-blue-50/20 dark:bg-blue-950/20">
                              <div className="truncate">{row.raw[header.index]?.toString() || '-'}</div>
                            </TableCell>
                          ))}
                          <TableCell className="border-r bg-blue-50/20 dark:bg-blue-950/20"></TableCell>
                          {/* Extracted data cells */}
                          <TableCell className={`text-xs bg-green-50/20 dark:bg-green-950/20 ${!row.extracted?.itemNo ? 'text-muted-foreground' : ''}`}>
                            {row.extracted?.itemNo || '-'}
                          </TableCell>
                          <TableCell className={`text-xs max-w-[150px] bg-green-50/20 dark:bg-green-950/20 ${!row.extracted?.description ? 'text-destructive' : ''}`}>
                            <div className="truncate" title={row.extracted?.description}>
                              {row.extracted?.description || (isArabic ? 'مفقود!' : 'Missing!')}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs bg-green-50/20 dark:bg-green-950/20">
                            {row.extracted?.unit || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-right bg-green-50/20 dark:bg-green-950/20">
                            {row.extracted?.quantity?.toLocaleString() || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-right bg-green-50/20 dark:bg-green-950/20">
                            {row.extracted?.unitPrice?.toLocaleString() || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-right bg-green-50/20 dark:bg-green-950/20">
                            {row.extracted?.totalPrice?.toLocaleString() || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded"></div>
                  <span>{isArabic ? 'البيانات الأصلية' : 'Original Data'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 dark:bg-green-900 rounded"></div>
                  <span>{isArabic ? 'البيانات المستخرجة' : 'Extracted Data'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 dark:bg-red-900 rounded"></div>
                  <span>{isArabic ? 'بيانات مفقودة' : 'Missing Data'}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Fallback when no raw data */}
        {!hasRemappingData && (
          <>
            <div className="flex flex-wrap gap-3 py-2 border-b">
              <Badge variant="outline" className="gap-1">
                {isArabic ? 'إجمالي البنود' : 'Total Items'}: {stats.total}
              </Badge>
              <Badge variant={stats.withDescription === stats.total ? 'default' : 'secondary'} className="gap-1">
                {isArabic ? 'مع وصف' : 'With Description'}: {stats.withDescription}
              </Badge>
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>{isArabic ? 'رقم البند' : 'Item No.'}</TableHead>
                    <TableHead>{isArabic ? 'الوصف' : 'Description'}</TableHead>
                    <TableHead>{isArabic ? 'الوحدة' : 'Unit'}</TableHead>
                    <TableHead className="text-right">{isArabic ? 'الكمية' : 'Qty'}</TableHead>
                    <TableHead className="text-right">{isArabic ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                    <TableHead className="text-right">{isArabic ? 'الإجمالي' : 'Total'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center text-xs">{index + 1}</TableCell>
                      <TableCell>{renderCell(item, 'itemNo', index)}</TableCell>
                      <TableCell>{renderCell(item, 'description', index)}</TableCell>
                      <TableCell>{renderCell(item, 'unit', index)}</TableCell>
                      <TableCell className="text-right">{renderCell(item, 'quantity', index)}</TableCell>
                      <TableCell className="text-right">{renderCell(item, 'unitPrice', index)}</TableCell>
                      <TableCell className="text-right">{renderCell(item, 'totalPrice', index)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {isArabic ? 'إعادة تعيين' : 'Reset'}
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleConfirm} className="gap-2">
              <Check className="h-4 w-4" />
              {isArabic ? 'تأكيد وتحليل' : 'Confirm & Analyze'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
