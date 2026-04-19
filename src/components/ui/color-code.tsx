import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2, Clock, CircleCheck, AlertTriangle, FileEdit, XCircle,
  Flame, AlertCircle, ArrowDown,
  Package, HardHat, Truck, Users, Layers,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Unified color-coded badges for status, priority, and category.
 * Driven by HSL design tokens defined in index.css:
 *   --status-*, --priority-*, --cat-*
 */

export type StatusKey =
  | "active" | "in_progress" | "pending" | "completed" | "done"
  | "overdue" | "late" | "draft" | "cancelled" | "inactive";

const STATUS_MAP: Record<string, { token: string; icon: any; ar: string; en: string }> = {
  active:      { token: "status-active",    icon: CheckCircle2, ar: "نشط",     en: "Active" },
  in_progress: { token: "status-active",    icon: Clock,        ar: "قيد التنفيذ", en: "In Progress" },
  pending:     { token: "status-pending",   icon: Clock,        ar: "معلّق",    en: "Pending" },
  completed:   { token: "status-completed", icon: CircleCheck,  ar: "مكتمل",    en: "Completed" },
  done:        { token: "status-completed", icon: CircleCheck,  ar: "تم",       en: "Done" },
  overdue:     { token: "status-overdue",   icon: AlertTriangle,ar: "متأخر",    en: "Overdue" },
  late:        { token: "status-overdue",   icon: AlertTriangle,ar: "متأخر",    en: "Late" },
  draft:       { token: "status-draft",     icon: FileEdit,     ar: "مسودة",    en: "Draft" },
  cancelled:   { token: "status-cancelled", icon: XCircle,      ar: "ملغى",     en: "Cancelled" },
  inactive:    { token: "status-cancelled", icon: XCircle,      ar: "غير نشط",  en: "Inactive" },
};

export type PriorityKey = "high" | "medium" | "low" | "critical";

const PRIORITY_MAP: Record<string, { token: string; icon: any; ar: string; en: string }> = {
  critical: { token: "priority-high",   icon: Flame,       ar: "حرج",     en: "Critical" },
  high:     { token: "priority-high",   icon: AlertCircle, ar: "عالٍ",    en: "High" },
  medium:   { token: "priority-medium", icon: AlertCircle, ar: "متوسط",   en: "Medium" },
  low:      { token: "priority-low",    icon: ArrowDown,   ar: "منخفض",   en: "Low" },
};

export type CategoryKey = "material" | "labor" | "equipment" | "subcontractor" | "other";

const CATEGORY_MAP: Record<string, { token: string; icon: any; ar: string; en: string }> = {
  material:      { token: "cat-material",      icon: Package, ar: "مواد",      en: "Material" },
  labor:         { token: "cat-labor",         icon: HardHat, ar: "عمالة",     en: "Labor" },
  equipment:     { token: "cat-equipment",     icon: Truck,   ar: "معدات",     en: "Equipment" },
  subcontractor: { token: "cat-subcontractor", icon: Users,   ar: "مقاول باطن",en: "Subcontractor" },
  other:         { token: "cat-other",         icon: Layers,  ar: "أخرى",      en: "Other" },
};

function tokenClasses(token: string) {
  // bg/border/text via inline CSS variables for maximum reusability
  return {
    backgroundColor: `hsl(var(--${token}) / 0.12)`,
    color: `hsl(var(--${token}))`,
    borderColor: `hsl(var(--${token}) / 0.3)`,
  } as React.CSSProperties;
}

function dotStyle(token: string) {
  return { backgroundColor: `hsl(var(--${token}))` } as React.CSSProperties;
}

