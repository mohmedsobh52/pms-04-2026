import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Download, History, Upload } from "lucide-react";
import { useDocumentMutations, useDocumentVersions, type DocumentRow } from "@/hooks/useDocuments";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface Props {
  doc: DocumentRow;
}

export function DocumentVersionDialog({ doc }: Props) {
  const { isArabic } = useLanguage();
  const rootId = doc.parent_attachment_id ?? doc.id;
  const [open, setOpen] = useState(false);
  const { data: versions = [], isLoading } = useDocumentVersions(open ? rootId : undefined);
  const { addVersion, getDownloadUrl } = useDocumentMutations();
  const [file, setFile] = useState<File | null>(null);

  const onDownload = async (v: DocumentRow) => {
    const url = await getDownloadUrl(v);
    window.open(url, "_blank");
  };

  const onAddVersion = async () => {
    if (!file) return;
    await addVersion.mutateAsync({ parentId: rootId, file });
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="ghost" className="gap-1" onClick={() => setOpen(true)}>
        <History className="w-3.5 h-3.5" />
        v{doc.version_number}
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isArabic ? "سجل النسخ" : "Version history"} — {doc.title || doc.file_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <div className="border rounded-md divide-y max-h-[40vh] overflow-auto">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={v.is_latest ? "default" : "outline"}>v{v.version_number}</Badge>
                      <span className="truncate">{v.file_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(v.uploaded_at).toLocaleString()} · {((v.file_size ?? 0) / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onDownload(v)}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-3">
            <Label className="text-xs">{isArabic ? "إضافة نسخة جديدة" : "Add new version"}</Label>
            <div className="flex gap-2 mt-1">
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="flex-1" />
              <Button onClick={onAddVersion} disabled={!file || addVersion.isPending} size="sm">
                {addVersion.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
