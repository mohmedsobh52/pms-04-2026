import { useState } from "react";
import { Download, FolderOpen, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SavedProject {
  id: string;
  name: string;
  file_name: string | null;
  created_at: string;
  analysis_data: any;
}

interface ImportFromSavedProjectsProps {
  onImportComplete: () => void;
  existingProjectNames: string[];
}

export function ImportFromSavedProjects({ onImportComplete, existingProjectNames }: ImportFromSavedProjectsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useAuth();

  const loadProjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_projects")
        .select("id, name, file_name, created_at, analysis_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter projects that have analysis_data with items
      const validProjects = (data || []).filter(p => {
        const analysisData = p.analysis_data as any;
        return analysisData?.items && Array.isArray(analysisData.items) && analysisData.items.length > 0;
      });

      setProjects(validProjects);
    } catch (error: any) {
      console.error("Failed to load projects:", error);
      toast({
        title: "خطأ في التحميل",
        description: error.message || "فشل في تحميل المشاريع المحفوظة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadProjects();
      setSelectedIds(new Set());
    }
  };

  const toggleProject = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === projects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map(p => p.id)));
    }
  };

  const isAlreadyImported = (projectName: string) => {
    return existingProjectNames.some(
      name => name.toLowerCase() === projectName.toLowerCase()
    );
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "لم يتم اختيار مشاريع",
        description: "يرجى اختيار مشروع واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setIsImporting(true);
    let successCount = 0;
    let skipCount = 0;

    try {
      for (const id of Array.from(selectedIds)) {
        const project = projects.find(p => p.id === id);
        if (!project) continue;

        // Skip if already imported
        if (isAlreadyImported(project.name)) {
          skipCount++;
          continue;
        }

        const analysisData = project.analysis_data as any;
        const items = analysisData.items || [];
        const totalValue = items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);

        await supabase
          .from("historical_pricing_files")
          .insert([{
            user_id: user.id,
            file_name: project.file_name || `${project.name}.xlsx`,
            project_name: project.name,
            project_location: null,
            project_date: project.created_at.split('T')[0],
            currency: analysisData.summary?.currency || "SAR",
            items: items.map((item: any) => ({
              item_number: item.item_number || "",
              description: item.description || "",
              unit: item.unit || "",
              quantity: parseFloat(item.quantity) || 0,
              unit_price: parseFloat(item.unit_price) || 0,
              total_price: parseFloat(item.total_price) || 0,
            })),
            items_count: items.length,
            total_value: totalValue,
            notes: `تم الاستيراد تلقائياً من المشاريع المحفوظة`,
            is_verified: false,
          }]);

        successCount++;
      }

      toast({
        title: "✅ تم الاستيراد بنجاح",
        description: `تم استيراد ${successCount} مشروع${skipCount > 0 ? ` (تم تخطي ${skipCount} مشروع موجود مسبقاً)` : ''}`,
      });

      setIsOpen(false);
      onImportComplete();
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "خطأ في الاستيراد",
        description: error.message || "فشل في استيراد بعض المشاريع",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FolderOpen className="w-4 h-4" />
          استيراد من المشاريع المحفوظة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            استيراد من المشاريع المحفوظة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            اختر المشاريع المحفوظة لإضافتها إلى قاعدة البيانات التاريخية
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد مشاريع محفوظة تحتوي على بيانات BOQ</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {selectedIds.size === projects.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                </Button>
                <Badge variant="secondary">
                  {selectedIds.size} من {projects.length} محدد
                </Badge>
              </div>

              <ScrollArea className="h-[350px] border rounded-lg p-2">
                <div className="space-y-2">
                  {projects.map(project => {
                    const analysisData = project.analysis_data as any;
                    const itemsCount = analysisData?.items?.length || 0;
                    const totalValue = analysisData?.summary?.total_value || 0;
                    const alreadyImported = isAlreadyImported(project.name);

                    return (
                      <div
                        key={project.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          alreadyImported 
                            ? 'bg-muted/50 opacity-60' 
                            : selectedIds.has(project.id)
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedIds.has(project.id)}
                          onCheckedChange={() => toggleProject(project.id)}
                          disabled={alreadyImported}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{project.name}</p>
                            {alreadyImported && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <CheckCircle className="w-3 h-3" />
                                موجود مسبقاً
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>{itemsCount} بند</span>
                            <span>{totalValue.toLocaleString()} {analysisData?.summary?.currency || 'SAR'}</span>
                            <span>{new Date(project.created_at).toLocaleDateString('ar-SA')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || selectedIds.size === 0}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الاستيراد...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                استيراد ({selectedIds.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
