import { Link } from "react-router-dom";
import {
  FileSpreadsheet,
  Database,
  FileText,
  Building2,
  Truck,
  Wallet,
  Download,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface IntegrationsHubProps {
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onImportBoq?: () => void;
  onSyncPrices?: () => void;
  onSendToContracts?: () => void;
  onSendToSuppliers?: () => void;
  itemCount?: number;
  grandTotal?: number;
  currency?: string;
}

interface Tile {
  key: string;
  title: string;
  desc: string;
  icon: typeof FileSpreadsheet;
  tone: "primary" | "accent" | "info" | "warn" | "success";
  href?: string;
  onClick?: () => void;
  cta: string;
}

const toneCls: Record<Tile["tone"], string> = {
  primary: "bg-primary/5 border-primary/20 text-primary",
  accent: "bg-accent/10 border-accent/30 text-accent-foreground",
  info: "bg-blue-500/5 border-blue-500/20 text-blue-700 dark:text-blue-300",
  warn: "bg-orange-500/5 border-orange-500/20 text-orange-700 dark:text-orange-300",
  success: "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
};

export function IntegrationsHub({
  onExportPdf,
  onExportExcel,
  onImportBoq,
  onSyncPrices,
  onSendToContracts,
  onSendToSuppliers,
}: IntegrationsHubProps) {
  const tiles: Tile[] = [
    {
      key: "boq",
      title: "استيراد من جدول الكميات (BOQ)",
      desc: "اسحب البنود مباشرة من مشاريعك المحفوظة لتحليل تكاليفها.",
      icon: FileSpreadsheet,
      tone: "primary",
      href: "/projects",
      cta: "فتح المشاريع",
    },
    {
      key: "prices",
      title: "مكتبة الأسعار والأسعار التاريخية",
      desc: "حدّث تكاليف الاعتماد من مكتبتك وأسعار السوق التاريخية.",
      icon: Database,
      tone: "info",
      href: "/reference-prices",
      cta: "مكتبة الأسعار",
      onClick: onSyncPrices,
    },
    {
      key: "suppliers",
      title: "مقارنة الموردين والعروض",
      desc: "أرسل البنود المحدّدة لطلب عروض من الموردين واختيار الأنسب.",
      icon: Truck,
      tone: "accent",
      href: "/suppliers",
      cta: "الموردون",
      onClick: onSendToSuppliers,
    },
    {
      key: "contracts",
      title: "الترحيل إلى العقود ومراقبة التكلفة",
      desc: "استخدم التكاليف كخط أساس (Baseline) للعقود ومستخلصات المشروع.",
      icon: Wallet,
      tone: "warn",
      href: "/cost-control",
      cta: "مراقبة التكلفة",
      onClick: onSendToContracts,
    },
    {
      key: "reports",
      title: "التقارير التنفيذية",
      desc: "قوالب تقارير جاهزة (تنفيذي، تفصيلي، مقارنة) بضغطة واحدة.",
      icon: FileText,
      tone: "success",
      href: "/reports",
      cta: "مركز التقارير",
    },
    {
      key: "boq-lib",
      title: "قوالب البنود",
      desc: "استخدم قوالب معيارية للبنود المتكررة (سعودي BOQ / مصري).",
      icon: BookOpen,
      tone: "primary",
      href: "/boq-templates",
      cta: "القوالب",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Quick export bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="w-4 h-4 text-primary" />
          <span>تصدير سريع للتحليل الحالي:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onImportBoq && (
            <Button variant="outline" size="sm" onClick={onImportBoq} className="gap-1">
              <FileSpreadsheet className="w-4 h-4" /> استيراد Excel
            </Button>
          )}
          {onExportExcel && (
            <Button variant="outline" size="sm" onClick={onExportExcel} className="gap-1">
              <Download className="w-4 h-4" /> Excel
            </Button>
          )}
          {onExportPdf && (
            <Button variant="default" size="sm" onClick={onExportPdf} className="gap-1">
              <FileText className="w-4 h-4" /> PDF
            </Button>
          )}
        </div>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          const inner = (
            <div
              className={cn(
                "group h-full rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
                toneCls[t.tone],
              )}
              onClick={t.onClick}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-background/70 border border-border/50 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-bold text-sm mb-1 text-foreground">{t.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{t.desc}</p>
              <div className="inline-flex items-center gap-1 text-xs font-semibold">
                {t.cta}
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          );
          return t.href ? (
            <Link key={t.key} to={t.href} className="block h-full">
              {inner}
            </Link>
          ) : (
            <div key={t.key} className="h-full">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
