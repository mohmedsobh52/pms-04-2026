import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Loader2 } from "lucide-react";
import { useDocumentMutations } from "@/hooks/useDocuments";

interface Props {
  projectId: string;
  trigger?: React.ReactNode;
}

export function DocumentUploadDialog({ projectId, trigger }: Props) {
  const { isArabic } = useLanguage();
  const { upload, progress } = useDocumentMutations();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [expiry, setExpiry] = useState("");
  const [desc, setDesc] = useState("");

  const reset = () => { setFile(null); setTitle(""); setTags(""); setExpiry(""); setDesc(""); };

  const onSubmit = async () => {
    if (!file) return;
    await upload.mutateAsync({
      file,
      projectId,
      title: title || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      expiryDate: expiry || null,
      description: desc || undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1">
            <Upload className="w-4 h-4" /> {isArabic ? "رفع وثيقة" : "Upload"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isArabic ? "رفع وثيقة جديدة" : "Upload Document"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{isArabic ? "الملف" : "File"}</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{isArabic ? "العنوان" : "Title"}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>{isArabic ? "تاريخ الانتهاء" : "Expiry date"}</Label>
              <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)}
                placeholder="yyyy-MM-dd" />
            </div>
          </div>
          <div>
            <Label>{isArabic ? "وسوم (مفصولة بفاصلة)" : "Tags (comma separated)"}</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="contract, drawings, RFI" />
          </div>
          <div>
            <Label>{isArabic ? "وصف" : "Description"}</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          </div>
          {progress > 0 && progress < 100 && (
            <div className="h-1.5 bg-muted rounded">
              <div className="h-full bg-primary rounded transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={onSubmit} disabled={!file || upload.isPending}>
            {upload.isPending && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
            {isArabic ? "رفع" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
