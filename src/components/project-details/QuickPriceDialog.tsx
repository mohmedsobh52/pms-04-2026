import { useState, useMemo } from "react";
import { DollarSign, Search, CheckCircle, Loader2, Library } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMaterialPrices } from "@/hooks/useMaterialPrices";
import { useLaborRates } from "@/hooks/useLaborRates";
import { useEquipmentRates } from "@/hooks/useEquipmentRates";
import { ProjectItem } from "./types";

interface QuickPriceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProjectItem | null;
  onApplyPrice: (price: number) => Promise<void>;
  isArabic: boolean;
  currency: string;
}

export function QuickPriceDialog({
  isOpen,
  onClose,
  item,
  onApplyPrice,
  isArabic,
  currency,
}: QuickPriceDialogProps) {
  const [manualPrice, setManualPrice] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { materials, findAllMatchingPrices } = useMaterialPrices();
  const { laborRates } = useLaborRates();
  const { equipmentRates } = useEquipmentRates();

  // Get suggestions based on item description
  const materialSuggestions = useMemo(() => {
    if (!item?.description) return [];
    return findAllMatchingPrices(item.description, item.category || undefined, 5);
  }, [item, findAllMatchingPrices]);

  // Filter labor rates
  const laborSuggestions = useMemo(() => {
    if (!item?.description) return [];
    const descLower = item.description.toLowerCase();
    const searchTerms = descLower.split(/[\s,،.-]+/).filter(t => t.length > 2);
    
    return laborRates.filter(labor => {
      const laborText = `${labor.name} ${labor.name_ar || ""} ${labor.category || ""}`.toLowerCase();
      return searchTerms.some(term => laborText.includes(term));
    }).slice(0, 5);
  }, [item, laborRates]);

  // Filter equipment rates
  const equipmentSuggestions = useMemo(() => {
    if (!item?.description) return [];
    const descLower = item.description.toLowerCase();
    const searchTerms = descLower.split(/[\s,،.-]+/).filter(t => t.length > 2);
    
    return equipmentRates.filter(equip => {
      const equipText = `${equip.name} ${equip.name_ar || ""} ${equip.category || ""}`.toLowerCase();
      return searchTerms.some(term => equipText.includes(term));
    }).slice(0, 5);
  }, [item, equipmentRates]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return { materials: [], labor: [], equipment: [] };
    const query = searchQuery.toLowerCase();
    
    return {
      materials: materials.filter(m => 
        m.name.toLowerCase().includes(query) || 
        (m.name_ar || "").toLowerCase().includes(query)
      ).slice(0, 5),
      labor: laborRates.filter(l => 
        l.name.toLowerCase().includes(query) || 
        (l.name_ar || "").toLowerCase().includes(query)
      ).slice(0, 5),
      equipment: equipmentRates.filter(e => 
        e.name.toLowerCase().includes(query) || 
        (e.name_ar || "").toLowerCase().includes(query)
      ).slice(0, 5),
    };
  }, [searchQuery, materials, laborRates, equipmentRates]);

  const handleApply = async () => {
    const price = parseFloat(manualPrice);
    if (isNaN(price) || price <= 0) return;
    
    setIsApplying(true);
    try {
      await onApplyPrice(price);
      setManualPrice("");
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleSelectPrice = (price: number) => {
    setManualPrice(price.toString());
  };

  const hasSuggestions = materialSuggestions.length > 0 || laborSuggestions.length > 0 || equipmentSuggestions.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            {isArabic ? "تسعير سريع" : "Quick Price"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {item?.item_number}: {item?.description?.slice(0, 60)}...
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              {isArabic ? "إدخال يدوي" : "Manual Entry"}
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-1">
              <Library className="w-3 h-3" />
              {isArabic ? "من المكتبة" : "From Library"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{isArabic ? "سعر الوحدة" : "Unit Price"}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder={isArabic ? "أدخل السعر..." : "Enter price..."}
                  className="flex-1"
                />
                <span className="flex items-center px-3 bg-muted rounded-md text-sm">
                  {currency}
                </span>
              </div>
            </div>
            
            {item?.quantity && manualPrice && parseFloat(manualPrice) > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isArabic ? "الكمية:" : "Quantity:"}</span>
                  <span>{item.quantity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium mt-1">
                  <span className="text-muted-foreground">{isArabic ? "الإجمالي:" : "Total:"}</span>
                  <span>{currency} {(item.quantity * parseFloat(manualPrice)).toLocaleString()}</span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="library" className="space-y-4 pt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isArabic ? "بحث في المكتبة..." : "Search library..."}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[250px]">
              {/* Suggestions */}
              {!searchQuery && hasSuggestions && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">
                    {isArabic ? "اقتراحات بناءً على الوصف:" : "Suggestions based on description:"}
                  </p>
                  
                  {materialSuggestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{isArabic ? "مواد:" : "Materials:"}</p>
                      {materialSuggestions.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleSelectPrice(m.unit_price)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-left text-sm"
                        >
                          <div>
                            <p className="font-medium">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.name_ar}</p>
                          </div>
                          <Badge variant="outline">{currency} {m.unit_price.toLocaleString()}</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {laborSuggestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{isArabic ? "عمالة:" : "Labor:"}</p>
                      {laborSuggestions.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => handleSelectPrice(l.unit_rate)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-left text-sm"
                        >
                          <div>
                            <p className="font-medium">{l.name}</p>
                            <p className="text-xs text-muted-foreground">{l.name_ar}</p>
                          </div>
                          <Badge variant="outline">{currency} {l.unit_rate.toLocaleString()}</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {equipmentSuggestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{isArabic ? "معدات:" : "Equipment:"}</p>
                      {equipmentSuggestions.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => handleSelectPrice(e.rental_rate)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-left text-sm"
                        >
                          <div>
                            <p className="font-medium">{e.name}</p>
                            <p className="text-xs text-muted-foreground">{e.name_ar}</p>
                          </div>
                          <Badge variant="outline">{currency} {e.rental_rate.toLocaleString()}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search Results */}
              {searchQuery && (
                <div className="space-y-3">
                  {searchResults.materials.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">{isArabic ? "مواد:" : "Materials:"}</p>
                      {searchResults.materials.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleSelectPrice(m.unit_price)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-left text-sm"
                        >
                          <div>
                            <p className="font-medium">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.name_ar}</p>
                          </div>
                          <Badge variant="outline">{currency} {m.unit_price.toLocaleString()}</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.labor.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">{isArabic ? "عمالة:" : "Labor:"}</p>
                      {searchResults.labor.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => handleSelectPrice(l.unit_rate)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-left text-sm"
                        >
                          <div>
                            <p className="font-medium">{l.name}</p>
                            <p className="text-xs text-muted-foreground">{l.name_ar}</p>
                          </div>
                          <Badge variant="outline">{currency} {l.unit_rate.toLocaleString()}</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.equipment.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">{isArabic ? "معدات:" : "Equipment:"}</p>
                      {searchResults.equipment.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => handleSelectPrice(e.rental_rate)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-left text-sm"
                        >
                          <div>
                            <p className="font-medium">{e.name}</p>
                            <p className="text-xs text-muted-foreground">{e.name_ar}</p>
                          </div>
                          <Badge variant="outline">{currency} {e.rental_rate.toLocaleString()}</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.materials.length === 0 && 
                   searchResults.labor.length === 0 && 
                   searchResults.equipment.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {isArabic ? "لا توجد نتائج" : "No results found"}
                    </p>
                  )}
                </div>
              )}

              {!searchQuery && !hasSuggestions && (
                <p className="text-center text-muted-foreground py-8">
                  {isArabic 
                    ? "لا توجد اقتراحات - استخدم البحث أو أدخل السعر يدوياً"
                    : "No suggestions - use search or enter price manually"
                  }
                </p>
              )}
            </ScrollArea>

            {/* Selected price display */}
            {manualPrice && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{isArabic ? "السعر المختار:" : "Selected price:"}</span>
                  <span className="font-bold">{currency} {parseFloat(manualPrice).toLocaleString()}</span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={!manualPrice || parseFloat(manualPrice) <= 0 || isApplying}
            className="gap-2"
          >
            {isApplying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isArabic ? "تطبيق السعر" : "Apply Price"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