interface CommonProps {
  isArabic?: boolean;
  className?: string;
  withIcon?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({
  status, isArabic, className, withIcon = true, size = "sm",
}: CommonProps & { status: string }) {
  const key = (status || "").toLowerCase().replace(/[\s-]/g, "_");
  const m = STATUS_MAP[key] || STATUS_MAP.draft;
  const Icon = m.icon;
  return (
    <Badge
      variant="outline"
      style={tokenClasses(m.token)}
      className={cn("gap-1 font-medium", size === "sm" ? "text-[11px] py-0.5" : "text-xs", className)}
    >
      {withIcon && <Icon className="w-3 h-3" />}
      {isArabic ? m.ar : m.en}
    </Badge>
  );
}

export function PriorityBadge({
  priority, isArabic, className, withIcon = true, size = "sm",
}: CommonProps & { priority: string }) {
  const key = (priority || "").toLowerCase();
  const m = PRIORITY_MAP[key] || PRIORITY_MAP.medium;
  const Icon = m.icon;
  return (
    <Badge
      variant="outline"
      style={tokenClasses(m.token)}
      className={cn("gap-1 font-medium", size === "sm" ? "text-[11px] py-0.5" : "text-xs", className)}
    >
      {withIcon && <Icon className="w-3 h-3" />}
      {isArabic ? m.ar : m.en}
    </Badge>
  );
}

export function CategoryBadge({
  category, isArabic, className, withIcon = true, size = "sm",
}: CommonProps & { category: string }) {
  const key = (category || "").toLowerCase();
  const m = CATEGORY_MAP[key] || CATEGORY_MAP.other;
  const Icon = m.icon;
  return (
    <Badge
      variant="outline"
      style={tokenClasses(m.token)}
      className={cn("gap-1 font-medium", size === "sm" ? "text-[11px] py-0.5" : "text-xs", className)}
    >
      {withIcon && <Icon className="w-3 h-3" />}
      {isArabic ? m.ar : m.en}
    </Badge>
  );
}

export function ColorDot({ token, className }: { token: string; className?: string }) {
  return <span className={cn("inline-block w-2.5 h-2.5 rounded-full", className)} style={dotStyle(token)} />;
}

interface LegendItem { token: string; label: ReactNode }
interface ColorLegendProps {
  title?: ReactNode;
  type?: "status" | "priority" | "category" | "custom";
  items?: LegendItem[];
  isArabic?: boolean;
  className?: string;
}

export function ColorLegend({ title, type = "status", items, isArabic, className }: ColorLegendProps) {
  let resolved: LegendItem[] = items ?? [];
  if (!items) {
    if (type === "status") {
      resolved = [
        { token: "status-active",    label: isArabic ? "نشط"     : "Active" },
        { token: "status-pending",   label: isArabic ? "معلّق"    : "Pending" },
        { token: "status-completed", label: isArabic ? "مكتمل"   : "Completed" },
        { token: "status-overdue",   label: isArabic ? "متأخر"   : "Overdue" },
        { token: "status-draft",     label: isArabic ? "مسودة"   : "Draft" },
        { token: "status-cancelled", label: isArabic ? "ملغى"    : "Cancelled" },
      ];
    } else if (type === "priority") {
      resolved = [
        { token: "priority-high",   label: isArabic ? "عالٍ"    : "High" },
        { token: "priority-medium", label: isArabic ? "متوسط"  : "Medium" },
        { token: "priority-low",    label: isArabic ? "منخفض"  : "Low" },
      ];
    } else if (type === "category") {
      resolved = [
        { token: "cat-material",      label: isArabic ? "مواد"        : "Material" },
        { token: "cat-labor",         label: isArabic ? "عمالة"       : "Labor" },
        { token: "cat-equipment",     label: isArabic ? "معدات"       : "Equipment" },
        { token: "cat-subcontractor", label: isArabic ? "مقاول باطن"  : "Subcontractor" },
        { token: "cat-other",         label: isArabic ? "أخرى"        : "Other" },
      ];
    }
  }

  const heading = title ?? (
    type === "priority"
      ? (isArabic ? "مفتاح الأولويات" : "Priority Legend")
      : type === "category"
      ? (isArabic ? "مفتاح الفئات" : "Category Legend")
      : (isArabic ? "مفتاح الحالات" : "Status Legend")
  );

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-3">
        <div className="text-xs font-semibold text-muted-foreground mb-2">{heading}</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {resolved.map((it) => (
            <div key={it.token} className="flex items-center gap-1.5 text-xs">
              <ColorDot token={it.token} />
              <span className="text-foreground">{it.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
