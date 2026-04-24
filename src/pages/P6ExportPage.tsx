import { useEffect, useMemo, useState } from "react";
import { ListChecks, Sparkles, Loader2 } from "lucide-react";
import { P6Export } from "@/components/P6Export";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import { PageLayout } from "@/components/PageLayout";
import { ColorLegend } from "@/components/ui/color-code";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProjectOption {
  id: string;
  name: string;
}

interface ProjectItem {
  item_number?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
}

const P6ExportPage = () => {
  const { analysisData } = useAnalysisData();
  const { isArabic } = useLanguage();
  const { toast } = useToast();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [autoTrigger, setAutoTrigger] = useState(0);

  // جلب المشاريع المحفوظة للمستخدم
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;

        const { data, error } = await supabase
          .from("saved_projects")
          .select("id, project_name")
          .eq("user_id", authData.user.id)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        setProjects((data || []).map((p) => ({ id: p.id, name: p.project_name })));
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // عند اختيار مشروع، جلب بنوده
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectItems([]);
      return;
    }
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const { data, error } = await supabase
          .from("project_items")
          .select("item_number, description, unit, quantity, unit_price, total_price")
          .eq("project_id", selectedProjectId)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        setProjectItems(data || []);
      } catch (err: any) {
        toast({
          title: isArabic ? "تعذّر تحميل البنود" : "Failed to load items",
          description: err?.message,
          variant: "destructive",
        });
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, [selectedProjectId, isArabic, toast]);

  // البنود الفعلية المستخدمة: أولاً بنود المشروع المختار، وإلا بيانات التحليل
  const items = useMemo(() => {
    if (selectedProjectId && projectItems.length > 0) {
      return projectItems.map((it) => ({
        item_number: it.item_number || "",
        description: it.description || "",
        unit: it.unit || "",
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
        total_price: Number(it.total_price) || 0,
      }));
    }
    return analysisData?.items || [];
  }, [selectedProjectId, projectItems, analysisData]);

  const hasItems = items.length > 0;

  const handleAIGenerate = () => {
    if (!selectedProjectId) {
      toast({
        title: isArabic ? "اختر مشروعاً أولاً" : "Select a project first",
        variant: "destructive",
      });
      return;
    }
    if (!hasItems) {
      toast({
        title: isArabic ? "لا توجد بنود BOQ" : "No BOQ items",
        description: isArabic
          ? "هذا المشروع لا يحتوي على بنود لتوليد خطة تنفيذ"
          : "This project has no items to generate an execution plan",
        variant: "destructive",
      });
      return;
    }
    // تشغيل توليد P6 تلقائياً عبر زر داخلي
    setAutoTrigger((v) => v + 1);
    setTimeout(() => {
      const btn = document.querySelector<HTMLButtonElement>(
        '[data-p6-generate-trigger]'
      );
      btn?.click();
    }, 100);
  };

  return (
    <PageLayout>
      {/* Header — خطة التنفيذ */}
      <div
        className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/50 p-6 mb-6 shadow-sm"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ListChecks className="w-7 h-7 text-primary" />
              {isArabic ? "خطة التنفيذ" : "Execution Plan"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isArabic
                ? "إدارة وتخطيط مراحل تنفيذ المشروع"
                : "Manage and plan project execution phases"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={loadingProjects}
            >
              <SelectTrigger className="w-full sm:w-64 bg-background">
                <SelectValue
                  placeholder={
                    loadingProjects
                      ? isArabic ? "جارٍ التحميل..." : "Loading..."
                      : isArabic ? "اختر المشروع" : "Select project"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 && !loadingProjects ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {isArabic ? "لا توجد مشاريع محفوظة" : "No saved projects"}
                  </div>
                ) : (
                  projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAIGenerate}
              disabled={loadingItems || !hasItems}
              className="gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
            >
              {loadingItems ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isArabic ? "توليد بالذكاء الاصطناعي" : "Generate with AI"}
            </Button>
          </div>
        </div>
      </div>

      <ColorLegend type="category" isArabic={isArabic} className="mb-4" />

      {/* المحتوى: حالة فارغة أو مكوّن P6 */}
      {!hasItems ? (
        <div
          className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <ListChecks className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {isArabic ? "لا توجد خطة تنفيذ بعد" : "No execution plan yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {isArabic
              ? 'اختر مشروعاً واضغط "توليد بالذكاء الاصطناعي" لإنشاء خطة تنفيذ تلقائية من بنود BOQ'
              : 'Select a project and click "Generate with AI" to automatically create an execution plan from BOQ items'}
          </p>
          <Button
            onClick={handleAIGenerate}
            disabled={!selectedProjectId || loadingItems}
            size="lg"
            className="gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
          >
            <Sparkles className="w-4 h-4" />
            {isArabic ? "إنشاء خطة تنفيذ" : "Create Execution Plan"}
          </Button>
        </div>
      ) : (
        <P6Export
          key={selectedProjectId || "default"}
          items={items}
          currency={analysisData?.summary?.currency || "SAR"}
        />
      )}
    </PageLayout>
  );
};

export default P6ExportPage;
