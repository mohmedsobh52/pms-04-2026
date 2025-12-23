import { useState, useMemo } from "react";
import { Scale, Search, TrendingDown, TrendingUp, Minus, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QuotationItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
}

interface Quotation {
  id: string;
  name: string;
  supplier_name?: string;
  items: QuotationItem[];
  currency?: string;
}

interface MatchedItem {
  description: string;
  unit: string;
  quantity: number;
  prices: {
    quotationId: string;
    quotationName: string;
    supplierName?: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  variance: number;
  variancePercentage: number;
}

interface ItemComparisonProps {
  quotations: Quotation[];
  currency?: string;
}

export function ItemComparison({ quotations, currency = "ر.س" }: ItemComparisonProps) {
  const { isArabic } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"variance" | "price" | "name">("variance");
  const [sortDesc, setSortDesc] = useState(true);

  // Match similar items across quotations
  const matchedItems = useMemo(() => {
    const itemMap = new Map<string, MatchedItem>();

    quotations.forEach(quotation => {
      if (!quotation.items) return;

      quotation.items.forEach(item => {
        // Create a normalized key for matching
        const normalizedDesc = item.description?.toLowerCase().trim() || "";
        const key = `${normalizedDesc}-${item.unit}`;

        if (!itemMap.has(key)) {
          itemMap.set(key, {
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            prices: [],
            lowestPrice: Infinity,
            highestPrice: -Infinity,
            averagePrice: 0,
            variance: 0,
            variancePercentage: 0,
          });
        }

        const matchedItem = itemMap.get(key)!;
        const unitPrice = item.unit_price || 0;
        const totalPrice = item.total_price || 0;

        matchedItem.prices.push({
          quotationId: quotation.id,
          quotationName: quotation.name,
          supplierName: quotation.supplier_name,
          unitPrice,
          totalPrice,
        });

        if (unitPrice > 0) {
          matchedItem.lowestPrice = Math.min(matchedItem.lowestPrice, unitPrice);
          matchedItem.highestPrice = Math.max(matchedItem.highestPrice, unitPrice);
        }
      });
    });

    // Calculate averages and variances
    itemMap.forEach((item) => {
      const validPrices = item.prices.filter(p => p.unitPrice > 0);
      if (validPrices.length > 0) {
        const sum = validPrices.reduce((acc, p) => acc + p.unitPrice, 0);
        item.averagePrice = sum / validPrices.length;
        item.variance = item.highestPrice - item.lowestPrice;
        item.variancePercentage = item.lowestPrice > 0 
          ? ((item.variance / item.lowestPrice) * 100) 
          : 0;
      }
      if (item.lowestPrice === Infinity) item.lowestPrice = 0;
      if (item.highestPrice === -Infinity) item.highestPrice = 0;
    });

    // Filter items that appear in multiple quotations
    return Array.from(itemMap.values()).filter(item => item.prices.length > 1);
  }, [quotations]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let items = matchedItems;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    items = [...items].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case "variance":
          aVal = a.variancePercentage;
          bVal = b.variancePercentage;
          break;
        case "price":
          aVal = a.averagePrice;
          bVal = b.averagePrice;
          break;
        default:
          return a.description.localeCompare(b.description) * (sortDesc ? -1 : 1);
      }
      return sortDesc ? bVal - aVal : aVal - bVal;
    });

    return items;
  }, [matchedItems, searchQuery, sortBy, sortDesc]);

  const toggleExpanded = (description: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(description)) {
      newSet.delete(description);
    } else {
      newSet.add(description);
    }
    setExpandedItems(newSet);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getVarianceColor = (percentage: number) => {
    if (percentage > 30) return "text-destructive";
    if (percentage > 15) return "text-amber-500";
    return "text-emerald-500";
  };

  const getVarianceBadge = (percentage: number) => {
    if (percentage > 30) return "destructive";
    if (percentage > 15) return "secondary";
    return "default";
  };

  // Statistics
  const stats = useMemo(() => {
    const totalItems = filteredItems.length;
    const highVarianceItems = filteredItems.filter(i => i.variancePercentage > 30).length;
    const totalPotentialSavings = filteredItems.reduce((sum, item) => {
      return sum + (item.variance * item.quantity);
    }, 0);
    const avgVariance = totalItems > 0 
      ? filteredItems.reduce((sum, i) => sum + i.variancePercentage, 0) / totalItems 
      : 0;

    return { totalItems, highVarianceItems, totalPotentialSavings, avgVariance };
  }, [filteredItems]);

  if (quotations.length < 2) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {isArabic ? "عروض أسعار غير كافية" : "Insufficient Quotations"}
          </h3>
          <p className="text-muted-foreground">
            {isArabic 
              ? "تحتاج على الأقل عرضي أسعار للمقارنة"
              : "You need at least 2 quotations to compare items"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{stats.totalItems}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {isArabic ? "بنود متطابقة" : "Matched Items"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-500">{stats.highVarianceItems}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {isArabic ? "تباين مرتفع" : "High Variance"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-500">
                {formatNumber(stats.totalPotentialSavings)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {isArabic ? "التوفير المحتمل" : "Potential Savings"} ({currency})
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/50 to-secondary/25">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{stats.avgVariance.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground mt-1">
                {isArabic ? "متوسط التباين" : "Avg. Variance"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-5 h-5" />
            {isArabic ? "مقارنة البنود المتشابهة" : "Similar Items Comparison"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={isArabic ? "بحث في البنود..." : "Search items..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "variance" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (sortBy === "variance") setSortDesc(!sortDesc);
                  else setSortBy("variance");
                }}
                className="gap-1"
              >
                {isArabic ? "التباين" : "Variance"}
                {sortBy === "variance" && (sortDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
              </Button>
              <Button
                variant={sortBy === "price" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (sortBy === "price") setSortDesc(!sortDesc);
                  else setSortBy("price");
                }}
                className="gap-1"
              >
                {isArabic ? "السعر" : "Price"}
                {sortBy === "price" && (sortDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
              </Button>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">{isArabic ? "البند" : "Item"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "الوحدة" : "Unit"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "أقل سعر" : "Lowest"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "أعلى سعر" : "Highest"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "الفرق" : "Diff"}</TableHead>
                  <TableHead className="text-center">{isArabic ? "التباين" : "Variance"}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, index) => (
                  <>
                    <TableRow 
                      key={index}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        expandedItems.has(item.description) && "bg-muted/30"
                      )}
                      onClick={() => toggleExpanded(item.description)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="shrink-0">
                            {item.prices.length} {isArabic ? "عروض" : "quotes"}
                          </Badge>
                          <span className="line-clamp-2">{item.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.unit}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-600">
                          <TrendingDown className="w-3 h-3" />
                          {formatNumber(item.lowestPrice)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-destructive">
                          <TrendingUp className="w-3 h-3" />
                          {formatNumber(item.highestPrice)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {formatNumber(item.variance)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getVarianceBadge(item.variancePercentage)}>
                          {item.variancePercentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {expandedItems.has(item.description) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Details */}
                    {expandedItems.has(item.description) && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={7} className="p-4">
                          <div className="space-y-3">
                            <div className="text-sm font-medium text-muted-foreground">
                              {isArabic ? "تفاصيل الأسعار من كل عرض:" : "Price details from each quotation:"}
                            </div>
                            <div className="grid gap-2">
                              {item.prices
                                .sort((a, b) => a.unitPrice - b.unitPrice)
                                .map((price, priceIndex) => {
                                  const isLowest = price.unitPrice === item.lowestPrice;
                                  const isHighest = price.unitPrice === item.highestPrice;
                                  const percentFromLowest = item.lowestPrice > 0 
                                    ? ((price.unitPrice - item.lowestPrice) / item.lowestPrice) * 100 
                                    : 0;

                                  return (
                                    <div 
                                      key={priceIndex}
                                      className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border",
                                        isLowest && "bg-emerald-500/10 border-emerald-500/30",
                                        isHighest && item.prices.length > 1 && "bg-destructive/10 border-destructive/30",
                                        !isLowest && !isHighest && "bg-background"
                                      )}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                          <span className="font-medium">{price.quotationName}</span>
                                          {price.supplierName && (
                                            <span className="text-xs text-muted-foreground">
                                              {price.supplierName}
                                            </span>
                                          )}
                                        </div>
                                        {isLowest && (
                                          <Badge className="bg-emerald-500">
                                            {isArabic ? "الأقل" : "Lowest"}
                                          </Badge>
                                        )}
                                        {isHighest && item.prices.length > 1 && (
                                          <Badge variant="destructive">
                                            {isArabic ? "الأعلى" : "Highest"}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <div className="font-bold">
                                            {formatNumber(price.unitPrice)} {currency}
                                          </div>
                                          {!isLowest && (
                                            <div className="text-xs text-muted-foreground">
                                              +{percentFromLowest.toFixed(1)}% {isArabic ? "من الأقل" : "from lowest"}
                                            </div>
                                          )}
                                        </div>
                                        <div className="w-20">
                                          <Progress 
                                            value={(price.unitPrice / item.highestPrice) * 100} 
                                            className="h-2"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
                              <span>{isArabic ? "متوسط السعر:" : "Average price:"} <strong className="text-foreground">{formatNumber(item.averagePrice)} {currency}</strong></span>
                              <span>{isArabic ? "التوفير المحتمل:" : "Potential savings:"} <strong className="text-emerald-600">{formatNumber(item.variance * item.quantity)} {currency}</strong></span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}

                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery 
                        ? (isArabic ? "لا توجد نتائج للبحث" : "No search results")
                        : (isArabic ? "لا توجد بنود متطابقة بين العروض" : "No matching items found between quotations")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
