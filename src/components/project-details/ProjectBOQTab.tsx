import { useState } from "react";
import {
  Package, Search, Filter, Download, Trash2, Plus, Wand2, RefreshCw,
  ArrowUpDown, Hash, FileText, CheckCircle, MoreVertical, DollarSign,
  Edit, XCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectItem, PricingStats } from "./types";

interface ProjectBOQTabProps {
  items: ProjectItem[];
  filteredItems: ProjectItem[];
  displayedItems: ProjectItem[];
  pricingStats: PricingStats;
  selectedItems: Set<string>;
  itemsSearch: string;
  sortMode: 'file_order' | 'item_number';
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  startIndex: number;
  zeroQuantityCount: number;
  isAutoPricing: boolean;
  isArabic: boolean;
  currency: string;
  onSearchChange: (value: string) => void;
  onSortModeChange: (mode: 'file_order' | 'item_number') => void;
  onSelectedItemsChange: (items: Set<string>) => void;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (value: string) => void;
  onAutoPricing: () => void;
  onAddItem: () => void;
  onQuickPrice: (itemId: string) => void;
  onDetailedPrice: (item: ProjectItem) => void;
  onEditItem: (item: ProjectItem) => void;
  onDeleteItem: (itemId: string) => void;
  onUnconfirmItem: (itemId: string) => void;
  onDeleteZeroQuantityItems: () => void;
  formatCurrency: (value: number) => string;
}

