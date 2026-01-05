import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Files, Plus, Trash2, Download, Upload, Copy, Eye, 
  Star, Globe, Lock, CheckCircle
} from "lucide-react";
import * as XLSX from 'xlsx';

interface BOQTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  items: any[];
  currency: string;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  user_id: string;
}

interface BOQTemplatesProps {
  onUseTemplate?: (items: any[]) => void;
  currentItems?: any[];
}

export function BOQTemplates({ onUseTemplate, currentItems = [] }: BOQTemplatesProps) {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<BOQTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<BOQTemplate | null>(null);
  const [filter, setFilter] = useState<"all" | "my" | "public">("all");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "general",
    is_public: false
  });

  const categories = [
    { value: "general", label: isArabic ? "عام" : "General" },
    { value: "residential", label: isArabic ? "سكني" : "Residential" },
    { value: "commercial", label: isArabic ? "تجاري" : "Commercial" },
    { value: "industrial", label: isArabic ? "صناعي" : "Industrial" },
    { value: "infrastructure", label: isArabic ? "بنية تحتية" : "Infrastructure" },
    { value: "renovation", label: isArabic ? "ترميم" : "Renovation" },
  ];

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("boq_templates")
        .select("*")
        .order("usage_count", { ascending: false });

      if (error) throw error;
      if (data) {
        setTemplates(data.map(d => ({
          ...d,
          items: Array.isArray(d.items) ? d.items : [],
          description: d.description || null,
          category: d.category || null
        })) as BOQTemplate[]);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!user || !formData.name || currentItems.length === 0) return;

    try {
      const { data, error } = await supabase.from("boq_templates").insert({
        user_id: user.id,
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        items: currentItems,
        currency: "SAR",
        is_public: formData.is_public
      }).select().single();

      if (error) throw error;

      const newTemplate: BOQTemplate = {
        ...data,
        items: Array.isArray(data.items) ? data.items : [],
        description: data.description || null,
        category: data.category || null
      };

      setTemplates(prev => [newTemplate, ...prev]);
      setShowSaveDialog(false);
      setFormData({ name: "", description: "", category: "general", is_public: false });
      
      toast({
        title: isArabic ? "تم الحفظ" : "Saved",
        description: isArabic ? "تم حفظ القالب بنجاح" : "Template saved successfully"
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: isArabic ? "فشل في حفظ القالب" : "Failed to save template",
        variant: "destructive"
      });
    }
  };

  const handleUseTemplate = async (template: BOQTemplate) => {
    // Increment usage count
    await supabase
      .from("boq_templates")
      .update({ usage_count: template.usage_count + 1 })
      .eq("id", template.id);

    if (onUseTemplate) {
      onUseTemplate(template.items);
    }

    toast({
      title: isArabic ? "تم التطبيق" : "Applied",
      description: isArabic ? `تم تطبيق القالب: ${template.name}` : `Template applied: ${template.name}`
    });
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from("boq_templates").delete().eq("id", id);
      if (error) throw error;
      
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({
        title: isArabic ? "تم الحذف" : "Deleted",
        description: isArabic ? "تم حذف القالب" : "Template deleted"
      });
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleExportTemplate = (template: BOQTemplate) => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(template.items.map((item, idx) => ({
      [isArabic ? "م" : "#"]: idx + 1,
      [isArabic ? "رقم البند" : "Item No"]: item.item_number || "",
      [isArabic ? "الوصف" : "Description"]: item.description || "",
      [isArabic ? "الوحدة" : "Unit"]: item.unit || "",
      [isArabic ? "الكمية" : "Quantity"]: item.quantity || 0,
      [isArabic ? "سعر الوحدة" : "Unit Price"]: item.unit_price || 0,
      [isArabic ? "الإجمالي" : "Total"]: item.total_price || 0,
    })));

    XLSX.utils.book_append_sheet(workbook, worksheet, "BOQ Template");
    XLSX.writeFile(workbook, `${template.name}.xlsx`);
  };

  const filteredTemplates = templates.filter(t => {
    if (filter === "my") return t.user_id === user?.id;
    if (filter === "public") return t.is_public;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Files className="w-5 h-5" />
            {isArabic ? "قوالب جداول الكميات" : "BOQ Templates"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isArabic ? "أنشئ واستخدم قوالب BOQ قابلة لإعادة الاستخدام" : "Create and use reusable BOQ templates"}
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
              <SelectItem value="my">{isArabic ? "قوالبي" : "My Templates"}</SelectItem>
              <SelectItem value="public">{isArabic ? "عامة" : "Public"}</SelectItem>
            </SelectContent>
          </Select>

          {currentItems.length > 0 && user && (
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isArabic ? "حفظ كقالب" : "Save as Template"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isArabic ? "حفظ كقالب جديد" : "Save as New Template"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{isArabic ? "اسم القالب" : "Template Name"} *</Label>
                    <Input 
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder={isArabic ? "مثال: فيلا سكنية" : "e.g., Residential Villa"}
                    />
                  </div>
                  <div>
                    <Label>{isArabic ? "الوصف" : "Description"}</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      placeholder={isArabic ? "وصف مختصر للقالب..." : "Brief description..."}
                    />
                  </div>
                  <div>
                    <Label>{isArabic ? "الفئة" : "Category"}</Label>
                    <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{isArabic ? "قالب عام" : "Public Template"}</Label>
                      <p className="text-xs text-muted-foreground">
                        {isArabic ? "السماح للآخرين باستخدام هذا القالب" : "Allow others to use this template"}
                      </p>
                    </div>
                    <Switch 
                      checked={formData.is_public}
                      onCheckedChange={v => setFormData(p => ({ ...p, is_public: v }))}
                    />
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium">{isArabic ? "سيتم حفظ:" : "Will save:"}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentItems.length} {isArabic ? "بند" : "items"}
                    </p>
                  </div>
                  <Button onClick={handleSaveAsTemplate} className="w-full" disabled={!formData.name}>
                    {isArabic ? "حفظ القالب" : "Save Template"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="p-8 text-center">
          <Files className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {isArabic ? "لا توجد قوالب" : "No templates found"}
          </p>
          {currentItems.length > 0 && (
            <Button variant="outline" className="mt-4" onClick={() => setShowSaveDialog(true)}>
              {isArabic ? "أنشئ أول قالب" : "Create your first template"}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      {template.is_public ? (
                        <Globe className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description || (isArabic ? "بدون وصف" : "No description")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {categories.find(c => c.value === template.category)?.label || template.category}
                  </Badge>
                  <Badge variant="secondary">
                    {template.items.length} {isArabic ? "بند" : "items"}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Star className="w-3 h-3" />
                    {template.usage_count}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="default"
                    size="sm" 
                    className="flex-1 gap-1"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isArabic ? "استخدم" : "Use"}
                  </Button>
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowPreviewDialog(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => handleExportTemplate(template)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {template.user_id === user?.id && (
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.description && (
                <p className="text-muted-foreground">{selectedTemplate.description}</p>
              )}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-start">#</th>
                      <th className="p-2 text-start">{isArabic ? "رقم البند" : "Item No"}</th>
                      <th className="p-2 text-start">{isArabic ? "الوصف" : "Description"}</th>
                      <th className="p-2 text-start">{isArabic ? "الوحدة" : "Unit"}</th>
                      <th className="p-2 text-start">{isArabic ? "الكمية" : "Qty"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTemplate.items.slice(0, 20).map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{item.item_number}</td>
                        <td className="p-2">{item.description}</td>
                        <td className="p-2">{item.unit}</td>
                        <td className="p-2">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedTemplate.items.length > 20 && (
                  <p className="p-2 text-center text-muted-foreground text-sm bg-muted/50">
                    +{selectedTemplate.items.length - 20} {isArabic ? "بند آخر" : "more items"}
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => handleExportTemplate(selectedTemplate)}>
                  <Download className="w-4 h-4 mr-2" />
                  {isArabic ? "تصدير Excel" : "Export Excel"}
                </Button>
                <Button onClick={() => {
                  handleUseTemplate(selectedTemplate);
                  setShowPreviewDialog(false);
                }}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isArabic ? "استخدم القالب" : "Use Template"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
