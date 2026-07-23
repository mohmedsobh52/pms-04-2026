import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Zap } from "lucide-react";
import type {
  SuggestionRule,
  SuggestionCategory,
  SuggestionSeverity,
} from "@/contexts/GlobalSuggestionsContext";
import { CATEGORY_META, SEVERITY_META } from "@/lib/suggestion-generators";

interface Props {
  rules: SuggestionRule[];
  onAdd: (rule: Omit<SuggestionRule, "id" | "createdAt">) => void;
  onRemove: (id: string) => void;
}

const ANY = "__any__";

export function RulesEngineCard({ rules, onAdd, onRemove }: Props) {
  const [titleContains, setTitleContains] = useState("");
  const [category, setCategory] = useState<string>(ANY);
  const [severity, setSeverity] = useState<string>(ANY);
  const [screen, setScreen] = useState("");
  const [action, setAction] = useState<"auto-dismiss" | "auto-pin">("auto-dismiss");

  const canAdd = titleContains.trim() || category !== ANY || severity !== ANY || screen.trim();

  const submit = () => {
    if (!canAdd) return;
    onAdd({
      titleContains: titleContains.trim() || undefined,
      category: category === ANY ? undefined : (category as SuggestionCategory),
      severity: severity === ANY ? undefined : (severity as SuggestionSeverity),
      screen: screen.trim() || undefined,
      action,
    });
    setTitleContains("");
    setCategory(ANY);
    setSeverity(ANY);
    setScreen("");
    setAction("auto-dismiss");
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            محرك القواعد التلقائية
          </div>
          <p className="text-xs text-muted-foreground">
            طبّق إجراءً تلقائياً (تجاهُل/تثبيت) على الاقتراحات الجديدة المطابقة.
          </p>
        </div>
        <Badge variant="secondary">{rules.length} قاعدة</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border p-3">
        <div className="space-y-1">
          <Label className="text-[11px]">يحتوي العنوان على…</Label>
          <Input
            className="h-8 text-xs"
            placeholder="مثال: تأخر، مورد، عرض سعر"
            value={titleContains}
            onChange={(e) => setTitleContains(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">الشاشة (اختياري)</Label>
          <Input
            className="h-8 text-xs"
            placeholder="مثال: procurement"
            value={screen}
            onChange={(e) => setScreen(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">الفئة</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>أي فئة</SelectItem>
              {(Object.keys(CATEGORY_META) as SuggestionCategory[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_META[c].ar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">الخطورة</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>أي خطورة</SelectItem>
              {(["critical", "warning", "info", "success"] as SuggestionSeverity[]).map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {SEVERITY_META[s].ar}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">الإجراء</Label>
          <Select value={action} onValueChange={(v) => setAction(v as any)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto-dismiss">🔇 تجاهُل تلقائي</SelectItem>
              <SelectItem value="auto-pin">📌 تثبيت تلقائي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            onClick={submit}
            disabled={!canAdd}
            className="w-full h-8"
          >
            <Plus className="w-3.5 h-3.5 ml-1" />
            إضافة قاعدة
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          لا توجد قواعد بعد — الاقتراحات ستظهر بشكل طبيعي.
        </p>
      ) : (
        <div className="space-y-1.5">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 text-xs rounded-md border p-2 bg-muted/30"
            >
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <Badge
                  variant={r.action === "auto-dismiss" ? "outline" : "default"}
                  className="text-[10px]"
                >
                  {r.action === "auto-dismiss" ? "🔇 تجاهُل" : "📌 تثبيت"}
                </Badge>
                {r.category && (
                  <span className="text-muted-foreground">
                    فئة: <b>{CATEGORY_META[r.category].ar}</b>
                  </span>
                )}
                {r.severity && (
                  <span className="text-muted-foreground">
                    خطورة: <b>{SEVERITY_META[r.severity].ar}</b>
                  </span>
                )}
                {r.screen && (
                  <span className="text-muted-foreground">
                    شاشة: <b>{r.screen}</b>
                  </span>
                )}
                {r.titleContains && (
                  <span className="text-muted-foreground">
                    يحوي: <b>«{r.titleContains}»</b>
                  </span>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 text-destructive"
                onClick={() => onRemove(r.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
