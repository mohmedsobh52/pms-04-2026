import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Printer,
  Download,
  FileText,
  TrendingUp,
  DollarSign,
  Settings2,
  Eye,
  Table as TableIcon,
  PieChart,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  QrCode,
  FolderOpen,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { format, differenceInDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LegalContractPreview } from "./LegalContractPreview";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface Contract {
  id: string;
  contract_number: string;
  contract_title: string;
  contractor_name: string | null;
  contract_type: string;
  contract_value: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  execution_percentage: number | null;
}

interface ContractsPrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: Contract[];
  totalValue: number;
  activeCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280",
  pending: "#f59e0b",
  active: "#22c55e",
  on_hold: "#f97316",
  completed: "#3b82f6",
  terminated: "#ef4444",
};

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  draft: { en: "Draft", ar: "مسودة" },
  pending: { en: "Pending", ar: "معلق" },
  active: { en: "Active", ar: "نشط" },
  on_hold: { en: "On Hold", ar: "متوقف" },
  completed: { en: "Completed", ar: "مكتمل" },
  terminated: { en: "Terminated", ar: "منتهي" },
};

const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  fidic_red: { en: "FIDIC Red", ar: "فيديك الأحمر" },
  fidic_yellow: { en: "FIDIC Yellow", ar: "فيديك الأصفر" },
  fidic_silver: { en: "FIDIC Silver", ar: "فيديك الفضي" },
  fidic_green: { en: "FIDIC Green", ar: "فيديك الأخضر" },
  fidic_pink: { en: "FIDIC Pink", ar: "فيديك الوردي" },
  fixed_price: { en: "Fixed Price", ar: "سعر ثابت" },
  cost_plus: { en: "Cost Plus", ar: "التكلفة زائد" },
  time_materials: { en: "Time & Materials", ar: "الوقت والمواد" },
  unit_price: { en: "Unit Price", ar: "سعر الوحدة" },
  lump_sum: { en: "Lump Sum", ar: "مبلغ مقطوع" },
};

