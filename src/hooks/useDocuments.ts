import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export type DocumentRow = {
  id: string;
  project_id: string | null;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  folder_id: string | null;
  version_number: number;
  parent_attachment_id: string | null;
  is_latest: boolean;
  tags: string[];
  expiry_date: string | null;
  uploaded_at: string;
};

const SELECT =
  "id,project_id,user_id,file_name,file_path,file_size,file_type,title,description,category,folder_id,version_number,parent_attachment_id,is_latest,tags,expiry_date,uploaded_at";

export function useDocuments(opts: {
  projectId?: string;
  search?: string;
  tag?: string;
  latestOnly?: boolean;
} = {}) {
  const { projectId, search = "", tag = "", latestOnly = true } = opts;

  return useQuery({
    queryKey: ["documents", projectId ?? "all", search, tag, latestOnly],
    queryFn: async (): Promise<DocumentRow[]> => {
      let q = (supabase as any)
        .from("project_attachments")
        .select(SELECT)
        .order("uploaded_at", { ascending: false })
        .limit(500);
      if (projectId) q = q.eq("project_id", projectId);
      if (latestOnly) q = q.eq("is_latest", true);
      if (tag) q = q.contains("tags", [tag]);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`file_name.ilike.${s},title.ilike.${s},description.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });
}

export function useDocumentVersions(rootId?: string) {
  return useQuery({
    enabled: !!rootId,
    queryKey: ["document-versions", rootId],
    queryFn: async (): Promise<DocumentRow[]> => {
      const { data } = await (supabase as any)
        .from("project_attachments")
        .select(SELECT)
        .or(`id.eq.${rootId},parent_attachment_id.eq.${rootId}`)
        .order("version_number", { ascending: false });
      return (data ?? []) as DocumentRow[];
    },
  });
}

export function useExpiringDocuments(days = 30) {
  return useQuery({
    queryKey: ["documents-expiring", days],
    queryFn: async (): Promise<DocumentRow[]> => {
      const { data, error } = await (supabase as any).rpc("get_expiring_documents", { _days: days });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });
}

export function useDocumentMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);

  const invalidate = () =>
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("document") });

  const upload = useMutation({
    mutationFn: async (args: {
      file: File;
      projectId: string;
      title?: string;
      tags?: string[];
      expiryDate?: string | null;
      folderId?: string | null;
      description?: string;
      category?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ts = Date.now();
      const safe = args.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${args.projectId}/${ts}-${safe}`;
      setProgress(10);
      const { error: upErr } = await supabase.storage.from("project-files").upload(path, args.file, { upsert: false });
      if (upErr) throw upErr;
      setProgress(70);
      const { data, error } = await (supabase as any)
        .from("project_attachments")
        .insert({
          project_id: args.projectId,
          user_id: user.id,
          file_name: args.file.name,
          file_path: path,
          file_size: args.file.size,
          file_type: args.file.type || null,
          title: args.title || null,
          description: args.description || null,
          category: args.category || null,
          folder_id: args.folderId ?? null,
          tags: args.tags ?? [],
          expiry_date: args.expiryDate || null,
        })
        .select()
        .single();
      setProgress(100);
      if (error) throw error;
      return data as DocumentRow;
    },
    onSuccess: () => {
      toast({ title: "Uploaded", description: "Document saved" });
      invalidate();
      setTimeout(() => setProgress(0), 500);
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const addVersion = useMutation({
    mutationFn: async (args: { parentId: string; file: File; description?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: parent } = await (supabase as any)
        .from("project_attachments")
        .select("project_id")
        .eq("id", args.parentId)
        .single();
      const ts = Date.now();
      const safe = args.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${parent.project_id}/${ts}-v-${safe}`;
      const { error: upErr } = await supabase.storage.from("project-files").upload(path, args.file, { upsert: false });
      if (upErr) throw upErr;
      const { data, error } = await (supabase as any).rpc("add_document_version", {
        _parent_id: args.parentId,
        _file_name: args.file.name,
        _file_path: path,
        _file_size: args.file.size,
        _file_type: args.file.type || null,
        _description: args.description ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "New version added" });
      invalidate();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMeta = useMutation({
    mutationFn: async (args: { id: string; patch: Partial<Pick<DocumentRow, "title" | "tags" | "expiry_date" | "description" | "category">> }) => {
      const { error } = await (supabase as any)
        .from("project_attachments")
        .update(args.patch)
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (doc: DocumentRow) => {
      if (doc.file_path) await supabase.storage.from("project-files").remove([doc.file_path]);
      const { error } = await (supabase as any).from("project_attachments").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      invalidate();
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const getDownloadUrl = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage.from("project-files").createSignedUrl(doc.file_path, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  };

  return { upload, addVersion, updateMeta, remove, getDownloadUrl, progress };
}

export function useAllDocumentTags(projectId?: string) {
  const { data } = useDocuments({ projectId, latestOnly: false });
  return useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((d) => d.tags?.forEach((t) => t && set.add(t)));
    return Array.from(set).sort();
  }, [data]);
}
