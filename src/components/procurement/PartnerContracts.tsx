import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  Plus,
  Search,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { AddPartnerContractDialog } from "./AddPartnerContractDialog";

interface PartnerContract {
  id: string;
  partner_id: string;
  project_id: string | null;
  user_id: string;
  contract_file_name: string | null;
  contract_file_url: string | null;
  contract_type: string;
  contract_value: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  project?: { name: string } | null;
}

interface PartnerContractsProps {
  partnerId: string;
}

export const PartnerContracts = ({ partnerId }: PartnerContractsProps) => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<PartnerContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<PartnerContract | null>(null);

  useEffect(() => {
    if (user && partnerId) {
      fetchContracts();
    }
  }, [user, partnerId]);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from("partner_contracts")
        .select(`
          *,
          project:saved_projects(name)
        `)
        .eq("partner_id", partnerId)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (contractId: string) => {
    try {
      const { error } = await supabase
        .from("partner_contracts")
        .delete()
        .eq("id", contractId);

      if (error) throw error;

      toast.success(isArabic ? "تم حذف العقد" : "Contract deleted");
      fetchContracts();
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error(isArabic ? "خطأ في حذف العقد" : "Error deleting contract");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "d MMM yyyy", {
        locale: isArabic ? ar : enUS,
      });
    } catch {
      return "-";
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency || "SAR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 border-green-500/20",
    completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  const statusLabels: Record<string, string> = {
    active: isArabic ? "نشط" : "Active",
    completed: isArabic ? "مكتمل" : "Completed",
    cancelled: isArabic ? "ملغي" : "Cancelled",
  };

  const filteredContracts = contracts.filter((contract) =>
    contract.contract_file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 card-actions-safe relative">
        <CardTitle className="text-lg font-semibold">
          {isArabic ? "العقود" : "Contracts"}
        </CardTitle>
        <div className="flex items-center gap-2 z-[65]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isArabic ? "بحث..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 w-40 pointer-events-auto"
            />
          </div>
          <Button
            size="sm"
            className="z-[65] pointer-events-auto"
            onClick={() => {
              setSelectedContract(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 me-1" />
            {isArabic ? "إضافة عقد" : "Add Contract"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isArabic ? "لا توجد عقود" : "No contracts yet"}
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? "الملف" : "File"}</TableHead>
                  <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isArabic ? "المشروع" : "Project"}</TableHead>
                  <TableHead>{isArabic ? "القيمة" : "Value"}</TableHead>
                  <TableHead>{isArabic ? "الفترة" : "Period"}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">
                          {contract.contract_file_name || (isArabic ? "عقد" : "Contract")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[contract.status] || ""}
                      >
                        {statusLabels[contract.status] || contract.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contract.project?.name || (isArabic ? "-" : "-")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(contract.contract_value, contract.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[150]">
                          {contract.contract_file_url && (
                            <DropdownMenuItem
                              onClick={() => window.open(contract.contract_file_url!, "_blank")}
                            >
                              <ExternalLink className="w-4 h-4 me-2" />
                              {isArabic ? "فتح الملف" : "Open File"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedContract(contract);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4 me-2" />
                            {isArabic ? "تعديل" : "Edit"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(contract.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 me-2" />
                            {isArabic ? "حذف" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AddPartnerContractDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        partnerId={partnerId}
        contract={selectedContract}
        onSuccess={fetchContracts}
      />
    </Card>
  );
};
