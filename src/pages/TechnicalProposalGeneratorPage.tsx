import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Download, Save, FileText, Trash2, Upload, FileType, LayoutTemplate, X, Copy, Copy as CopyIcon, Search, CheckSquare, Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateProposalDocx } from "@/lib/proposalDocx";

type SavedProject = { id: string; name: string };
type ProposalRow = {
  id: string;
  title: string;
  client_name: string | null;
  created_at: string;
  language: string | null;
  content: string | null;
  validity_days?: number | null;
  payment_terms?: string | null;
  inputs?: any;
};


const ALL_SECTIONS = [
  { id: "cover", ar: "صفحة الغلاف والملخص التنفيذي", en: "Cover & Executive Summary" },
  { id: "introduction", ar: "المقدمة وفهم المشروع", en: "Introduction & Understanding" },
  { id: "scope", ar: "نطاق الأعمال", en: "Scope of Work" },
  { id: "methodology", ar: "منهجية التنفيذ", en: "Execution Methodology" },
  { id: "timeline", ar: "الجدول الزمني والمراحل", en: "Schedule & Milestones" },
  { id: "team", ar: "فريق العمل", en: "Project Team" },
  { id: "quality", ar: "إدارة الجودة", en: "Quality Management" },
  { id: "hse", ar: "الصحة والسلامة (HSE)", en: "Health, Safety & Environment" },
  { id: "risk", ar: "إدارة المخاطر", en: "Risk Management" },
  { id: "resources", ar: "الموارد والمعدات", en: "Resources & Equipment" },
  { id: "procurement", ar: "خطة المشتريات", en: "Procurement Plan" },
  { id: "subcontracting", ar: "خطة المقاولين من الباطن", en: "Subcontracting Plan" },
  { id: "mobilization", ar: "خطة التعبئة والتجهيز للموقع", en: "Site Mobilization Plan" },
  { id: "communication", ar: "خطة الاتصال", en: "Communication Plan" },
  { id: "stakeholders", ar: "خطة أصحاب المصلحة", en: "Stakeholder Management Plan" },
  { id: "change", ar: "إدارة التغيير والمطالبات", en: "Change & Claims Management" },
  { id: "sustainability", ar: "الاستدامة والبيئة", en: "Sustainability & Environment" },
  { id: "bim", ar: "الحلول الرقمية و BIM", en: "Digital Solutions & BIM" },
  { id: "training", ar: "التدريب ونقل المعرفة", en: "Training & Knowledge Transfer" },
  { id: "pricing", ar: "الملخص المالي", en: "Financial Summary" },
  { id: "warranty", ar: "الضمانات وما بعد التسليم", en: "Warranty & Handover" },
  { id: "references", ar: "الخبرات المرجعية", en: "Reference Projects" },
  { id: "compliance", ar: "الامتثال والاشتراطات النظامية", en: "Compliance & Regulatory" },
  { id: "assumptions", ar: "الافتراضات والاستثناءات", en: "Assumptions & Exclusions" },
];

const DEFAULT_SECTIONS = ALL_SECTIONS.map((s) => s.id);

