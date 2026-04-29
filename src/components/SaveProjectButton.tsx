import { useState } from "react";
import { Save, Loader2, AlertTriangle, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CalculatedCosts, ItemCostData } from "@/hooks/useDynamicCostCalculator";

interface BOQItem {
  item_number: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  notes?: string;
}

interface SaveProjectButtonProps {
  items: BOQItem[];
  wbsData?: any;
  summary?: {
    total_items: number;
    total_value?: number;
    categories: string[];
    currency?: string;
  };
  getItemCostData: (itemId: string) => ItemCostData;
  getItemCalculatedCosts: (itemId: string) => CalculatedCosts & { aiSuggestedRate?: number };
  fileName?: string;
  isArabic?: boolean;
}

type SaveStatus = "idle" | "saving" | "success" | "error";

export function SaveProjectButton({
  items,
  wbsData,
  summary,
  getItemCostData,
  getItemCalculatedCosts,
  fileName,
  isArabic = false,
}: SaveProjectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [projectName, setProjectName] = useState(fileName || (isArabic ? "مشروع جديد" : "New Project"));
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateProject, setDuplicateProject] = useState<{ id: string; name: string; updated_at?: string; created_at?: string } | null>(null);
  const [renameMode, setRenameMode] = useState(false);
  const [newName, setNewName] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const isSaving = status === "saving";

  const buildPayloads = () => {
    const totalValue = items.reduce((sum, item) => {
      const calcCosts = getItemCalculatedCosts(item.item_number);
      const effectivePrice = calcCosts.calculatedUnitPrice > 0
        ? calcCosts.calculatedUnitPrice
        : (item.unit_price || 0);
      return sum + (effectivePrice * (item.quantity || 0));
    }, 0);

    const itemPayloads = items.map((item) => {
      const calcCosts = getItemCalculatedCosts(item.item_number);
      const effectivePrice = calcCosts.calculatedUnitPrice > 0
        ? calcCosts.calculatedUnitPrice
        : (item.unit_price || 0);
      return {
        item_number: item.item_number,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: effectivePrice,
        total_price: effectivePrice * (item.quantity || 0),
        category: item.category,
        notes: item.notes,
      };
    });

    const costPayloads = items.map((item) => {
      const c = getItemCostData(item.item_number);
      const calc = getItemCalculatedCosts(item.item_number);
      return {
        item_number: item.item_number,
        general_labor: c.generalLabor || 0,
        equipment_operator: c.equipmentOperator || 0,
        overhead: c.overhead || 0,
        admin: c.admin || 0,
        insurance: c.insurance || 0,
        contingency: c.contingency || 0,
        profit_margin: c.profitMargin || 10,
        materials: c.materials || 0,
        equipment: c.equipment || 0,
        subcontractor: c.subcontractor || 0,
        ai_suggested_rate: c.aiSuggestedRate ?? null,
        calculated_unit_price: calc.calculatedUnitPrice || 0,
      };
    });

    return { totalValue, itemPayloads, costPayloads };
  };

  const callRpc = async (overwriteId: string | null, name: string) => {
    const { totalValue, itemPayloads, costPayloads } = buildPayloads();

    setProgress(20);
    setProgressLabel(isArabic ? "جاري إعداد البيانات..." : "Preparing data...");

    setProgress(50);
    setProgressLabel(
      overwriteId
        ? (isArabic ? "جاري استبدال المشروع..." : "Overwriting project...")
        : (isArabic ? "جاري حفظ المشروع..." : "Saving project...")
    );

    const { data, error } = await supabase.rpc("save_project_with_items" as any, {
      _project_id: overwriteId,
      _name: name,
      _file_name: fileName ?? null,
      _analysis_data: { items, summary } as any,
      _wbs_data: (wbsData ?? null) as any,
      _total_value: totalValue,
      _currency: summary?.currency || "SAR",
      _items: itemPayloads as any,
      _costs: costPayloads as any,
      _overwrite: !!overwriteId,
    });

    if (error) throw error;

    setProgress(100);
    setProgressLabel(isArabic ? "اكتمل الحفظ" : "Save complete");
    return data as unknown as string;
  };

  const performSave = async (overwriteId: string | null, name: string) => {
    setStatus("saving");
    setErrorMsg(null);
    setProgress(5);
    setProgressLabel(isArabic ? "جاري التحقق..." : "Validating...");
    try {
      const projectId = await callRpc(overwriteId, name);

      setStatus("success");
      toast({
        title: isArabic ? "تم الحفظ بنجاح" : "Saved successfully",
        description: isArabic
          ? `تم حفظ "${name}" مع ${items.length} بند`
          : `Saved "${name}" with ${items.length} items`,
      });

      // Notify other pages (SavedProjectsPage) to auto-reload
      window.dispatchEvent(new CustomEvent("projects:updated", { detail: { projectId } }));

      setTimeout(() => {
        setIsOpen(false);
        setStatus("idle");
        setProgress(0);
        setDuplicateProject(null);
        setRenameMode(false);
      }, 800);
    } catch (e: any) {
      console.error("Save error:", e);
      setStatus("error");
      setErrorMsg(e.message || (isArabic ? "حدث خطأ" : "An error occurred"));
      toast({
        title: isArabic ? "فشل الحفظ" : "Save failed",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: isArabic ? "يرجى تسجيل الدخول" : "Sign in required",
        variant: "destructive",
      });
      return;
    }
    const trimmed = projectName.trim();
    if (!trimmed) {
      toast({ title: isArabic ? "اسم المشروع مطلوب" : "Project name required", variant: "destructive" });
      return;
    }

    setStatus("saving");
    setProgress(5);
    setProgressLabel(isArabic ? "البحث عن تكرار..." : "Checking duplicates...");

    try {
      const { data: existing } = await supabase
        .from("saved_projects")
        .select("id, name, created_at, updated_at")
        .eq("user_id", user.id)
        .ilike("name", trimmed);

      if (existing && existing.length > 0) {
        setDuplicateProject(existing[0] as any);
        setNewName(`${trimmed} (${new Date().toLocaleString(isArabic ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })})`);
        setRenameMode(false);
        setDuplicateDialogOpen(true);
        setStatus("idle");
        setProgress(0);
        return;
      }

      await performSave(null, trimmed);
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  };

  const handleOverwriteConfirm = async () => {
    if (!duplicateProject) return;
    setDuplicateDialogOpen(false);
    await performSave(duplicateProject.id, projectName.trim());
  };

  const handleRenameSave = async () => {
    const t = newName.trim();
    if (!t) return;
    setProjectName(t);
    setDuplicateDialogOpen(false);
    await performSave(null, t);
  };

  const formatDate = (s?: string) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleString(isArabic ? "ar-SA" : "en-US");
    } catch {
      return s;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!isSaving) setIsOpen(open); if (!open) { setStatus("idle"); setProgress(0); setErrorMsg(null); } }}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="lg"
            className="gap-2 bg-green-600 hover:bg-green-700 relative z-[60] pointer-events-auto shadow-lg hover:shadow-xl transition-all"
          >
            <Save className="w-5 h-5" />
            {isArabic ? "حفظ المشروع" : "Save Project"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md" dir={isArabic ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5" />
              {isArabic ? "حفظ المشروع في قاعدة البيانات" : "Save Project to Database"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">{isArabic ? "اسم المشروع" : "Project Name"}</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={isArabic ? "أدخل اسم المشروع" : "Enter project name"}
                disabled={isSaving}
                dir={isArabic ? "rtl" : "ltr"}
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
              <p className="font-medium">{isArabic ? "سيتم حفظ:" : "Will save:"}</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>{items.length} {isArabic ? "بند من جدول الكميات" : "BOQ items"}</li>
                <li>{isArabic ? "جميع التكاليف المحسوبة" : "All calculated costs"}</li>
                <li>{isArabic ? "أسعار AI المقترحة" : "AI suggested rates"}</li>
                {wbsData && <li>{isArabic ? "هيكل تجزئة العمل (WBS)" : "WBS structure"}</li>}
              </ul>
            </div>

            {isSaving && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{progressLabel}</span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {status === "success" && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4" />
                {isArabic ? "تم الحفظ بنجاح" : "Saved successfully"}
              </div>
            )}

            {status === "error" && errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="break-all">{errorMsg}</div>
              </div>
            )}

            {!user && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {isArabic ? "يجب تسجيل الدخول لحفظ المشروع" : "You must be signed in"}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !user || !projectName.trim()}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isArabic ? "جاري الحفظ..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isArabic ? "حفظ" : "Save"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Project Dialog with rename option */}
      <AlertDialog open={duplicateDialogOpen} onOpenChange={(o) => { if (!isSaving) setDuplicateDialogOpen(o); }}>
        <AlertDialogContent dir={isArabic ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              {isArabic ? "يوجد مشروع بنفس الاسم" : "Project name already exists"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {isArabic
                    ? `يوجد مشروع محفوظ باسم "${duplicateProject?.name}".`
                    : `A project named "${duplicateProject?.name}" already exists.`}
                </p>
                <div className="text-xs bg-muted p-2 rounded space-y-1 font-mono">
                  <div><span className="text-muted-foreground">ID:</span> {duplicateProject?.id}</div>
                  <div><span className="text-muted-foreground">{isArabic ? "أُنشئ:" : "Created:"}</span> {formatDate(duplicateProject?.created_at)}</div>
                  <div><span className="text-muted-foreground">{isArabic ? "آخر تحديث:" : "Updated:"}</span> {formatDate(duplicateProject?.updated_at)}</div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {renameMode && (
            <div className="space-y-2 py-2">
              <Label>{isArabic ? "اسم جديد" : "New name"}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} disabled={isSaving} />
            </div>
          )}

          <AlertDialogFooter className="flex-row-reverse gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => setDuplicateDialogOpen(false)} disabled={isSaving}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            {renameMode ? (
              <Button onClick={handleRenameSave} disabled={isSaving || !newName.trim()} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isArabic ? "حفظ بالاسم الجديد" : "Save with new name"}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setRenameMode(true)} disabled={isSaving} className="gap-2">
                <Pencil className="w-4 h-4" />
                {isArabic ? "إعادة تسمية وحفظ" : "Rename & save"}
              </Button>
            )}
            <Button
              onClick={handleOverwriteConfirm}
              disabled={isSaving}
              variant="destructive"
              className="gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isArabic ? "استبدال القديم" : "Overwrite existing"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
