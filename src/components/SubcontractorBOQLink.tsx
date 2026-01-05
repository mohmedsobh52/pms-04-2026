import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import { useToast } from "@/hooks/use-toast";
import { 
  Link2, 
  Users, 
  Package, 
  Search, 
  CheckCircle,
  Building2,
  Plus,
  Trash2
} from "lucide-react";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

interface Subcontractor {
  id: string;
  name: string;
  specialty: string | null;
  status: string;
}

interface BOQSubcontractorLink {
  id: string;
  boq_item_number: string;
  subcontractor_id: string;
  allocation_percentage: number;
  notes?: string;
  subcontractor?: Subcontractor;
}

interface SubcontractorBOQLinkProps {
  boqItems: BOQItem[];
  projectId?: string;
}

export function SubcontractorBOQLink({ boqItems, projectId }: SubcontractorBOQLinkProps) {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [links, setLinks] = useState<Map<string, BOQSubcontractorLink[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<string>("");
  const [allocationPercentage, setAllocationPercentage] = useState("100");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: subData } = await supabase
        .from("subcontractors")
        .select("*")
        .eq("status", "active")
        .order("name");
      
      if (subData) setSubcontractors(subData);
      
      // Load links from localStorage for now (could be moved to DB)
      const savedLinks = localStorage.getItem(`boq_subcontractor_links_${projectId || 'default'}`);
      if (savedLinks) {
        const parsed = JSON.parse(savedLinks);
        const linkMap = new Map<string, BOQSubcontractorLink[]>();
        Object.entries(parsed).forEach(([key, value]) => {
          linkMap.set(key, value as BOQSubcontractorLink[]);
        });
        setLinks(linkMap);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveLinks = (newLinks: Map<string, BOQSubcontractorLink[]>) => {
    const obj: Record<string, BOQSubcontractorLink[]> = {};
    newLinks.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem(`boq_subcontractor_links_${projectId || 'default'}`, JSON.stringify(obj));
    setLinks(newLinks);
  };

  const handleLinkItems = () => {
    if (!selectedSubcontractor || selectedItems.size === 0) return;

    const subcontractor = subcontractors.find(s => s.id === selectedSubcontractor);
    if (!subcontractor) return;

    const newLinks = new Map(links);
    
    selectedItems.forEach(itemNumber => {
      const existing = newLinks.get(itemNumber) || [];
      const alreadyLinked = existing.some(l => l.subcontractor_id === selectedSubcontractor);
      
      if (!alreadyLinked) {
        existing.push({
          id: `${itemNumber}_${selectedSubcontractor}_${Date.now()}`,
          boq_item_number: itemNumber,
          subcontractor_id: selectedSubcontractor,
          allocation_percentage: parseFloat(allocationPercentage) || 100,
          subcontractor: subcontractor
        });
        newLinks.set(itemNumber, existing);
      }
    });

    saveLinks(newLinks);
    setSelectedItems(new Set());
    setShowLinkDialog(false);
    
    toast({
      title: isArabic ? "تم الربط" : "Linked",
      description: isArabic 
        ? `تم ربط ${selectedItems.size} بند بالمقاول ${subcontractor.name}`
        : `Linked ${selectedItems.size} items to ${subcontractor.name}`
    });
  };

  const handleUnlink = (itemNumber: string, linkId: string) => {
    const newLinks = new Map(links);
    const existing = newLinks.get(itemNumber) || [];
    const filtered = existing.filter(l => l.id !== linkId);
    
    if (filtered.length === 0) {
      newLinks.delete(itemNumber);
    } else {
      newLinks.set(itemNumber, filtered);
    }
    
    saveLinks(newLinks);
    
    toast({
      title: isArabic ? "تم إلغاء الربط" : "Unlinked",
      description: isArabic ? "تم إلغاء ربط البند" : "Item unlinked"
    });
  };

  const toggleSelectItem = (itemNumber: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemNumber)) {
      newSelected.delete(itemNumber);
    } else {
      newSelected.add(itemNumber);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.item_number)));
    }
  };

  const filteredItems = boqItems.filter(item => 
    item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.item_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSubcontractorForItem = (itemNumber: string) => {
    const itemLinks = links.get(itemNumber) || [];
    return itemLinks.map(link => {
      const sub = subcontractors.find(s => s.id === link.subcontractor_id);
      return { ...link, subcontractor: sub };
    });
  };

  const linkedItemsCount = Array.from(links.keys()).length;
  const totalAllocation = Array.from(links.values())
    .flat()
    .reduce((sum, link) => {
      const item = boqItems.find(i => i.item_number === link.boq_item_number);
      return sum + ((item?.total_price || 0) * (link.allocation_percentage / 100));
    }, 0);

  if (!user) {
    return (
      <Card className="p-6 text-center">
        <Link2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {isArabic ? "يرجى تسجيل الدخول لربط المقاولين" : "Please login to link subcontractors"}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{boqItems.length}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "إجمالي البنود" : "Total Items"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Link2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{linkedItemsCount}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "بنود مرتبطة" : "Linked Items"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subcontractors.length}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "مقاولين" : "Subcontractors"}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAllocation.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{isArabic ? "قيمة التخصيص" : "Allocated Value"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? "بحث في البنود..." : "Search items..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSelectAll}
        >
          {selectedItems.size === filteredItems.length 
            ? (isArabic ? "إلغاء تحديد الكل" : "Deselect All")
            : (isArabic ? "تحديد الكل" : "Select All")
          }
        </Button>
        
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              disabled={selectedItems.size === 0}
              className="gap-2"
            >
              <Link2 className="w-4 h-4" />
              {isArabic ? `ربط (${selectedItems.size})` : `Link (${selectedItems.size})`}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isArabic ? "ربط البنود بمقاول فرعي" : "Link Items to Subcontractor"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {isArabic ? "المقاول الفرعي" : "Subcontractor"}
                </label>
                <Select value={selectedSubcontractor} onValueChange={setSelectedSubcontractor}>
                  <SelectTrigger>
                    <SelectValue placeholder={isArabic ? "اختر المقاول" : "Select subcontractor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcontractors.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        <div className="flex items-center gap-2">
                          <span>{sub.name}</span>
                          {sub.specialty && (
                            <Badge variant="outline" className="text-xs">{sub.specialty}</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {isArabic ? "نسبة التخصيص %" : "Allocation %"}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={allocationPercentage}
                  onChange={(e) => setAllocationPercentage(e.target.value)}
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                {isArabic 
                  ? `سيتم ربط ${selectedItems.size} بند بالمقاول المحدد`
                  : `${selectedItems.size} items will be linked to the selected subcontractor`
                }
              </div>
              
              <Button onClick={handleLinkItems} className="w-full" disabled={!selectedSubcontractor}>
                {isArabic ? "ربط البنود" : "Link Items"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Items List */}
      <Card>
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-2">
            {filteredItems.map(item => {
              const itemLinks = getSubcontractorForItem(item.item_number);
              const isSelected = selectedItems.has(item.item_number);
              
              return (
                <div 
                  key={item.item_number}
                  className={`p-3 rounded-lg border transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectItem(item.item_number)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium">{item.item_number}</span>
                        {item.category && (
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{item.quantity} {item.unit}</span>
                        {item.total_price && (
                          <span className="font-medium">{item.total_price.toLocaleString()}</span>
                        )}
                      </div>
                      
                      {/* Linked Subcontractors */}
                      {itemLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {itemLinks.map(link => (
                            <Badge 
                              key={link.id} 
                              variant="secondary" 
                              className="gap-1 pr-1"
                            >
                              <Users className="w-3 h-3" />
                              {link.subcontractor?.name || 'Unknown'}
                              <span className="text-xs opacity-70">({link.allocation_percentage}%)</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnlink(item.item_number, link.id);
                                }}
                                className="ml-1 p-0.5 rounded-full hover:bg-destructive/20"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {itemLinks.length > 0 && (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