export function ProjectBOQTab({
  items,
  filteredItems,
  displayedItems,
  pricingStats,
  selectedItems,
  itemsSearch,
  sortMode,
  currentPage,
  itemsPerPage,
  totalPages,
  startIndex,
  zeroQuantityCount,
  isAutoPricing,
  isArabic,
  currency,
  onSearchChange,
  onSortModeChange,
  onSelectedItemsChange,
  onPageChange,
  onItemsPerPageChange,
  onAutoPricing,
  onAddItem,
  onQuickPrice,
  onDetailedPrice,
  onEditItem,
  onDeleteItem,
  onUnconfirmItem,
  onDeleteZeroQuantityItems,
  formatCurrency,
}: ProjectBOQTabProps) {
  const effectiveItemsPerPage = itemsPerPage >= filteredItems.length ? filteredItems.length : itemsPerPage;

  return (
    <div className="space-y-4">
      {/* Statistics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{pricingStats.totalItems}</p>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "إجمالي البنود" : "Total Items"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{pricingStats.pricedItems}</p>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "بنود مسعرة" : "Priced Items"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{pricingStats.confirmedItems}</p>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "بنود مؤكدة" : "Confirmed Items"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {currency} {formatCurrency(pricingStats.totalValue)}
            </p>
            <p className="text-sm text-muted-foreground">
              {isArabic ? "إجمالي القيمة" : "Total Value"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {isArabic ? "تقدم التسعير" : "Pricing Progress"}
            </span>
            <span className="text-sm font-bold">{pricingStats.pricingPercentage}%</span>
          </div>
          <Progress value={pricingStats.pricingPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* BOQ Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {isArabic ? "جدول الكميات" : "Bill of Quantities"}
              <Badge variant="secondary">{items.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap project-actions-section">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? "بحث في البنود..." : "Search items..."}
                  value={itemsSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9 w-48 md:w-64"
                />
              </div>
              {/* Sort Mode Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    {sortMode === 'file_order' 
                      ? (isArabic ? "ترتيب الملف" : "File Order")
                      : (isArabic ? "ترتيب رقمي" : "Numeric Order")
                    }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isArabic ? "start" : "end"} className="bg-popover">
                  <DropdownMenuItem 
                    onClick={() => onSortModeChange('file_order')}
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {isArabic ? "ترتيب الملف الأصلي" : "Original File Order"}
                    {sortMode === 'file_order' && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onSortModeChange('item_number')}
                    className="gap-2"
                  >
                    <Hash className="w-4 h-4" />
                    {isArabic ? "ترتيب حسب رقم البند" : "Sort by Item Number"}
                    {sortMode === 'item_number' && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="gap-2 text-destructive hover:text-destructive"
                onClick={onDeleteZeroQuantityItems}
                disabled={zeroQuantityCount === 0}
              >
                <Trash2 className="w-4 h-4" />
                {isArabic ? "مسح الكميات الصفرية" : "Delete Zero Qty"}
                {zeroQuantityCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {zeroQuantityCount}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={onAutoPricing}
                disabled={isAutoPricing || pricingStats.unpricedItems === 0}
              >
                {isAutoPricing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {isArabic ? "تسعير تلقائي" : "Auto Price"}
              </Button>
              <Button 
                className="gap-2"
                onClick={onAddItem}
              >
                <Plus className="w-4 h-4" />
                {isArabic ? "إضافة بند" : "Add Item"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onSelectedItemsChange(new Set(filteredItems.map(i => i.id)));
                        } else {
                          onSelectedItemsChange(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-[100px]">{isArabic ? "رقم البند" : "Item No."}</TableHead>
                  <TableHead>{isArabic ? "الوصف" : "Description"}</TableHead>
                  <TableHead className="w-[80px]">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                  <TableHead className="w-[100px] text-right">{isArabic ? "الكمية" : "Qty"}</TableHead>
                  <TableHead className="w-[120px] text-right">{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                  <TableHead className="w-[140px] text-right">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                  <TableHead className="w-[100px]">{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {isArabic ? "لا توجد بنود" : "No items found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedItems);
                            if (checked) newSet.add(item.id);
                            else newSet.delete(item.id);
                            onSelectedItemsChange(newSet);
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm whitespace-nowrap">{item.item_number}</TableCell>
                      <TableCell className="min-w-[350px] max-w-[500px] whitespace-pre-wrap break-words text-sm leading-relaxed">{item.description || '-'}</TableCell>
                      <TableCell>{item.unit || '-'}</TableCell>
                      <TableCell className="text-right">{item.quantity?.toLocaleString() || '-'}</TableCell>
                      <TableCell className="text-right">
                        {item.unit_price && item.unit_price > 0 ? formatCurrency(item.unit_price) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.total_price && item.total_price > 0 ? formatCurrency(item.total_price) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.unit_price && item.unit_price > 0 ? "default" : "secondary"}
                          className={item.unit_price && item.unit_price > 0 
                            ? "bg-green-500/10 text-green-600 border-green-500/20" 
                            : ""}
                        >
                          {item.unit_price && item.unit_price > 0 
                            ? (isArabic ? "مسعر" : "Priced") 
                            : (isArabic ? "غير مسعر" : "Unpriced")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isArabic ? "start" : "end"}>
                            <DropdownMenuItem 
                              onClick={() => onQuickPrice(item.id)}
                              className="gap-2"
                            >
                              <DollarSign className="w-4 h-4" />
                              {isArabic ? "تسعير سريع" : "Quick Price"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDetailedPrice(item)}
                              className="gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              {isArabic ? "تسعير مفصل" : "Detailed Price"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onEditItem(item)}
                              className="gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              {isArabic ? "تعديل" : "Edit"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onUnconfirmItem(item.id)}
                              className="gap-2"
                              disabled={!item.unit_price || item.unit_price === 0}
                            >
                              <XCircle className="w-4 h-4" />
                              {isArabic ? "إلغاء التحقق" : "Clear Price"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => onDeleteItem(item.id)}
                              className="gap-2 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                              {isArabic ? "حذف" : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between mt-4 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {isArabic 
                    ? `عرض ${startIndex + 1}-${Math.min(startIndex + effectiveItemsPerPage, filteredItems.length)} من ${filteredItems.length} بند` 
                    : `Showing ${startIndex + 1}-${Math.min(startIndex + effectiveItemsPerPage, filteredItems.length)} of ${filteredItems.length} items`}
                </p>
                
                {/* Items Per Page Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {isArabic ? "بنود/صفحة:" : "Per page:"}
                  </span>
                  <Select
                    value={itemsPerPage >= filteredItems.length && itemsPerPage > 200 ? "all" : itemsPerPage.toString()}
                    onValueChange={onItemsPerPageChange}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    {isArabic ? "السابق" : "Previous"}
                  </Button>
                  <span className="text-sm">
                    {isArabic ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    {isArabic ? "التالي" : "Next"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