export function ContractsPrintPreview({
  open,
  onOpenChange,
  contracts,
  totalValue,
  activeCount,
}: ContractsPrintPreviewProps) {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Legal contract preview state
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isLegalPreviewOpen, setIsLegalPreviewOpen] = useState(false);

  // Project filter
  const [selectedProjectId, setSelectedProjectId] = useState("all");

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-contract-filter', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('project_data')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  // Report sections
  const [sections, setSections] = useState({
    summary: true,
    contractsTable: true,
    statusChart: true,
    valueChart: true,
  });

  // Print settings
  const [printSettings, setPrintSettings] = useState({
    orientation: "landscape" as "landscape" | "portrait",
    includeCompanyLogo: true,
    showQRCode: true,
    paperSize: "a4" as "a4" | "letter",
  });

  // Visible columns
  const [visibleColumns, setVisibleColumns] = useState({
    contractNumber: true,
    title: true,
    contractor: true,
    type: true,
    value: true,
    status: true,
    progress: true,
    startDate: false,
    endDate: false,
    actions: true,
  });

  // Status filter
  const [statusFilter, setStatusFilter] = useState("all");

  // Apply filters: status and project
  const statusFilteredContracts = statusFilter === "all"
    ? contracts
    : contracts.filter(c => c.status === statusFilter);

  const filteredContracts = selectedProjectId === "all"
    ? statusFilteredContracts
    : statusFilteredContracts.filter(c => (c as any).project_id === selectedProjectId);

  const formatCurrency = (value: number, currency: string = "SAR") => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getContractProgress = (contract: Contract) => {
    if (contract.execution_percentage) return contract.execution_percentage;
    if (!contract.start_date || !contract.end_date) return 0;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const now = new Date();
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  // Chart data
  const statusData = {
    labels: Object.entries(
      filteredContracts.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status]) => isArabic ? STATUS_LABELS[status]?.ar || status : STATUS_LABELS[status]?.en || status),
    datasets: [{
      data: Object.values(
        filteredContracts.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ),
      backgroundColor: Object.keys(
        filteredContracts.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(status => STATUS_COLORS[status] || "#6b7280"),
    }],
  };

  const valueData = {
    labels: filteredContracts.slice(0, 8).map(c => c.contract_title.slice(0, 20)),
    datasets: [{
      label: isArabic ? "القيمة (SAR)" : "Value (SAR)",
      data: filteredContracts.slice(0, 8).map(c => c.contract_value || 0),
      backgroundColor: "#3b82f6",
      borderRadius: 4,
    }],
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !printRef.current) return;

    const companyLogo = localStorage.getItem("company_logo") || "";
    const companySettings = JSON.parse(localStorage.getItem("company_settings") || "{}");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isArabic ? "rtl" : "ltr"}">
      <head>
        <title>${isArabic ? "تقرير العقود" : "Contracts Report"}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Cairo', sans-serif; 
            padding: 20px;
            direction: ${isArabic ? "rtl" : "ltr"};
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 20px;
          }
          .header img { max-height: 60px; margin-bottom: 10px; }
          .header h1 { font-size: 24px; color: #1e40af; }
          .header .date { color: #6b7280; font-size: 12px; margin-top: 8px; }
          
          .summary { 
            display: flex; 
            gap: 20px; 
            margin-bottom: 30px;
            flex-wrap: wrap;
          }
          .stat-card { 
            flex: 1; 
            min-width: 150px;
            padding: 15px; 
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 8px; 
            text-align: center;
            border: 1px solid #bae6fd;
          }
          .stat-card .value { font-size: 28px; font-weight: bold; color: #0369a1; }
          .stat-card .label { font-size: 12px; color: #64748b; }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px;
            font-size: 11px;
          }
          th, td { 
            border: 1px solid #e2e8f0; 
            padding: 10px 8px; 
            text-align: ${isArabic ? "right" : "left"};
          }
          th { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white; 
            font-weight: 600;
          }
          tr:nth-child(even) { background: #f8fafc; }
          tr:hover { background: #f1f5f9; }
          
          .progress-bar {
            width: 80px;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
            border-radius: 4px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
            color: white;
          }
          
          .charts-row {
            display: flex;
            gap: 30px;
            margin-bottom: 30px;
          }
          .chart-container {
            flex: 1;
            text-align: center;
          }
          .chart-container h3 {
            font-size: 14px;
            margin-bottom: 15px;
            color: #374151;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #6b7280;
          }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF({
      orientation: printSettings.orientation,
      unit: "mm",
      format: printSettings.paperSize,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    const title = isArabic ? "تقرير العقود" : "Contracts Report";
    doc.text(title, pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(format(new Date(), "yyyy-MM-dd"), pageWidth / 2, 28, { align: "center" });

    let currentY = 40;

    // Summary section
    if (sections.summary) {
      doc.setFontSize(12);
      doc.setTextColor(50);
      doc.text(isArabic ? "ملخص العقود" : "Contracts Summary", margin, currentY);
      currentY += 8;

      const summaryData = [
        [isArabic ? "إجمالي العقود" : "Total Contracts", filteredContracts.length.toString()],
        [isArabic ? "العقود النشطة" : "Active Contracts", activeCount.toString()],
        [isArabic ? "إجمالي القيمة" : "Total Value", formatCurrency(totalValue)],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [],
        body: summaryData,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 50 },
          1: { cellWidth: 60 },
        },
        margin: { left: margin, right: margin },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Contracts table
    if (sections.contractsTable) {
      const headers = [];
      if (visibleColumns.contractNumber) headers.push(isArabic ? "رقم العقد" : "Contract #");
      if (visibleColumns.title) headers.push(isArabic ? "العنوان" : "Title");
      if (visibleColumns.contractor) headers.push(isArabic ? "المقاول" : "Contractor");
      if (visibleColumns.type) headers.push(isArabic ? "النوع" : "Type");
      if (visibleColumns.value) headers.push(isArabic ? "القيمة" : "Value");
      if (visibleColumns.status) headers.push(isArabic ? "الحالة" : "Status");
      if (visibleColumns.progress) headers.push(isArabic ? "التقدم" : "Progress");

      const rows = filteredContracts.map(c => {
        const row = [];
        if (visibleColumns.contractNumber) row.push(c.contract_number);
        if (visibleColumns.title) row.push(c.contract_title.slice(0, 30));
        if (visibleColumns.contractor) row.push(c.contractor_name || "-");
        if (visibleColumns.type) row.push(isArabic ? TYPE_LABELS[c.contract_type]?.ar || c.contract_type : TYPE_LABELS[c.contract_type]?.en || c.contract_type);
        if (visibleColumns.value) row.push(formatCurrency(c.contract_value || 0, c.currency));
        if (visibleColumns.status) row.push(isArabic ? STATUS_LABELS[c.status]?.ar || c.status : STATUS_LABELS[c.status]?.en || c.status);
        if (visibleColumns.progress) row.push(`${getContractProgress(c)}%`);
        return row;
      });

      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: rows,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [30, 64, 175] },
        margin: { left: margin, right: margin },
      });
    }

    // QR Code
    if (printSettings.showQRCode) {
      try {
        const qrDataUrl = await QRCode.toDataURL(window.location.href, { width: 80 });
        doc.addImage(qrDataUrl, "PNG", pageWidth - 35, 10, 20, 20);
      } catch (e) {
        console.error("QR generation failed:", e);
      }
    }

    doc.save(isArabic ? "تقرير_العقود.pdf" : "contracts_report.pdf");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            {isArabic ? "معاينة الطباعة" : "Print Preview"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4">
          {/* Settings Panel */}
          <div className="col-span-1 space-y-4 border-e pe-4">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                {isArabic ? "الأقسام" : "Sections"}
              </h4>
              
              <div className="space-y-2">
                {[
                  { key: "summary", icon: TrendingUp, label: { en: "Summary Stats", ar: "الملخص الإحصائي" } },
                  { key: "contractsTable", icon: TableIcon, label: { en: "Contracts Table", ar: "جدول العقود" } },
                  { key: "statusChart", icon: PieChart, label: { en: "Status Chart", ar: "مخطط الحالات" } },
                  { key: "valueChart", icon: BarChart3, label: { en: "Value Chart", ar: "مخطط القيم" } },
                ].map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    <Checkbox
                      id={item.key}
                      checked={sections[item.key as keyof typeof sections]}
                      onCheckedChange={(checked) => 
                        setSections(prev => ({ ...prev, [item.key]: !!checked }))
                      }
                    />
                    <Label htmlFor={item.key} className="flex items-center gap-1 text-sm cursor-pointer">
                      <item.icon className="w-3 h-3" />
                      {isArabic ? item.label.ar : item.label.en}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <TableIcon className="w-4 h-4" />
                {isArabic ? "الأعمدة" : "Columns"}
              </h4>
              
              <div className="space-y-2">
                {[
                  { key: "contractNumber", label: { en: "Contract #", ar: "رقم العقد" } },
                  { key: "title", label: { en: "Title", ar: "العنوان" } },
                  { key: "contractor", label: { en: "Contractor", ar: "المقاول" } },
                  { key: "type", label: { en: "Type", ar: "النوع" } },
                  { key: "value", label: { en: "Value", ar: "القيمة" } },
                  { key: "status", label: { en: "Status", ar: "الحالة" } },
                  { key: "progress", label: { en: "Progress", ar: "التقدم" } },
                  { key: "startDate", label: { en: "Start Date", ar: "تاريخ البدء" } },
                  { key: "endDate", label: { en: "End Date", ar: "تاريخ الانتهاء" } },
                  { key: "actions", label: { en: "Actions", ar: "إجراءات" } },
                ].map(col => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${col.key}`}
                      checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                      onCheckedChange={(checked) => 
                        setVisibleColumns(prev => ({ ...prev, [col.key]: !!checked }))
                      }
                    />
                    <Label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">
                      {isArabic ? col.label.ar : col.label.en}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">{isArabic ? "إعدادات" : "Settings"}</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{isArabic ? "عرضي" : "Landscape"}</Label>
                  <Switch
                    checked={printSettings.orientation === "landscape"}
                    onCheckedChange={(checked) => 
                      setPrintSettings(prev => ({ ...prev, orientation: checked ? "landscape" : "portrait" }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-1">
                    <QrCode className="w-3 h-3" />
                    {isArabic ? "QR Code" : "QR Code"}
                  </Label>
                  <Switch
                    checked={printSettings.showQRCode}
                    onCheckedChange={(checked) => 
                      setPrintSettings(prev => ({ ...prev, showQRCode: checked }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    {isArabic ? "المشروع" : "Project"}
                  </Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isArabic ? "جميع المشاريع" : "All Projects"}</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">{isArabic ? "تصفية الحالة" : "Status Filter"}</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
                      <SelectItem value="draft">{isArabic ? "مسودة" : "Draft"}</SelectItem>
                      <SelectItem value="active">{isArabic ? "نشط" : "Active"}</SelectItem>
                      <SelectItem value="completed">{isArabic ? "مكتمل" : "Completed"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="col-span-3">
            <ScrollArea className="h-[60vh] border rounded-lg p-4 bg-white">
              <div ref={printRef} className="space-y-6">
                {/* Header */}
                <div className="text-center border-b pb-4">
                  <h1 className="text-2xl font-bold text-blue-800">
                    {isArabic ? "تقرير العقود" : "Contracts Report"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(), "yyyy-MM-dd")}
                  </p>
                </div>

                {/* Summary */}
                {sections.summary && (
                  <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-700">{filteredContracts.length}</p>
                        <p className="text-xs text-blue-600">{isArabic ? "إجمالي العقود" : "Total Contracts"}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="p-4 text-center">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold text-green-700">{activeCount}</p>
                        <p className="text-xs text-green-600">{isArabic ? "عقود نشطة" : "Active"}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="p-4 text-center">
                        <Building2 className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                        <p className="text-2xl font-bold text-purple-700">
                          {new Set(filteredContracts.map(c => c.contractor_name)).size}
                        </p>
                        <p className="text-xs text-purple-600">{isArabic ? "المقاولين" : "Contractors"}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                      <CardContent className="p-4 text-center">
                        <DollarSign className="w-6 h-6 mx-auto mb-2 text-cyan-600" />
                        <p className="text-lg font-bold text-cyan-700">{formatCurrency(totalValue)}</p>
                        <p className="text-xs text-cyan-600">{isArabic ? "إجمالي القيمة" : "Total Value"}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Charts */}
                {(sections.statusChart || sections.valueChart) && (
                  <div className="grid grid-cols-2 gap-6">
                    {sections.statusChart && filteredContracts.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{isArabic ? "توزيع الحالات" : "Status Distribution"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-48">
                            <Pie data={statusData} options={{ responsive: true, maintainAspectRatio: false }} />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {sections.valueChart && filteredContracts.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{isArabic ? "قيم العقود" : "Contract Values"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-48">
                            <Bar 
                              data={valueData} 
                              options={{ 
                                responsive: true, 
                                maintainAspectRatio: false,
                                scales: {
                                  y: { beginAtZero: true }
                                }
                              }} 
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Contracts Table */}
                {sections.contractsTable && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TableIcon className="w-4 h-4" />
                        {isArabic ? "قائمة العقود" : "Contracts List"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-primary hover:bg-primary">
                            {visibleColumns.contractNumber && <TableHead className="text-primary-foreground">{isArabic ? "رقم العقد" : "Contract #"}</TableHead>}
                            {visibleColumns.title && <TableHead className="text-primary-foreground">{isArabic ? "العنوان" : "Title"}</TableHead>}
                            {visibleColumns.contractor && <TableHead className="text-primary-foreground">{isArabic ? "المقاول" : "Contractor"}</TableHead>}
                            {visibleColumns.type && <TableHead className="text-primary-foreground">{isArabic ? "النوع" : "Type"}</TableHead>}
                            {visibleColumns.value && <TableHead className="text-primary-foreground">{isArabic ? "القيمة" : "Value"}</TableHead>}
                            {visibleColumns.status && <TableHead className="text-primary-foreground">{isArabic ? "الحالة" : "Status"}</TableHead>}
                            {visibleColumns.progress && <TableHead className="text-primary-foreground">{isArabic ? "التقدم" : "Progress"}</TableHead>}
                            {visibleColumns.startDate && <TableHead className="text-primary-foreground">{isArabic ? "البدء" : "Start"}</TableHead>}
                            {visibleColumns.endDate && <TableHead className="text-primary-foreground">{isArabic ? "الانتهاء" : "End"}</TableHead>}
                            {visibleColumns.actions && <TableHead className="text-primary-foreground no-print">{isArabic ? "إجراءات" : "Actions"}</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredContracts.map((contract, idx) => (
                            <TableRow key={contract.id} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                              {visibleColumns.contractNumber && <TableCell className="font-mono text-xs">{contract.contract_number}</TableCell>}
                              {visibleColumns.title && <TableCell className="font-medium">{contract.contract_title}</TableCell>}
                              {visibleColumns.contractor && <TableCell>{contract.contractor_name || "-"}</TableCell>}
                              {visibleColumns.type && (
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {isArabic 
                                      ? TYPE_LABELS[contract.contract_type]?.ar || contract.contract_type
                                      : TYPE_LABELS[contract.contract_type]?.en || contract.contract_type
                                    }
                                  </Badge>
                                </TableCell>
                              )}
                              {visibleColumns.value && <TableCell className="font-mono">{formatCurrency(contract.contract_value || 0, contract.currency)}</TableCell>}
                              {visibleColumns.status && (
                                <TableCell>
                                  <Badge 
                                    style={{ backgroundColor: STATUS_COLORS[contract.status] }} 
                                    className="text-white text-xs"
                                  >
                                    {isArabic 
                                      ? STATUS_LABELS[contract.status]?.ar || contract.status
                                      : STATUS_LABELS[contract.status]?.en || contract.status
                                    }
                                  </Badge>
                                </TableCell>
                              )}
                              {visibleColumns.progress && (
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={getContractProgress(contract)} className="h-2 w-16" />
                                    <span className="text-xs">{getContractProgress(contract)}%</span>
                                  </div>
                                </TableCell>
                              )}
                              {visibleColumns.startDate && (
                                <TableCell className="text-xs">
                                  {contract.start_date ? format(new Date(contract.start_date), "yyyy-MM-dd") : "-"}
                                </TableCell>
                              )}
                              {visibleColumns.endDate && (
                                <TableCell className="text-xs">
                                  {contract.end_date ? format(new Date(contract.end_date), "yyyy-MM-dd") : "-"}
                                </TableCell>
                              )}
                              {visibleColumns.actions && (
                                <TableCell className="no-print">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => {
                                      setSelectedContract(contract as any);
                                      setIsLegalPreviewOpen(true);
                                    }}
                                  >
                                    <Eye className="w-3 h-3" />
                                    {isArabic ? "عرض" : "View"}
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            {isArabic ? "طباعة" : "Print"}
          </Button>
          <Button onClick={handleExportPDF} className="gap-2">
            <Download className="w-4 h-4" />
            {isArabic ? "تنزيل PDF" : "Export PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Legal Contract Preview Dialog */}
      {selectedContract && (
        <LegalContractPreview
          open={isLegalPreviewOpen}
          onOpenChange={setIsLegalPreviewOpen}
          contract={selectedContract}
        />
      )}
    </Dialog>
  );
}
