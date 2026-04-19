import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { ProjectAttachments } from "@/components/ProjectAttachments";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Paperclip, FolderOpen, Files, HardDrive, Sparkles, FolderTree, FileType2, Clock, FileText, Image as ImageIcon, FileSpreadsheet, FileArchive } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Project {
  id: string;
  name: string;
}

const AttachmentsPage = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("project");
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    projectIdFromUrl || undefined
  );
  const [stats, setStats] = useState({ total: 0, sizeMB: 0, analyzed: 0, folders: 0 });
  const [typeBreakdown, setTypeBreakdown] = useState<{ type: string; count: number; icon: any; cls: string }[]>([]);
  const [recentFiles, setRecentFiles] = useState<{ id: string; name: string; size: number; created_at: string; is_analyzed: boolean }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [att, fold] = await Promise.all([
        supabase.from('project_attachments').select('id,file_name,file_size,file_type,is_analyzed,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('attachment_folders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      const rows = (att.data as any[]) || [];
      const totalBytes = rows.reduce((s: number, r: any) => s + (Number(r.file_size) || 0), 0);
      setStats({
        total: rows.length,
        sizeMB: Math.round(totalBytes / (1024 * 1024) * 10) / 10,
        analyzed: rows.filter((r: any) => r.is_analyzed).length,
        folders: fold.count || 0,
      });

      // Type breakdown
      const cats = { pdf: 0, image: 0, sheet: 0, doc: 0, other: 0 };
      rows.forEach((r) => {
        const name = (r.file_name || "").toLowerCase();
        const t = (r.file_type || "").toLowerCase();
        if (t.includes("pdf") || name.endsWith(".pdf")) cats.pdf++;
        else if (t.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|heic)$/.test(name)) cats.image++;
        else if (t.includes("sheet") || /\.(xlsx?|csv)$/.test(name)) cats.sheet++;
        else if (t.includes("word") || /\.(docx?|txt|md)$/.test(name)) cats.doc++;
        else cats.other++;
      });
      setTypeBreakdown([
        { type: isArabic ? "PDF" : "PDF", count: cats.pdf, icon: FileText, cls: "text-red-600 bg-red-500/10" },
        { type: isArabic ? "صور" : "Images", count: cats.image, icon: ImageIcon, cls: "text-purple-600 bg-purple-500/10" },
        { type: isArabic ? "جداول" : "Sheets", count: cats.sheet, icon: FileSpreadsheet, cls: "text-emerald-600 bg-emerald-500/10" },
        { type: isArabic ? "مستندات" : "Documents", count: cats.doc, icon: FileText, cls: "text-blue-600 bg-blue-500/10" },
        { type: isArabic ? "أخرى" : "Other", count: cats.other, icon: FileArchive, cls: "text-muted-foreground bg-muted" },
      ].filter((x) => x.count > 0));

      setRecentFiles(rows.slice(0, 5).map((r) => ({
        id: r.id, name: r.file_name, size: Number(r.file_size) || 0, created_at: r.created_at, is_analyzed: !!r.is_analyzed,
      })));
    })();
  }, [user, isArabic]);

  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("project_data")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (!error && data) {
        setProjects(data);
      }
    };

    fetchProjects();
  }, [user]);

  useEffect(() => {
    if (projectIdFromUrl) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl]);

  const handleProjectChange = (value: string) => {
    if (value === "all") {
      setSelectedProjectId(undefined);
      setSearchParams({});
    } else {
      setSelectedProjectId(value);
      setSearchParams({ project: value });
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8" dir={isArabic ? "rtl" : "ltr"}>
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Paperclip className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  {isArabic ? "مرفقات المشروع" : "Project Attachments"}
                  {selectedProject && (
                    <Badge variant="secondary" className="text-sm font-normal">
                      {selectedProject.name}
                    </Badge>
                  )}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isArabic 
                    ? "رفع وإدارة جميع ملفات ومستندات المشروع"
                    : "Upload and manage all project files and documents"
                  }
                </p>
              </div>
            </div>

            {/* Project Filter */}
            <div className="w-full sm:w-64">
              <Select
                value={selectedProjectId || "all"}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isArabic ? "جميع المشاريع" : "All Projects"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isArabic ? "جميع المشاريع" : "All Projects"}
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: isArabic ? 'إجمالي الملفات' : 'Total Files', value: stats.total.toLocaleString(), icon: Files, color: 'text-primary', bg: 'bg-primary/10' },
            { label: isArabic ? 'الحجم الإجمالي' : 'Total Size', value: `${stats.sizeMB} MB`, icon: HardDrive, color: 'text-blue-600', bg: 'bg-blue-500/10' },
            { label: isArabic ? 'مُحلَّلة' : 'Analyzed', value: stats.analyzed.toLocaleString(), icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { label: isArabic ? 'المجلدات' : 'Folders', value: stats.folders.toLocaleString(), icon: FolderTree, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          ].map((c) => (
            <Card key={c.label} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${c.bg}`}>
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{c.label}</div>
                  <div className={`text-lg font-bold ${c.color}`}>{c.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Insights row */}
        {stats.total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileType2 className="w-4 h-4 text-primary" />
                  {isArabic ? "أنواع الملفات" : "File Types"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {typeBreakdown.map((t) => {
                  const Icon = t.icon;
                  const pct = Math.round((t.count / stats.total) * 100);
                  return (
                    <div key={t.type} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.cls}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{t.type}</span>
                          <span className="text-muted-foreground">{t.count} · {pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {isArabic ? "معدّل التحليل" : "Analysis Rate"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center py-2">
                  <div className="text-4xl font-bold text-emerald-600">
                    {stats.total > 0 ? Math.round((stats.analyzed / stats.total) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.analyzed} / {stats.total} {isArabic ? "ملف" : "files"}
                  </p>
                </div>
                <Progress value={stats.total > 0 ? (stats.analyzed / stats.total) * 100 : 0} className="h-2" />
                {stats.total - stats.analyzed > 0 && (
                  <p className="text-xs text-amber-600 text-center">
                    {stats.total - stats.analyzed} {isArabic ? "ملف بانتظار التحليل" : "files awaiting analysis"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {isArabic ? "أحدث الملفات" : "Recent Files"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {isArabic ? "لا توجد ملفات" : "No files"}
                  </p>
                ) : (
                  recentFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <Files className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(f.created_at), "d MMM", { locale: isArabic ? ar : enUS })}
                          {" · "}
                          {(f.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      {f.is_analyzed && <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {isArabic ? "إدارة الملفات" : "File Management"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ProjectAttachments projectId={selectedProjectId} />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default AttachmentsPage;
