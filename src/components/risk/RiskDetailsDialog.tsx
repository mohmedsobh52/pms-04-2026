import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, AlertCircle, Save, X } from "lucide-react";

export type EditableRisk = {
  risk_title: string;
  risk_description: string;
  category: string;
  probability_score: number;
  impact_score: number;
  risk_score: number;
  mitigation_strategy: string;
  contingency_plan: string;
  risk_owner: string;
  review_status?: "pending" | "reviewed" | "needs_review";
  review_comment?: string;
  references?: string;
  generated_at?: string;
};

const scoreTone = (s: number) =>
  s >= 15
    ? "bg-red-500/15 text-red-600 border-red-500/40"
    : s >= 8
      ? "bg-amber-500/15 text-amber-600 border-amber-500/40"
      : "bg-emerald-500/15 text-emerald-600 border-emerald-500/40";

export function RiskDetailsDialog({
  risk,
  open,
  onOpenChange,
  onSave,
}: {
  risk: EditableRisk | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (r: EditableRisk) => void;
}) {
  const [draft, setDraft] = useState<EditableRisk | null>(risk);

  useEffect(() => {
    setDraft(risk);
  }, [risk]);

  if (!draft) return null;

  const set = <K extends keyof EditableRisk>(k: K, v: EditableRisk[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const p = Number(draft.probability_score) || 1;
  const i = Number(draft.impact_score) || 1;
  const score = p * i;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            تفاصيل المخاطرة
            <Badge
              variant="outline"
              className={`text-[11px] font-bold ${scoreTone(score)}`}
            >
              خطورة {score}
            </Badge>
            {draft.review_status === "reviewed" && (
              <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-500/40">
                <CheckCircle2 className="w-3 h-3" /> تمت المراجعة
              </Badge>
            )}
            {draft.review_status === "needs_review" && (
              <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/40">
                <AlertCircle className="w-3 h-3" /> مطلوب مراجعة
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">العنوان</Label>
              <Input
                value={draft.risk_title}
                onChange={(e) => set("risk_title", e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">الفئة</Label>
              <Input
                value={draft.category}
                onChange={(e) => set("category", e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">المسؤول</Label>
              <Input
                value={draft.risk_owner}
                onChange={(e) => set("risk_owner", e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">السبب / الوصف</Label>
            <Textarea
              value={draft.risk_description}
              onChange={(e) => set("risk_description", e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">الاحتمال</Label>
                <Badge variant="outline" className="text-[10px]">{p}/5</Badge>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[p]}
                onValueChange={([v]) => {
                  set("probability_score", v);
                  set("risk_score", v * i);
                }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">التأثير</Label>
                <Badge variant="outline" className="text-[10px]">{i}/5</Badge>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[i]}
                onValueChange={([v]) => {
                  set("impact_score", v);
                  set("risk_score", p * v);
                }}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">خطة التخفيف</Label>
            <Textarea
              value={draft.mitigation_strategy}
              onChange={(e) => set("mitigation_strategy", e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">خطة الطوارئ</Label>
            <Textarea
              value={draft.contingency_plan}
              onChange={(e) => set("contingency_plan", e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">المراجع / الملاحظات</Label>
            <Textarea
              value={draft.references ?? ""}
              onChange={(e) => set("references", e.target.value)}
              rows={2}
              placeholder="روابط، أكواد بنود، مواصفات ذات صلة…"
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t">
            <div>
              <Label className="text-xs">حالة المراجعة</Label>
              <Select
                value={draft.review_status ?? "pending"}
                onValueChange={(v: any) => set("review_status", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="needs_review">مطلوب مراجعة</SelectItem>
                  <SelectItem value="reviewed">تمت المراجعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">تعليق المراجعة</Label>
              <Input
                value={draft.review_comment ?? ""}
                onChange={(e) => set("review_comment", e.target.value)}
                className="h-9"
                placeholder="ملاحظات المراجع…"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
            <span className="ms-1">إلغاء</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (draft) onSave(draft);
              onOpenChange(false);
            }}
          >
            <Save className="w-4 h-4" />
            <span className="ms-1">حفظ التعديلات</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