const TEMPLATES = [
  {
    id: "building",
    ar: "مباني سكنية/تجارية",
    en: "Residential / Commercial Building",
    scope_ar: "تنفيذ مبنى متعدد الطوابق يشمل الأعمال الإنشائية والمعمارية والكهروميكانيكية والتشطيبات النهائية حتى التسليم.",
    scope_en: "Multi-story building including civil, architectural, MEP works and final finishes up to handover.",
    extra_ar: "الالتزام بكود البناء السعودي، استخدام مواد معتمدة، فترة ضمان 12 شهراً.",
    extra_en: "Comply with local building code, certified materials only, 12-month warranty.",
  },
  {
    id: "infra",
    ar: "بنية تحتية / طرق",
    en: "Infrastructure / Roads",
    scope_ar: "أعمال طرق وبنية تحتية تشمل الحفر والردم والأسفلت وشبكات الصرف والإنارة وعلامات المرور.",
    scope_en: "Roads & infrastructure: earthworks, asphalt, drainage, lighting and road markings.",
    extra_ar: "اختبارات MARSHALL وCBR، اعتماد المختبر، خطة مرور أثناء التنفيذ.",
    extra_en: "MARSHALL & CBR tests, accredited lab, traffic management plan during execution.",
  },
  {
    id: "mep",
    ar: "أعمال كهروميكانيكية (MEP)",
    en: "MEP Works",
    scope_ar: "توريد وتركيب أنظمة التكييف والكهرباء والسباكة والإطفاء مع التشغيل والاختبار والتسليم.",
    scope_en: "Supply and install HVAC, electrical, plumbing and fire-fighting systems with T&C and handover.",
    extra_ar: "أجهزة معتمدة من الدفاع المدني، Commissioning كامل قبل التسليم.",
    extra_en: "Civil Defense approved equipment, full commissioning before handover.",
  },
  {
    id: "renovation",
    ar: "ترميم وإعادة تأهيل",
    en: "Renovation & Refurbishment",
    scope_ar: "ترميم وتأهيل المبنى القائم مع تدعيم إنشائي وتجديد التشطيبات والأنظمة دون تعطيل التشغيل.",
    scope_en: "Refurbish existing building with structural strengthening and finish/system renewal without disrupting operations.",
    extra_ar: "العمل خارج ساعات الذروة، حماية المحتويات، إدارة المخلفات.",
    extra_en: "Off-peak working hours, content protection, waste management plan.",
  },
  {
    id: "maintenance",
    ar: "عقد صيانة سنوي",
    en: "Annual Maintenance Contract",
    scope_ar: "صيانة وقائية وتصحيحية شاملة للمرافق على مدار السنة مع SLA وزمن استجابة محدد.",
    scope_en: "Comprehensive preventive & corrective facility maintenance with defined SLA and response times.",
    extra_ar: "زمن استجابة ≤ 4 ساعات للأعطال الحرجة، تقارير شهرية، فريق دائم في الموقع.",
    extra_en: "≤4h response for critical faults, monthly reports, dedicated on-site team.",
  },
];

