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
