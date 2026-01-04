import { useState, useEffect } from "react";
import {
  Link2,
  FileText,
  Package,
  Users,
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Contract {
  id: string;
  contract_number: string;
  contract_title: string;
  contractor_name: string | null;
  contract_value: number | null;
  status: string;
}

interface ProcurementItem {
  id: string;
  boq_item_number: string;
  description: string | null;
  category: string | null;
  estimated_cost: number | null;
  status: string | null;
}

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  category: string | null;
  rate_per_day: number | null;
  status: string | null;
}

interface ContractLinkageProps {
  projectId?: string;
}

export function ContractLinkage({ projectId }: ContractLinkageProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);
  const [resourceItems, setResourceItems] = useState<ResourceItem[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>("");
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkType, setLinkType] = useState<"procurement" | "resource">("procurement");

  // Linked items state (local simulation since we don't have a linkage table)
  const [linkedProcurement, setLinkedProcurement] = useState<Record<string, string[]>>({});
  const [linkedResources, setLinkedResources] = useState<Record<string, string[]>>({});

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch contracts
      const { data: contractsData } = await supabase
        .from("contracts")
        .select("id, contract_number, contract_title, contractor_name, contract_value, status")
        .eq("user_id", user.id);

      setContracts(contractsData || []);

      // Fetch procurement items
      const { data: procurementData } = await supabase
        .from("procurement_items")
        .select("id, boq_item_number, description, category, estimated_cost, status")
        .eq("user_id", user.id);

      setProcurementItems(procurementData || []);

      // Fetch resource items
      const { data: resourceData } = await supabase
        .from("resource_items")
        .select("id, name, type, category, rate_per_day, status")
        .eq("user_id", user.id);

      setResourceItems(resourceData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleLinkProcurement = (contractId: string, itemId: string) => {
    setLinkedProcurement((prev) => ({
      ...prev,
      [contractId]: [...(prev[contractId] || []), itemId],
    }));
    toast({ title: isArabic ? "تم الربط" : "Linked successfully" });
  };

  const handleUnlinkProcurement = (contractId: string, itemId: string) => {
    setLinkedProcurement((prev) => ({
      ...prev,
      [contractId]: (prev[contractId] || []).filter((id) => id !== itemId),
    }));
    toast({ title: isArabic ? "تم إلغاء الربط" : "Unlinked" });
  };

  const handleLinkResource = (contractId: string, itemId: string) => {
    setLinkedResources((prev) => ({
      ...prev,
      [contractId]: [...(prev[contractId] || []), itemId],
    }));
    toast({ title: isArabic ? "تم الربط" : "Linked successfully" });
  };

  const handleUnlinkResource = (contractId: string, itemId: string) => {
    setLinkedResources((prev) => ({
      ...prev,
      [contractId]: (prev[contractId] || []).filter((id) => id !== itemId),
    }));
    toast({ title: isArabic ? "تم إلغاء الربط" : "Unlinked" });
  };

  const getUnlinkedProcurementItems = (contractId: string) => {
    const linked = linkedProcurement[contractId] || [];
    return procurementItems.filter((item) => !linked.includes(item.id));
  };

  const getUnlinkedResourceItems = (contractId: string) => {
    const linked = linkedResources[contractId] || [];
    return resourceItems.filter((item) => !linked.includes(item.id));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { color: string; labelEn: string; labelAr: string }> = {
      active: { color: "bg-green-500", labelEn: "Active", labelAr: "نشط" },
      pending: { color: "bg-yellow-500", labelEn: "Pending", labelAr: "معلق" },
      completed: { color: "bg-blue-500", labelEn: "Completed", labelAr: "مكتمل" },
      draft: { color: "bg-gray-500", labelEn: "Draft", labelAr: "مسودة" },
      available: { color: "bg-green-500", labelEn: "Available", labelAr: "متاح" },
      ordered: { color: "bg-blue-500", labelEn: "Ordered", labelAr: "تم الطلب" },
    };

    const s = statusMap[status || ""] || { color: "bg-gray-500", labelEn: status, labelAr: status };
    return (
      <Badge className={`${s.color} text-white text-xs`}>
        {isArabic ? s.labelAr : s.labelEn}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Link2 className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <CardTitle>
              {isArabic ? "ربط العقود بالمشتريات والموارد" : "Contract Linkage"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isArabic
                ? "ربط العقود ببنود المشتريات والموارد في جدول BOQ"
                : "Link contracts to procurement items and resources"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{isArabic ? "لا توجد عقود مسجلة" : "No contracts recorded"}</p>
          </div>
        ) : (
          <Tabs defaultValue={contracts[0]?.id} className="w-full">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
              {contracts.map((contract) => (
                <TabsTrigger
                  key={contract.id}
                  value={contract.id}
                  className="flex-1 min-w-[150px] text-xs"
                >
                  {contract.contract_number}
                </TabsTrigger>
              ))}
            </TabsList>

            {contracts.map((contract) => {
              const linkedProcItems = (linkedProcurement[contract.id] || [])
                .map((id) => procurementItems.find((p) => p.id === id))
                .filter(Boolean) as ProcurementItem[];
              
              const linkedResItems = (linkedResources[contract.id] || [])
                .map((id) => resourceItems.find((r) => r.id === id))
                .filter(Boolean) as ResourceItem[];

              const totalProcValue = linkedProcItems.reduce(
                (sum, item) => sum + (item.estimated_cost || 0),
                0
              );

              return (
                <TabsContent key={contract.id} value={contract.id} className="space-y-4 mt-4">
                  {/* Contract Info */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{contract.contract_title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {contract.contractor_name || (isArabic ? "غير محدد" : "Not specified")}
                        </p>
                      </div>
                      <div className="text-right">
                        {contract.contract_value && (
                          <div className="text-lg font-bold">
                            {formatCurrency(contract.contract_value)}
                          </div>
                        )}
                        {getStatusBadge(contract.status)}
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Package className="w-4 h-4" />
                        <span className="text-lg font-bold">{linkedProcItems.length}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isArabic ? "بنود مشتريات مرتبطة" : "Linked Procurement"}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 text-purple-600">
                        <Users className="w-4 h-4" />
                        <span className="text-lg font-bold">{linkedResItems.length}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isArabic ? "موارد مرتبطة" : "Linked Resources"}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(totalProcValue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isArabic ? "قيمة المشتريات" : "Procurement Value"}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="text-lg font-bold text-amber-600">
                        {contract.contract_value
                          ? ((totalProcValue / contract.contract_value) * 100).toFixed(0)
                          : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isArabic ? "نسبة التغطية" : "Coverage"}
                      </div>
                    </div>
                  </div>

                  {/* Linked Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Procurement Items */}
                    <div className="border rounded-lg">
                      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span className="font-medium text-sm">
                            {isArabic ? "بنود المشتريات" : "Procurement Items"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => {
                            setSelectedContract(contract.id);
                            setLinkType("procurement");
                            setIsLinkDialogOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          {isArabic ? "ربط" : "Link"}
                        </Button>
                      </div>
                      <div className="p-2 max-h-[300px] overflow-y-auto">
                        {linkedProcItems.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            {isArabic ? "لا توجد بنود مرتبطة" : "No linked items"}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {linkedProcItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded bg-muted/50"
                              >
                                <div>
                                  <div className="text-sm font-medium">{item.boq_item_number}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1">
                                    {item.description}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.estimated_cost && (
                                    <span className="text-xs">
                                      {formatCurrency(item.estimated_cost)}
                                    </span>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleUnlinkProcurement(contract.id, item.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Resource Items */}
                    <div className="border rounded-lg">
                      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span className="font-medium text-sm">
                            {isArabic ? "الموارد" : "Resources"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => {
                            setSelectedContract(contract.id);
                            setLinkType("resource");
                            setIsLinkDialogOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          {isArabic ? "ربط" : "Link"}
                        </Button>
                      </div>
                      <div className="p-2 max-h-[300px] overflow-y-auto">
                        {linkedResItems.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            {isArabic ? "لا توجد موارد مرتبطة" : "No linked resources"}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {linkedResItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded bg-muted/50"
                              >
                                <div>
                                  <div className="text-sm font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.type} • {item.category}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.rate_per_day && (
                                    <span className="text-xs">
                                      {formatCurrency(item.rate_per_day)}/day
                                    </span>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleUnlinkResource(contract.id, item.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {linkType === "procurement"
                ? isArabic
                  ? "ربط بنود المشتريات"
                  : "Link Procurement Items"
                : isArabic
                  ? "ربط الموارد"
                  : "Link Resources"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {linkType === "procurement" ? (
              getUnlinkedProcurementItems(selectedContract).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>{isArabic ? "تم ربط جميع البنود" : "All items are linked"}</p>
                </div>
              ) : (
                getUnlinkedProcurementItems(selectedContract).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium">{item.boq_item_number}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        {item.estimated_cost && (
                          <span className="text-xs">{formatCurrency(item.estimated_cost)}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        handleLinkProcurement(selectedContract, item.id);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )
            ) : getUnlinkedResourceItems(selectedContract).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p>{isArabic ? "تم ربط جميع الموارد" : "All resources are linked"}</p>
              </div>
            ) : (
              getUnlinkedResourceItems(selectedContract).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.type} • {item.category}
                    </div>
                    {item.rate_per_day && (
                      <span className="text-xs">{formatCurrency(item.rate_per_day)}/day</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      handleLinkResource(selectedContract, item.id);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              {isArabic ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
