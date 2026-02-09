import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Contract {
  id: string;
  contract_file_name: string | null;
  contract_file_url: string | null;
  contract_type: string;
  contract_value: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  project_id: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface AddPartnerContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  contract: Contract | null;
  onSuccess: () => void;
}

export const AddPartnerContractDialog = ({
  open,
  onOpenChange,
  partnerId,
  contract,
  onSuccess,
}: AddPartnerContractDialogProps) => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState({
    contract_file_name: "",
    contract_type: "fixed",
    contract_value: 0,
    currency: "SAR",
    start_date: "",
    end_date: "",
    status: "active",
    notes: "",
    project_id: "",
  });

  useEffect(() => {
    if (open) {
      fetchProjects();
      if (contract) {
        setFormData({
          contract_file_name: contract.contract_file_name || "",
          contract_type: contract.contract_type || "fixed",
          contract_value: contract.contract_value || 0,
          currency: contract.currency || "SAR",
          start_date: contract.start_date || "",
          end_date: contract.end_date || "",
          status: contract.status || "active",
          notes: contract.notes || "",
          project_id: contract.project_id || "",
        });
      } else {
        setFormData({
          contract_file_name: "",
          contract_type: "fixed",
          contract_value: 0,
          currency: "SAR",
          start_date: "",
          end_date: "",
          status: "active",
          notes: "",
          project_id: "",
        });
      }
    }
  }, [open, contract]);

  const fetchProjects = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("saved_projects")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");
    
    setProjects(data || []);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const payload = {
        partner_id: partnerId,
        user_id: user.id,
        contract_file_name: formData.contract_file_name || null,
        contract_type: formData.contract_type,
        contract_value: formData.contract_value,
        currency: formData.currency,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        notes: formData.notes || null,
        project_id: formData.project_id || null,
      };

      if (contract) {
        const { error } = await supabase
          .from("partner_contracts")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", contract.id);

        if (error) throw error;
        toast.success(isArabic ? "تم تحديث العقد" : "Contract updated");
      } else {
        const { error } = await supabase.from("partner_contracts").insert([payload]);

        if (error) throw error;
        toast.success(isArabic ? "تم إضافة العقد" : "Contract added");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving contract:", error);
      toast.error(isArabic ? "خطأ في حفظ العقد" : "Error saving contract");
    } finally {
      setIsSaving(false);
    }
  };

  const contractTypes = [
    { value: "fixed", label: isArabic ? "سعر ثابت" : "Fixed Price" },
    { value: "hourly", label: isArabic ? "بالساعة" : "Hourly" },
    { value: "monthly", label: isArabic ? "شهري" : "Monthly" },
  ];

  const statusOptions = [
    { value: "active", label: isArabic ? "نشط" : "Active" },
    { value: "completed", label: isArabic ? "مكتمل" : "Completed" },
    { value: "cancelled", label: isArabic ? "ملغي" : "Cancelled" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {contract
              ? isArabic
                ? "تعديل العقد"
                : "Edit Contract"
              : isArabic
              ? "إضافة عقد جديد"
              : "Add New Contract"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isArabic ? "اسم الملف" : "File Name"}</Label>
              <Input
                value={formData.contract_file_name}
                onChange={(e) =>
                  setFormData({ ...formData, contract_file_name: e.target.value })
                }
                placeholder={isArabic ? "contract.pdf" : "contract.pdf"}
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "نوع العقد" : "Contract Type"}</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, contract_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isArabic ? "القيمة" : "Value"}</Label>
              <Input
                type="number"
                value={formData.contract_value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contract_value: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "العملة" : "Currency"}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="EGP">EGP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isArabic ? "تاريخ البداية" : "Start Date"}</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "تاريخ النهاية" : "End Date"}</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isArabic ? "المشروع" : "Project"}</Label>
              <Select
                value={formData.project_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, project_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? "اختر مشروع" : "Select project"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isArabic ? "بدون مشروع" : "No project"}</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? "الحالة" : "Status"}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
            {isArabic ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
