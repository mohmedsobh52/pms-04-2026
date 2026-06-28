import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit3, Copy as CopyIcon, FileText, MapPin, Calendar, User, Hash } from "lucide-react";
import { toast } from "sonner";

const META_KEY = "cost_analysis_meta";

export interface CostAnalysisMeta {
  projectName: string;
  projectCode: string;
  clientName: string;
  location: string;
  currency: string;
  taxPct: number;
  createdAt: string;
  updatedAt: string;
  lastEditor: string;
  status: "draft" | "review" | "approved" | "rejected" | "archived";
  version: number;
}

const DEFAULTS: CostAnalysisMeta = {
  projectName: "تحليل بدون مشروع",
  projectCode: "",
  clientName: "",
  location: "",
  currency: "SAR",
  taxPct: 15,
  createdAt: new Date().toISOString().slice(0, 10),
  updatedAt: new Date().toISOString().slice(0, 10),
  lastEditor: "",
  status: "draft",
  version: 1,
};

const STATUS_LABELS: Record<CostAnalysisMeta["status"], string> = {
  draft: "مسودة",
  review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  archived: "مؤرشف",
};

const STATUS_TONES: Record<CostAnalysisMeta["status"], string> = {
  draft: "bg-muted text-foreground border-border",
  review: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300",
  rejected: "bg-red-500/10 text-red-700 border-red-300 dark:text-red-300",
  archived: "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-300",
};

function loadMeta(): CostAnalysisMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

interface Props {
  /** Notify parent that currency/tax changed so totals re-derive */
  onChange?: (meta: CostAnalysisMeta) => void;
}

export function ProjectInfoBar({ onChange }: Props) {
  const [meta, setMeta] = useState<CostAnalysisMeta>(() => loadMeta());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CostAnalysisMeta>(meta);

  useEffect(() => {
    onChange?.(meta);
  }, [meta, onChange]);

  const persist = (next: CostAnalysisMeta) => {
    const stamped = { ...next, updatedAt: new Date().toISOString().slice(0, 10) };
    setMeta(stamped);
    try {
      localStorage.setItem(META_KEY, JSON.stringify(stamped));
    } catch {
      /* quota */
    }
  };

  const save = () => {
    persist(draft);
    setOpen(false);
    toast.success("تم تحديث بيانات المشروع");
  };

  const duplicate = () => {
    persist({ ...meta, version: meta.version + 1, status: "draft" });
    toast.success(`تم إنشاء نسخة جديدة v${meta.version + 1}`);
  };

  return (
    <Card className="p-3 mb-4 border-primary/20 bg-gradient-to-l from-primary/5 to-transparent">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-base font-bold truncate">{meta.projectName}</h2>
            <Badge variant="outline" className={STATUS_TONES[meta.status]}>
              {STATUS_LABELS[meta.status]}
            </Badge>
            <Badge variant="outline" className="text-xs">v{meta.version}</Badge>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Field icon={<Hash className="w-3 h-3" />} label="رقم المشروع" value={meta.projectCode || "—"} />
            <Field icon={<User className="w-3 h-3" />} label="العميل" value={meta.clientName || "—"} />
            <Field icon={<MapPin className="w-3 h-3" />} label="الموقع" value={meta.location || "—"} />
            <Field label="العملة" value={meta.currency} />
            <Field label="الضريبة" value={`${meta.taxPct}%`} />
            <Field icon={<Calendar className="w-3 h-3" />} label="آخر تحديث" value={meta.updatedAt} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={duplicate} className="gap-1 h-8">
            <CopyIcon className="w-3.5 h-3.5" />
            نسخة جديدة
          </Button>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (v) setDraft(meta);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 h-8">
                <Edit3 className="w-3.5 h-3.5" />
                تعديل البيانات
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>تعديل بيانات المشروع</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <Editable label="اسم المشروع" value={draft.projectName} onChange={(v) => setDraft({ ...draft, projectName: v })} />
                <Editable label="رقم المشروع" value={draft.projectCode} onChange={(v) => setDraft({ ...draft, projectCode: v })} />
                <Editable label="اسم العميل" value={draft.clientName} onChange={(v) => setDraft({ ...draft, clientName: v })} />
                <Editable label="الموقع" value={draft.location} onChange={(v) => setDraft({ ...draft, location: v })} />
                <Editable label="العملة" value={draft.currency} onChange={(v) => setDraft({ ...draft, currency: v })} />
                <div className="space-y-1">
                  <Label className="text-xs">نسبة الضريبة %</Label>
                  <Input
                    type="number"
                    value={draft.taxPct}
                    onChange={(e) => setDraft({ ...draft, taxPct: Number(e.target.value) || 0 })}
                    className="h-8"
                  />
                </div>
                <Editable label="آخر مستخدم" value={draft.lastEditor} onChange={(v) => setDraft({ ...draft, lastEditor: v })} />
                <div className="space-y-1">
                  <Label className="text-xs">الحالة</Label>
                  <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as CostAnalysisMeta["status"] })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABELS) as CostAnalysisMeta["status"][]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button onClick={save}>حفظ</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
}

function Field({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 min-w-0" title={`${label}: ${value}`}>
      {icon}
      <span className="text-muted-foreground/80">{label}:</span>
      <span className="font-medium text-foreground truncate">{value}</span>
    </div>
  );
}

function Editable({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8" />
    </div>
  );
}
