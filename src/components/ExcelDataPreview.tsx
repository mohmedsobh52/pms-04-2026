import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { Check, X, Edit2, RotateCcw, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { ExcelBOQItem } from '@/lib/excel-utils';

interface ExcelDataPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  items: ExcelBOQItem[];
  onConfirm: (items: ExcelBOQItem[]) => void;
  fileName?: string;
}

const COLUMN_OPTIONS = [
  { value: 'itemNo', labelEn: 'Item No.', labelAr: 'رقم البند' },
  { value: 'description', labelEn: 'Description', labelAr: 'الوصف' },
  { value: 'unit', labelEn: 'Unit', labelAr: 'الوحدة' },
  { value: 'quantity', labelEn: 'Quantity', labelAr: 'الكمية' },
  { value: 'unitPrice', labelEn: 'Unit Price', labelAr: 'سعر الوحدة' },
  { value: 'totalPrice', labelEn: 'Total Price', labelAr: 'السعر الإجمالي' },
  { value: 'notes', labelEn: 'Notes', labelAr: 'ملاحظات' },
  { value: 'ignore', labelEn: 'Ignore', labelAr: 'تجاهل' },
];

export function ExcelDataPreview({ 
  isOpen, 
  onClose, 
  items: initialItems, 
  onConfirm,
  fileName 
}: ExcelDataPreviewProps) {
  const { isArabic } = useLanguage();
  const [editedItems, setEditedItems] = useState<ExcelBOQItem[]>(initialItems);
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Reset when items change
  React.useEffect(() => {
    setEditedItems(initialItems);
  }, [initialItems]);

  const displayItems = useMemo(() => editedItems.slice(0, 50), [editedItems]);

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
  };

  const handleConfirm = () => {
    onConfirm(editedItems);
    onClose();
  };

  const handleDeleteRow = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index));
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
          <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/30 rounded-md text-sm">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span>
              {isArabic 
                ? 'بعض البنود تحتاج مراجعة. انقر على الخلايا لتعديلها.'
                : 'Some items need review. Click on cells to edit them.'}
            </span>
          </div>
        )}

        {/* Table */}
        <ScrollArea className="flex-1 border rounded-md">
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