export default function TechnicalProposalGeneratorPage() {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [projectId, setProjectId] = useState<string>("none");
  const [title, setTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [client, setClient] = useState("");
  const [scope, setScope] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [currency, setCurrency] = useState("SAR");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [sections, setSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [extra, setExtra] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [boqSummary, setBoqSummary] = useState("");
  const [content, setContent] = useState("");
  const [proposalNumber, setProposalNumber] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<ProposalRow[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFrom, setHistoryFrom] = useState<string>("");
  const [historyTo, setHistoryTo] = useState<string>("");
  const [historySort, setHistorySort] = useState<"new" | "old" | "title">("new");
  const [validityDays, setValidityDays] = useState<string>(() => localStorage.getItem("tp_validity_days") || "30");
  const [paymentTerms, setPaymentTerms] = useState<string>(() => localStorage.getItem("tp_payment_terms") || "");
  const [currentProposalId, setCurrentProposalId] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState<boolean>(() => localStorage.getItem("tp_autosave") !== "0");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const previewRef = useRef<HTMLDivElement>(null);


  useEffect(() => { localStorage.setItem("tp_validity_days", validityDays); }, [validityDays]);
  useEffect(() => { localStorage.setItem("tp_payment_terms", paymentTerms); }, [paymentTerms]);
  useEffect(() => { localStorage.setItem("tp_autosave", autoSave ? "1" : "0"); }, [autoSave]);


  // Branding & signature (persisted locally)
  const [companyName, setCompanyName] = useState<string>(() => localStorage.getItem("tp_company_name") || "");
  const [logoDataUrl, setLogoDataUrl] = useState<string>(() => localStorage.getItem("tp_company_logo") || "");
  const [signName, setSignName] = useState<string>(() => localStorage.getItem("tp_sign_name") || "");
  const [signTitle, setSignTitle] = useState<string>(() => localStorage.getItem("tp_sign_title") || "");
  const [signDate, setSignDate] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => { localStorage.setItem("tp_company_name", companyName); }, [companyName]);
  useEffect(() => { localStorage.setItem("tp_company_logo", logoDataUrl); }, [logoDataUrl]);
  useEffect(() => { localStorage.setItem("tp_sign_name", signName); }, [signName]);
  useEffect(() => { localStorage.setItem("tp_sign_title", signTitle); }, [signTitle]);

  const handleLogoUpload = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("الصورة كبيرة جداً (حد أقصى 2MB)", "Image too large (max 2MB)"), variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const applyTemplate = (id: string) => {
    const tpl = TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    setScope(isArabic ? tpl.scope_ar : tpl.scope_en);
    setExtra(isArabic ? tpl.extra_ar : tpl.extra_en);
    if (!title) setTitle(isArabic ? tpl.ar : tpl.en);
    toast({ title: t("تم تطبيق القالب", "Template applied") });
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from("technical_proposals" as any)
      .select("id,title,client_name,created_at,language,content,validity_days,payment_terms,inputs")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory(((data as unknown) as ProposalRow[]) ?? []);
  };


  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("saved_projects")
        .select("id,name")
        .order("updated_at", { ascending: false });
      setProjects((data as SavedProject[]) ?? []);
    })();
    loadHistory();
  }, []);

  // Pull BOQ summary when a project is selected
  useEffect(() => {
    if (projectId === "none") {
      setBoqSummary("");
      return;
    }
    (async () => {
      const proj = projects.find((p) => p.id === projectId);
      if (proj && !title) setTitle(proj.name);
      const { data: pd } = await supabase
        .from("project_data")
        .select("total_value,currency,items_count,name")
        .eq("id", projectId)
        .maybeSingle();
      const { data: items } = await supabase
        .from("project_items")
        .select("description,quantity,unit,total_price")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .limit(15);
      const lines = (items ?? []).map(
        (it: any) =>
          `- ${it.description ?? ""} | ${it.quantity ?? ""} ${it.unit ?? ""} | ${
            it.total_price ? Number(it.total_price).toLocaleString("en-US") : ""
          }`,
      );
      const header = pd
        ? `Total: ${Number(pd.total_value ?? 0).toLocaleString("en-US")} ${pd.currency ?? ""} | Items: ${pd.items_count ?? 0}`
        : "";
      setBoqSummary([header, ...lines].filter(Boolean).join("\n"));
      if (pd?.total_value && !budget) setBudget(String(pd.total_value));
      if (pd?.currency) setCurrency(pd.currency);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const toggleSection = (id: string) =>
    setSections((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast({ title: t("عنوان المشروع مطلوب", "Project title required"), variant: "destructive" });
      titleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      titleInputRef.current?.focus();
      return;
    }
    setLoading(true);
    setContent("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-technical-proposal", {
        body: {
          title,
          client_name: client,
          project_scope: scope,
          duration_months: duration ? Number(duration) : undefined,
          budget: budget ? Number(budget) : undefined,
          currency,
          language,
          sections,
          extra_context: [
            extra,
            validityDays ? (isArabic ? `صلاحية العرض: ${validityDays} يوماً` : `Proposal validity: ${validityDays} days`) : "",
            paymentTerms ? (isArabic ? `شروط الدفع: ${paymentTerms}` : `Payment terms: ${paymentTerms}`) : "",
          ].filter(Boolean).join("\n"),
          boq_summary: boqSummary,
          model,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = (data as any)?.content || "";
      if (!text) throw new Error(t("لم يتم توليد محتوى", "No content generated"));
      setContent(text);
      // Auto-assign next proposal number
      try {
        const { data: num } = await supabase.rpc("next_proposal_number" as any, { _user: user?.id });
        if (num) setProposalNumber(String(num));
      } catch { /* non-fatal */ }
      toast({ title: t("تم توليد العرض الفني", "Proposal generated") });
    } catch (e: any) {
      toast({ title: t("خطأ", "Error"), description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (opts?: { silent?: boolean }) => {
    if (!content) return;
    const silent = !!opts?.silent;
    if (silent) setAutoSaveStatus("saving"); else setSaving(true);
    try {
      const payload: any = {
        user_id: user?.id,
        project_id: projectId === "none" ? null : projectId,
        title,
        client_name: client || null,
        project_scope: scope || null,
        duration_months: duration ? Number(duration) : null,
        budget: budget ? Number(budget) : null,
        currency,
        language,
        sections,
        inputs: { extra, boqSummary, companyName, signName, signTitle, signDate },
        validity_days: validityDays ? Number(validityDays) : null,
        payment_terms: paymentTerms || null,
        content,
        model,
        status: "draft",
        proposal_number: proposalNumber || null,
      };
      if (currentProposalId) {
        const { error } = await supabase.from("technical_proposals" as any).update(payload).eq("id", currentProposalId);
        if (error) throw error;
        if (!silent) toast({ title: t("تم التحديث", "Updated") });
      } else {
        const { data, error } = await supabase.from("technical_proposals" as any).insert(payload).select("id").maybeSingle();
        if (error) throw error;
        if ((data as any)?.id) setCurrentProposalId((data as any).id);
        if (!silent) toast({ title: t("تم الحفظ", "Saved") });
      }
      if (silent) setAutoSaveStatus("saved");
      loadHistory();
    } catch (e: any) {
      if (silent) setAutoSaveStatus("error");
      else toast({ title: t("خطأ", "Error"), description: e.message, variant: "destructive" });
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Auto-save with debounce
  const autoSaveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!autoSave || !content || !user) return;
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus("idle");
    autoSaveTimer.current = window.setTimeout(() => {
      handleSave({ silent: true });
    }, 1500);
    return () => { if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, sections, title, client, validityDays, paymentTerms, autoSave]);


  const handleCopyMd = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      // Auto-select rendered preview text after copy so the user can re-copy as rich text if needed
      if (previewRef.current) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(previewRef.current);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      toast({ title: t("تم النسخ (Markdown) وتحديد النص", "Copied (Markdown) & text selected") });
    } catch {
      toast({ title: t("فشل النسخ", "Copy failed"), variant: "destructive" });
    }
  };


  const handleDuplicate = () => {
    setCurrentProposalId(null);
    setProposalNumber("");
    setTitle((prev) => prev ? `${prev} (${t("نسخة", "Copy")})` : prev);
    toast({ title: t("جاهز لحفظ نسخة جديدة", "Ready to save as new copy") });
  };

  const stats = useMemo(() => {
    if (!content) return null;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const readMin = Math.max(1, Math.round(words / 200));
    return { words, readMin };
  }, [content]);

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    const from = historyFrom ? new Date(historyFrom).getTime() : null;
    const to = historyTo ? new Date(historyTo).getTime() + 86_400_000 : null;
    const list = history.filter((h) => {
      if (q && !(h.title?.toLowerCase().includes(q) || (h.client_name || "").toLowerCase().includes(q))) return false;
      const ts = new Date(h.created_at).getTime();
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });
    list.sort((a, b) => {
      if (historySort === "title") return (a.title || "").localeCompare(b.title || "");
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return historySort === "old" ? ta - tb : tb - ta;
    });
    return list;
  }, [history, historyQuery, historyFrom, historyTo, historySort]);


  const handleDownloadMd = () => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "technical-proposal"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildPrintHtml = () => {
    const dir = language === "ar" ? "rtl" : "ltr";
    const align = language === "ar" ? "right" : "left";
    const signedLabel = language === "ar" ? "المُقدِّم" : "Submitted by";
    const nameLabel = language === "ar" ? "الاسم" : "Name";
    const titleLabel = language === "ar" ? "المنصب" : "Position";
    const dateLabel = language === "ar" ? "التاريخ" : "Date";
    const sigLabel = language === "ar" ? "التوقيع" : "Signature";

    const validityLabel = language === "ar" ? "صلاحية العرض" : "Proposal validity";
    const paymentLabel = language === "ar" ? "شروط الدفع" : "Payment terms";
    const daysLabel = language === "ar" ? "يوم" : "days";
    const numLabel = language === "ar" ? "رقم العرض" : "Proposal No.";

    const header = `
      <div class="cover">
        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="logo" class="logo"/>` : ""}
        ${companyName ? `<div class="company">${companyName}</div>` : ""}
        <h1>${title || ""}</h1>
        ${client ? `<div class="client">${language === "ar" ? "مُقدَّم إلى:" : "Prepared for:"} <strong>${client}</strong></div>` : ""}
        <div class="meta">${proposalNumber ? `${numLabel}: <strong>${proposalNumber}</strong> · ` : ""}${signDate}</div>
        ${(validityDays || paymentTerms) ? `<div class="terms">
          ${validityDays ? `<span><strong>${validityLabel}:</strong> ${validityDays} ${daysLabel}</span>` : ""}
          ${paymentTerms ? `<span><strong>${paymentLabel}:</strong> ${paymentTerms}</span>` : ""}
        </div>` : ""}
      </div>`;


    const signature = (signName || signTitle) ? `
      <div class="signature">
        <h3>${signedLabel}</h3>
        <table class="sig">
          <tr><td><strong>${nameLabel}:</strong> ${signName || ""}</td><td><strong>${titleLabel}:</strong> ${signTitle || ""}</td></tr>
          <tr><td><strong>${dateLabel}:</strong> ${signDate}</td><td><strong>${sigLabel}:</strong> ____________________</td></tr>
        </table>
      </div>` : "";

    return `<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:${language === "ar" ? "'Cairo','Tajawal'" : "'Tajawal'"},system-ui,sans-serif;max-width:820px;margin:32px auto;padding:0 24px;color:#1a1a1a;line-height:1.7}
.cover{text-align:center;border-bottom:3px solid #0f4f4a;padding-bottom:24px;margin-bottom:24px}
.cover .logo{max-height:90px;margin:0 auto 12px;display:block}
.cover .company{font-size:14px;color:#555;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}
.cover h1{color:#0f4f4a;margin:8px 0;font-size:28px}
.cover .client{margin-top:8px;color:#444}
.cover .meta{margin-top:6px;color:#888;font-size:13px}
.cover .terms{margin-top:10px;display:flex;gap:18px;justify-content:center;flex-wrap:wrap;font-size:13px;color:#444}

h1,h2,h3{color:#0f4f4a;margin-top:1.4em}
h2{border-bottom:1px solid #ddd;padding-bottom:6px}
table{border-collapse:collapse;width:100%;margin:12px 0}
th,td{border:1px solid #ccc;padding:8px;text-align:${align}}
th{background:#f5f5f5}
code{background:#f3f3f3;padding:2px 5px;border-radius:3px}
.signature{margin-top:48px;padding-top:24px;border-top:2px solid #0f4f4a;page-break-inside:avoid}
.signature h3{color:#0f4f4a;margin-bottom:12px}
.sig td{border:none;padding:10px 8px;border-bottom:1px solid #ddd}
@media print{.cover{page-break-after:avoid}}
</style></head><body>${header}${markdownToHtml(content)}${signature}</body></html>`;
  };

  const handlePrintPdf = () => {
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildPrintHtml());
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const handleDownloadWord = async () => {
    if (!content) return;
    try {
      const blob = await generateProposalDocx({
        title, client, companyName, logoDataUrl,
        proposalNumber, signName, signTitle, signDate,
        language, markdown: content,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${proposalNumber || title || "technical-proposal"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: t("خطأ في توليد Word", "Word generation failed"), description: e.message, variant: "destructive" });
    }
  };

  const handleLoad = (p: ProposalRow) => {
    setCurrentProposalId(p.id);
    setTitle(p.title);
    setClient(p.client_name || "");
    setLanguage((p.language as any) || "ar");
    setContent(p.content || "");
    if (p.validity_days != null) setValidityDays(String(p.validity_days));
    if (p.payment_terms) setPaymentTerms(p.payment_terms);
    const inp = (p as any).inputs || {};
    if (inp.extra) setExtra(inp.extra);
    if (inp.companyName) setCompanyName(inp.companyName);
    if (inp.signName) setSignName(inp.signName);
    if (inp.signTitle) setSignTitle(inp.signTitle);
    if (inp.signDate) setSignDate(inp.signDate);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  const handleNewProposal = () => {
    setCurrentProposalId(null);
    setProposalNumber("");
    setContent("");
    setTitle("");
    setClient("");
    setScope("");
    toast({ title: t("جاهز لعرض جديد", "Ready for new proposal") });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("حذف العرض؟", "Delete proposal?"))) return;
    const { error } = await supabase.from("technical_proposals" as any).delete().eq("id", id);
    if (error) toast({ title: t("خطأ", "Error"), description: error.message, variant: "destructive" });
    else loadHistory();
  };

  const sectionRows = useMemo(() => ALL_SECTIONS, []);

  return (
    <AppShell>
      <div dir={isArabic ? "rtl" : "ltr"} className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <header className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("مولّد العروض الفنية", "Technical Proposal Generator")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("أنشئ عروضاً فنية احترافية بالذكاء الاصطناعي", "Generate professional technical proposals with AI")}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inputs */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">{t("بيانات العرض", "Proposal Inputs")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-2"><LayoutTemplate className="w-4 h-4" />{t("قالب جاهز", "Ready template")}</Label>
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue placeholder={t("اختر قالباً لتعبئة الحقول...", "Pick a template to prefill...")} /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>{isArabic ? tpl.ar : tpl.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t("مشروع موجود (اختياري)", "Existing project (optional)")}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("بدون - عرض مستقل", "None - standalone")}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Branding */}
              <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground">{t("الهوية والتوقيع", "Branding & Signature")}</p>
                <div>
                  <Label className="text-xs">{t("اسم الشركة", "Company name")}</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">{t("شعار الشركة", "Company logo")}</Label>
                  {logoDataUrl ? (
                    <div className="flex items-center gap-2 mt-1">
                      <img src={logoDataUrl} alt="logo" className="h-12 border border-border rounded bg-white p-1" />
                      <Button variant="ghost" size="sm" onClick={() => setLogoDataUrl("")}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="mt-1 flex items-center gap-2 text-xs cursor-pointer border border-dashed border-border rounded-md px-3 py-2 hover:bg-muted">
                      <Upload className="w-4 h-4" />
                      <span>{t("رفع شعار (PNG/JPG ≤ 2MB)", "Upload logo (PNG/JPG ≤ 2MB)")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("اسم المُقدِّم", "Signed by")}</Label>
                    <Input value={signName} onChange={(e) => setSignName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("المنصب", "Position")}</Label>
                    <Input value={signTitle} onChange={(e) => setSignTitle(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t("التاريخ", "Date")}</Label>
                  <Input type="text" placeholder="yyyy-MM-dd" value={signDate} onChange={(e) => setSignDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("صلاحية العرض (يوم)", "Validity (days)")}</Label>
                    <Input type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("شروط الدفع", "Payment terms")}</Label>
                    <Input placeholder={t("مثال: 30/60/10", "e.g., 30/60/10")} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                  </div>
                </div>
              </div>


              <div>
                <Label>{t("عنوان المشروع *", "Project title *")}</Label>
                <Input ref={titleInputRef} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div>
                <Label>{t("العميل / الجهة", "Client / Entity")}</Label>
                <Input value={client} onChange={(e) => setClient(e.target.value)} />
              </div>

              <div>
                <Label>{t("نطاق المشروع", "Project scope")}</Label>
                <Textarea rows={3} value={scope} onChange={(e) => setScope(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{t("المدة (شهر)", "Duration (months)")}</Label>
                  <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
                <div>
                  <Label>{t("الميزانية", "Budget")}</Label>
                  <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{t("العملة", "Currency")}</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["SAR", "AED", "USD", "EUR", "EGP", "KWD", "QAR"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("لغة العرض", "Language")}</Label>
                  <Select value={language} onValueChange={(v: "ar" | "en") => setLanguage(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{t("نموذج الذكاء الاصطناعي", "AI Model")}</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash ({t("مجاني · سريع", "Free · Fast")})</SelectItem>
                    <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite ({t("مجاني · الأسرع", "Free · Fastest")})</SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro ({t("مدفوع · جودة عالية", "Paid · High quality")})</SelectItem>
                    <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash Preview ({t("مدفوع", "Paid")})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t("سياق إضافي", "Extra context")}</Label>
                <Textarea
                  rows={3}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={t("متطلبات خاصة، مواصفات، اشتراطات...", "Special requirements, specs...")}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="block">{t("الأقسام المطلوبة", "Sections to include")} <span className="text-xs text-muted-foreground">({sections.length}/{sectionRows.length})</span></Label>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSections(ALL_SECTIONS.map((s) => s.id))}>
                      <CheckSquare className="w-3 h-3 me-1" />{t("الكل", "All")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSections([])}>
                      <Square className="w-3 h-3 me-1" />{t("لا شيء", "None")}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-auto pe-2">
                  {sectionRows.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={sections.includes(s.id)}
                        onCheckedChange={() => toggleSection(s.id)}
                      />
                      <span>{isArabic ? s.ar : s.en}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={handleGenerate} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Sparkles className="w-4 h-4 me-2" />}
                {t("توليد العرض", "Generate Proposal")}
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                {t("المعاينة", "Preview")}
                {proposalNumber && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">{proposalNumber}</span>
                )}
                {currentProposalId && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">{t("وضع التحرير", "Editing")}</span>
                )}
                {stats && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {stats.words.toLocaleString("en-US")} {t("كلمة", "words")} · ~{stats.readMin} {t("دقيقة قراءة", "min read")}
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                {content && (
                  <Button variant="ghost" size="sm" onClick={handleNewProposal}>
                    <Sparkles className="w-4 h-4 me-1" />{t("جديد", "New")}
                  </Button>
                )}
                {currentProposalId && (
                  <Button variant="ghost" size="sm" onClick={handleDuplicate}>
                    <CopyIcon className="w-4 h-4 me-1" />{t("تكرار", "Duplicate")}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleCopyMd} disabled={!content}>
                  <Copy className="w-4 h-4 me-1" />{t("نسخ", "Copy")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSave()} disabled={!content || saving}>
                  {saving ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />}
                  {currentProposalId ? t("تحديث", "Update") : t("حفظ", "Save")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadMd} disabled={!content}>
                  <Download className="w-4 h-4 me-1" />MD
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadWord} disabled={!content}>
                  <FileType className="w-4 h-4 me-1" />Word
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrintPdf} disabled={!content}>
                  <FileText className="w-4 h-4 me-1" />PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading && !content && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm">{t("جاري توليد العرض الفني...", "Generating proposal...")}</p>
                </div>
              )}
              {!loading && !content && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground text-center">
                  <Sparkles className="w-10 h-10 opacity-40" />
                  <p className="text-sm">
                    {t("املأ البيانات واضغط \"توليد العرض\"", "Fill the form and click 'Generate Proposal'")}
                  </p>
                </div>
              )}
              {content && (
                <>
                  <div
                    dir={language === "ar" ? "rtl" : "ltr"}
                    className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:text-primary prose-table:text-sm"
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  </div>
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      {t("تحرير Markdown", "Edit Markdown")}
                    </summary>
                    <Textarea
                      className="mt-2 font-mono text-xs"
                      rows={14}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  </details>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">
                {t("العروض المحفوظة", "Saved Proposals")} <span className="text-xs text-muted-foreground font-normal">({filteredHistory.length}/{history.length})</span>
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute start-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="ps-8 h-9"
                  placeholder={t("بحث بالعنوان أو العميل...", "Search by title or client...")}
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("لا توجد نتائج", "No results")}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredHistory.map((p) => (
                    <div
                      key={p.id}
                      className={`border rounded-lg p-3 bg-card/60 hover:border-primary/40 transition-colors flex flex-col gap-2 ${currentProposalId === p.id ? "border-primary" : "border-border"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.client_name || t("بدون عميل", "No client")} · {new Date(p.created_at).toLocaleDateString("en-US")}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{p.language?.toUpperCase()}</span>
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleLoad(p)}>
                          {t("فتح", "Open")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

// Minimal markdown -> HTML for print preview (no extra deps).
function markdownToHtml(md: string): string {
  let html = md;
  // Tables
  html = html.replace(/((?:^\|.*\|\s*\n)+)/gm, (block) => {
    const rows = block.trim().split("\n").map((r) => r.trim());
    if (rows.length < 2) return block;
    const head = rows[0].split("|").slice(1, -1).map((c) => `<th>${c.trim()}</th>`).join("");
    const body = rows.slice(2).map((r) =>
      `<tr>${r.split("|").slice(1, -1).map((c) => `<td>${c.trim()}</td>`).join("")}</tr>`
    ).join("");
    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  });
  html = html
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^(?!<)(.+)$/gm, "$1");
  return `<p>${html}</p>`;
}
