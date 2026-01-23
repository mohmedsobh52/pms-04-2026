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
import { Check, X, Edit2, RotateCcw, FileSpreadsheet, AlertTriangle, Columns, Table2, ArrowRight } from 'lucide-react';
import { ExcelBOQItem, reExtractWithMapping } from '@/lib/excel-utils';

interface ExcelDataPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  items: ExcelBOQItem[];
  onConfirm: (items: ExcelBOQItem[]) => void;
  fileName?: string;
  // New props for column remapping
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
  const [editedItems, setEditedItems] = useState<ExcelBOQItem[]>(initialItems);
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'remap'>('preview');
  
  // Column remapping state
  const [customMapping, setCustomMapping] = useState<Record<string, number | undefined>>(initialColumnMapping);
  const [headerRowOffset, setHeaderRowOffset] = useState(detectedHeaderRow);

  // Reset when items change
  React.useEffect(() => {
    setEditedItems(initialItems);
    setCustomMapping(initialColumnMapping);
    setHeaderRowOffset(detectedHeaderRow);
  }, [initialItems, initialColumnMapping, detectedHeaderRow]);

  const displayItems = useMemo(() => editedItems.slice(0, 50), [editedItems]);

  // Get raw data headers and sample rows for remapping UI
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
      
      // Recalculate total if quantity or unit price changed
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
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
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

  // Apply custom column mapping
  const handleApplyMapping = () => {
    if (!rawData) return;
    
    // Filter out undefined values
    const cleanMapping: Record<string, number> = {};
    Object.entries(customMapping).forEach(([key, value]) => {
      if (value !== undefined && value !== -1) {
        cleanMapping[key] = value;
      }
    });
    
    const newItems = reExtractWithMapping(rawData, headerRowOffset, cleanMapping);
    setEditedItems(newItems);
    setActiveTab('preview');
  };

  const updateColumnMapping = (field: string, columnIndex: number | undefined) => {
    setCustomMapping(prev => ({
      ...prev,
      [field]: columnIndex,
    }));
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
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {isArabic ? 'معاينة البيانات المستخرجة' : 'Preview Extracted Data'}
            {fileName && (
              <Badge variant="secondary" className="text-xs">
                {fileName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {hasRemappingData && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'remap')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview" className="gap-2">
                <Table2 className="h-4 w-4" />
                {isArabic ? 'معاينة البيانات' : 'Data Preview'}
              </TabsTrigger>
              <TabsTrigger value="remap" className="gap-2">
                <Columns className="h-4 w-4" />
                {isArabic ? 'إعادة تعيين الأعمدة' : 'Remap Columns'}
              </TabsTrigger>
            </TabsList>

            {/* Preview Tab */}
            <TabsContent value="preview" className="flex-1 flex flex-col mt-4">
              {/* Stats */}
              <div className="flex flex-wrap gap-3 py-2 border-b">
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

              {/* Warnings */}
              {(stats.withDescription < stats.total * 0.5 || stats.withQuantity < stats.total * 0.5) && (
                <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/30 rounded-md text-sm mt-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  <span>
                    {isArabic 
                      ? 'بعض البنود تحتاج مراجعة. انقر على "إعادة تعيين الأعمدة" لتصحيح تعيين الأعمدة.'
                      : 'Some items need review. Click "Remap Columns" to correct column assignments.'}
                  </span>
                </div>
              )}

              {/* Table */}
              <ScrollArea className="flex-1 border rounded-md mt-2">
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
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>{renderCell(item, 'itemNo', index)}</TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="truncate">
                            {renderCell(item, 'description', index)}
                          </div>
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
            </TabsContent>

            {/* Remap Columns Tab */}
            <TabsContent value="remap" className="flex-1 flex flex-col mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                {isArabic 
                  ? 'اختر العمود المناسب لكل حقل من الملف الأصلي. سيتم إعادة استخراج البيانات بناءً على اختياراتك.'
                  : 'Select the appropriate column for each field from the original file. Data will be re-extracted based on your choices.'}
              </div>

              {/* Header row selector */}
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">
                  {isArabic ? 'صف العناوين:' : 'Header Row:'}
                </span>
                <Select 
                  value={headerRowOffset.toString()} 
                  onValueChange={(v) => setHeaderRowOffset(parseInt(v))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map(i => (
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
                    <label className="text-sm font-medium">
                      {isArabic ? field.labelAr : field.labelEn}
                    </label>
                    <Select 
                      value={customMapping[field.key]?.toString() ?? '-1'} 
                      onValueChange={(v) => updateColumnMapping(field.key, v === '-1' ? undefined : parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isArabic ? 'اختر عمود' : 'Select column'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">
                          {isArabic ? '-- لا شيء --' : '-- None --'}
                        </SelectItem>
                        {rawHeaders.map(header => (
                          <SelectItem key={header.index} value={header.index.toString()}>
                            {header.index + 1}: {header.value.substring(0, 30)}
                            {header.value.length > 30 ? '...' : ''}
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
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {rowIdx + 1}
                          </TableCell>
                          {rawHeaders.map(header => (
                            <TableCell key={header.index} className="text-xs max-w-[150px]">
                              <div className="truncate">
                                {row[header.index]?.toString() || '-'}
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Apply button */}
              <Button onClick={handleApplyMapping} className="gap-2 self-end">
                <ArrowRight className="h-4 w-4" />
                {isArabic ? 'تطبيق التعيين' : 'Apply Mapping'}
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {/* Fallback when no raw data (shouldn't happen normally) */}
        {!hasRemappingData && (
          <>
            {/* Stats */}
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
