import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, FileText, Phone, Mail, Globe } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import jsPDF from "jspdf";
import QRCode from "qrcode";

interface Contract {
  id: string;
  contract_number: string;
  contract_title: string;
  contractor_name: string | null;
  contractor_license_number?: string | null;
  contractor_category?: string | null;
  contractor_address?: string | null;
  contractor_phone?: string | null;
  contractor_email?: string | null;
  contract_type: string;
  contract_value: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  contract_duration_months?: number | null;
  status: string;
  execution_percentage: number | null;
  retention_percentage?: number | null;
  advance_payment_percentage?: number | null;
  performance_bond_percentage?: number | null;
  variation_limit_percentage?: number | null;
  payment_terms?: string | null;
  scope_of_work?: string | null;
  notes?: string | null;
  terms_conditions?: string | null;
}

interface LegalContractPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
}

const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  fidic_red: { en: "FIDIC Red Book", ar: "فيديك الكتاب الأحمر" },
  fidic_yellow: { en: "FIDIC Yellow Book", ar: "فيديك الكتاب الأصفر" },
  fidic_silver: { en: "FIDIC Silver Book", ar: "فيديك الكتاب الفضي" },
  fidic_green: { en: "FIDIC Green Book", ar: "فيديك الكتاب الأخضر" },
  fidic_pink: { en: "FIDIC Pink Book", ar: "فيديك الكتاب الوردي" },
  fixed_price: { en: "Fixed Price Contract", ar: "عقد السعر الثابت" },
  cost_plus: { en: "Cost Plus Contract", ar: "عقد التكلفة زائد" },
  time_materials: { en: "Time & Materials", ar: "عقد الوقت والمواد" },
  unit_price: { en: "Unit Price Contract", ar: "عقد سعر الوحدة" },
  lump_sum: { en: "Lump Sum Contract", ar: "عقد المبلغ المقطوع" },
};

const numberToArabicWords = (num: number): string => {
  if (num === 0) return "صفر";
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const millionWord = millions === 1 ? "مليون" : millions === 2 ? "مليونان" : `${millions} ملايين`;
    return rest > 0 ? `${millionWord} و${numberToArabicWords(rest)}` : millionWord;
  }
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    const rest = num % 1000;
    const thousandWord = thousands === 1 ? "ألف" : thousands === 2 ? "ألفان" : `${numberToArabicWords(thousands)} آلاف`;
    return rest > 0 ? `${thousandWord} و${numberToArabicWords(rest)}` : thousandWord;
  }
  
  if (num >= 100) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    return rest > 0 ? `${hundreds[h]} و${numberToArabicWords(rest)}` : hundreds[h];
  }
  
  if (num >= 20) {
    const t = Math.floor(num / 10);
    const o = num % 10;
    return o > 0 ? `${ones[o]} و${tens[t]}` : tens[t];
  }
  
  if (num >= 10) {
    return teens[num - 10];
  }
  
  return ones[num];
};

export function LegalContractPreview({
  open,
  onOpenChange,
  contract,
}: LegalContractPreviewProps) {
  const { isArabic } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  // Company settings from localStorage
  const companySettings = JSON.parse(localStorage.getItem("company_settings") || "{}");
  const companyLogo = localStorage.getItem("company_logo") || "";

  const company = {
    nameEn: companySettings.name_en || "AL IMTYAZ ALWATANIYA CONT.",
    nameAr: companySettings.name_ar || "الإمتياز الوطنية للمقاولات",
    crNumber: companySettings.cr_number || "181551",
    address: companySettings.address || "Jeddah, Kingdom of Saudi Arabia",
    addressAr: companySettings.address_ar || "جدة، المملكة العربية السعودية",
    phone: companySettings.phone || "+966-12-677-3822",
    fax: companySettings.fax || "+966-12-677-3822",
    email: companySettings.email || "contact@imtyaz.sa",
    website: companySettings.website || "www.imtyaz.sa",
  };

  useEffect(() => {
    QRCode.toDataURL(window.location.href, { width: 100 })
      .then(setQrCodeUrl)
      .catch(console.error);
  }, []);

  const formatCurrency = (value: number, currency: string = "SAR") => {
    return new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: isArabic ? ar : enUS });
  };

  const getArabicOrdinal = (num: number): string => {
    const ordinals = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];
    return ordinals[num] || `${num}`;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !printRef.current) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <title>${isArabic ? "عقد مقاولة" : "Construction Contract"} - ${contract.contract_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Amiri:wght@400;700&display=swap');
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Cairo', 'Amiri', serif; 
            font-size: 14px;
            line-height: 1.8;
            padding: 40px;
            direction: rtl;
            background: white;
            color: #1a1a1a;
          }
          
          .contract-container {
            max-width: 800px;
            margin: 0 auto;
            border: 3px double #1e3a5f;
            padding: 40px;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #1e3a5f;
          }
          
          .header img {
            max-height: 70px;
            margin-bottom: 10px;
          }
          
          .company-names {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          
          .company-name-en {
            font-family: 'Times New Roman', serif;
            font-style: italic;
            font-size: 14px;
            color: #1e3a5f;
          }
          
          .company-name-ar {
            font-family: 'Cairo', sans-serif;
            font-weight: bold;
            font-size: 16px;
            color: #1e3a5f;
          }
          
          .blue-line {
            height: 3px;
            background: linear-gradient(90deg, #1e3a5f 0%, #3b82f6 50%, #1e3a5f 100%);
            margin: 15px 0;
          }
          
          .contract-title {
            text-align: center;
            margin: 30px 0;
          }
          
          .contract-title h1 {
            font-size: 28px;
            font-weight: bold;
            color: #1e3a5f;
            margin-bottom: 10px;
            letter-spacing: 4px;
          }
          
          .contract-title h2 {
            font-size: 20px;
            color: #374151;
            font-family: 'Times New Roman', serif;
            margin-bottom: 10px;
          }
          
          .contract-number {
            font-size: 16px;
            color: #6b7280;
            font-weight: 600;
          }
          
          .preamble {
            text-align: center;
            margin: 30px 0;
            font-size: 15px;
            line-height: 2;
          }
          
          .party-box {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            background: #f9fafb;
          }
          
          .party-title {
            font-weight: bold;
            font-size: 16px;
            color: #1e3a5f;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .party-info {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 8px;
            font-size: 14px;
          }
          
          .party-label {
            font-weight: 600;
            color: #374151;
          }
          
          .article {
            margin: 25px 0;
            page-break-inside: avoid;
          }
          
          .article-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e3a5f;
            margin-bottom: 15px;
            padding: 10px;
            background: linear-gradient(90deg, #f0f9ff 0%, transparent 100%);
            border-right: 4px solid #1e3a5f;
          }
          
          .article-content {
            padding: 15px;
            line-height: 2;
            text-align: justify;
          }
          
          .value-box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            text-align: center;
          }
          
          .value-amount {
            font-size: 24px;
            font-weight: bold;
            color: #0369a1;
          }
          
          .value-words {
            font-size: 14px;
            color: #374151;
            margin-top: 5px;
          }
          
          .financial-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          .financial-table th,
          .financial-table td {
            border: 1px solid #d1d5db;
            padding: 12px;
            text-align: center;
          }
          
          .financial-table th {
            background: #1e3a5f;
            color: white;
            font-weight: 600;
          }
          
          .financial-table td {
            background: #f9fafb;
          }
          
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 60px;
            page-break-inside: avoid;
          }
          
          .signature-box {
            text-align: center;
            padding: 20px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
          }
          
          .signature-title {
            font-weight: bold;
            font-size: 16px;
            color: #1e3a5f;
            margin-bottom: 40px;
          }
          
          .signature-line {
            border-bottom: 2px solid #374151;
            margin: 30px 40px;
          }
          
          .signature-label {
            font-size: 12px;
            color: #6b7280;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #1e3a5f;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 11px;
            color: #6b7280;
          }
          
          .footer-contact {
            display: flex;
            gap: 20px;
          }
          
          .footer-qr img {
            width: 70px;
            height: 70px;
          }
          
          .copies-note {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #374151;
            font-style: italic;
          }
          
          @media print {
            body { padding: 20px; }
            .contract-container { border: none; padding: 20px; }
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
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 25;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text(isArabic ? "عـقـد مـقـاولـة" : "CONSTRUCTION CONTRACT", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${isArabic ? "رقم العقد:" : "Contract #:"} ${contract.contract_number}`, pageWidth / 2, y, { align: "center" });
    y += 15;

    // Parties
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(isArabic ? "الطرف الأول (صاحب العمل)" : "First Party (Employer)", margin, y);
    y += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(`${company.nameAr} / ${company.nameEn}`, margin, y);
    y += 6;
    doc.text(`${isArabic ? "السجل التجاري:" : "CR:"} ${company.crNumber}`, margin, y);
    y += 15;

    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(isArabic ? "الطرف الثاني (المقاول)" : "Second Party (Contractor)", margin, y);
    y += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(contract.contractor_name || "-", margin, y);
    y += 6;
    if (contract.contractor_license_number) {
      doc.text(`${isArabic ? "رقم الترخيص:" : "License #:"} ${contract.contractor_license_number}`, margin, y);
      y += 6;
    }
    y += 15;

    // Contract Value
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(isArabic ? "قيمة العقد" : "Contract Value", margin, y);
    y += 8;
    
    doc.setFontSize(16);
    doc.setTextColor(3, 105, 161);
    doc.text(formatCurrency(contract.contract_value || 0, contract.currency), margin, y);
    y += 15;

    // Duration
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(isArabic ? "مدة العقد" : "Contract Duration", margin, y);
    y += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(`${isArabic ? "من:" : "From:"} ${formatDate(contract.start_date)}  ${isArabic ? "إلى:" : "To:"} ${formatDate(contract.end_date)}`, margin, y);
    y += 15;

    // QR Code
    if (qrCodeUrl) {
      try {
        doc.addImage(qrCodeUrl, "PNG", pageWidth - 35, 15, 20, 20);
      } catch (e) {
        console.error("QR Code error:", e);
      }
    }

    doc.save(`${isArabic ? "عقد" : "contract"}_${contract.contract_number}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isArabic ? "عرض العقد" : "Contract Preview"} - {contract.contract_number}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div ref={printRef} className="p-6" dir="rtl">
            {/* Contract Container */}
            <div className="border-[3px] border-double border-[#1e3a5f] p-8 bg-white">
              {/* Header */}
              <div className="text-center mb-8 pb-6 border-b-2 border-[#1e3a5f]">
                {companyLogo && (
                  <img src={companyLogo} alt="Company Logo" className="h-16 mx-auto mb-3" />
                )}
                <div className="flex justify-between items-center mb-3">
                  <span className="font-serif italic text-sm text-[#1e3a5f]">{company.nameEn}</span>
                  <span className="font-bold text-base text-[#1e3a5f]">{company.nameAr}</span>
                </div>
                <div className="h-[3px] bg-gradient-to-l from-[#1e3a5f] via-blue-500 to-[#1e3a5f]" />
              </div>

              {/* Contract Title */}
              <div className="text-center my-8">
                <h1 className="text-3xl font-bold text-[#1e3a5f] tracking-widest mb-3">
                  عـقـد مـقـاولـة
                </h1>
                <h2 className="text-xl text-gray-600 font-serif mb-3">
                  CONSTRUCTION CONTRACT
                </h2>
                <div className="h-px w-40 mx-auto bg-[#1e3a5f]" />
                <p className="text-base text-gray-500 mt-4 font-semibold">
                  {isArabic ? "رقم العقد:" : "Contract #:"} {contract.contract_number}
                </p>
                <Badge variant="outline" className="mt-2">
                  {isArabic 
                    ? TYPE_LABELS[contract.contract_type]?.ar || contract.contract_type
                    : TYPE_LABELS[contract.contract_type]?.en || contract.contract_type
                  }
                </Badge>
              </div>

              {/* Preamble */}
              <div className="text-center my-8 text-base leading-loose">
                أبرم هذا العقد في يوم {format(new Date(), "EEEE", { locale: ar })} الموافق {format(new Date(), "dd/MM/yyyy")} بين كل من:
              </div>

              {/* First Party */}
              <div className="border rounded-lg p-5 mb-4 bg-gray-50">
                <h3 className="font-bold text-lg text-[#1e3a5f] mb-4 pb-3 border-b">
                  الطرف الأول (صاحب العمل)
                </h3>
                <div className="grid grid-cols-[100px_1fr] gap-3 text-sm">
                  <span className="font-semibold text-gray-600">الاسم:</span>
                  <span>{company.nameAr}</span>
                  <span className="font-semibold text-gray-600">السجل التجاري:</span>
                  <span>{company.crNumber}</span>
                  <span className="font-semibold text-gray-600">العنوان:</span>
                  <span>{company.addressAr}</span>
                </div>
              </div>

              {/* Second Party */}
              <div className="border rounded-lg p-5 mb-8 bg-gray-50">
                <h3 className="font-bold text-lg text-[#1e3a5f] mb-4 pb-3 border-b">
                  الطرف الثاني (المقاول)
                </h3>
                <div className="grid grid-cols-[100px_1fr] gap-3 text-sm">
                  <span className="font-semibold text-gray-600">الاسم:</span>
                  <span>{contract.contractor_name || "-"}</span>
                  {contract.contractor_license_number && (
                    <>
                      <span className="font-semibold text-gray-600">رقم الترخيص:</span>
                      <span>{contract.contractor_license_number}</span>
                    </>
                  )}
                  {contract.contractor_category && (
                    <>
                      <span className="font-semibold text-gray-600">التصنيف:</span>
                      <span>{contract.contractor_category}</span>
                    </>
                  )}
                  {contract.contractor_address && (
                    <>
                      <span className="font-semibold text-gray-600">العنوان:</span>
                      <span>{contract.contractor_address}</span>
                    </>
                  )}
                  {(contract.contractor_phone || contract.contractor_email) && (
                    <>
                      <span className="font-semibold text-gray-600">التواصل:</span>
                      <span>
                        {contract.contractor_phone && <span>{contract.contractor_phone}</span>}
                        {contract.contractor_phone && contract.contractor_email && <span> | </span>}
                        {contract.contractor_email && <span>{contract.contractor_email}</span>}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Article 1: Subject */}
              <div className="my-6">
                <h4 className="text-base font-bold text-[#1e3a5f] mb-4 p-3 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f]">
                  البند {getArabicOrdinal(1)}: موضوع العقد
                </h4>
                <div className="px-4 leading-loose text-justify">
                  يلتزم الطرف الثاني بتنفيذ الأعمال التالية وفقاً للمواصفات والشروط المتفق عليها:
                  <div className="border rounded-lg p-4 mt-3 bg-gray-50">
                    {contract.scope_of_work || contract.contract_title}
                  </div>
                </div>
              </div>

              {/* Article 2: Value */}
              <div className="my-6">
                <h4 className="text-base font-bold text-[#1e3a5f] mb-4 p-3 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f]">
                  البند {getArabicOrdinal(2)}: قيمة العقد
                </h4>
                <div className="px-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {formatCurrency(contract.contract_value || 0, contract.currency)}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      ({numberToArabicWords(contract.contract_value || 0)} {contract.currency === "SAR" ? "ريال سعودي" : contract.currency} فقط لا غير)
                    </div>
                  </div>
                </div>
              </div>

              {/* Article 3: Duration */}
              <div className="my-6">
                <h4 className="text-base font-bold text-[#1e3a5f] mb-4 p-3 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f]">
                  البند {getArabicOrdinal(3)}: مدة العقد
                </h4>
                <div className="px-4 leading-loose">
                  <div className="flex justify-between items-center border-b pb-3 mb-3">
                    <span>تاريخ البدء: <strong>{formatDate(contract.start_date)}</strong></span>
                    <span>تاريخ الانتهاء: <strong>{formatDate(contract.end_date)}</strong></span>
                  </div>
                  {contract.contract_duration_months && (
                    <p>مدة التنفيذ: <strong>{contract.contract_duration_months} شهر</strong></p>
                  )}
                </div>
              </div>

              {/* Article 4: Financial Terms */}
              <div className="my-6">
                <h4 className="text-base font-bold text-[#1e3a5f] mb-4 p-3 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f]">
                  البند {getArabicOrdinal(4)}: الشروط المالية
                </h4>
                <div className="px-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#1e3a5f] text-white">
                        <th className="border p-3">الاحتجاز</th>
                        <th className="border p-3">الدفعة المقدمة</th>
                        <th className="border p-3">ضمان الأداء</th>
                        <th className="border p-3">حد التغييرات</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-gray-50">
                        <td className="border p-3 text-center font-bold">{contract.retention_percentage || 10}%</td>
                        <td className="border p-3 text-center font-bold">{contract.advance_payment_percentage || 20}%</td>
                        <td className="border p-3 text-center font-bold">{contract.performance_bond_percentage || 5}%</td>
                        <td className="border p-3 text-center font-bold">{contract.variation_limit_percentage || 15}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Article 5: Payment Terms */}
              {contract.payment_terms && (
                <div className="my-6">
                  <h4 className="text-base font-bold text-[#1e3a5f] mb-4 p-3 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f]">
                    البند {getArabicOrdinal(5)}: شروط الدفع
                  </h4>
                  <div className="px-4 leading-loose text-justify">
                    {contract.payment_terms}
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              {contract.notes && (
                <div className="my-6">
                  <h4 className="text-base font-bold text-[#1e3a5f] mb-4 p-3 bg-gradient-to-l from-blue-50 to-transparent border-r-4 border-[#1e3a5f]">
                    ملاحظات إضافية
                  </h4>
                  <div className="px-4 leading-loose text-justify">
                    {contract.notes}
                  </div>
                </div>
              )}

              {/* Copies Note */}
              <div className="text-center my-8 text-sm text-gray-600 italic">
                حرر هذا العقد من نسختين أصليتين، نسخة لكل طرف
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-10 mt-12">
                <div className="text-center p-5 border rounded-lg">
                  <h5 className="font-bold text-base text-[#1e3a5f] mb-10">الطرف الأول</h5>
                  <div className="border-b-2 border-gray-400 mx-10 my-8" />
                  <p className="text-xs text-gray-500">التوقيع والختم</p>
                </div>
                <div className="text-center p-5 border rounded-lg">
                  <h5 className="font-bold text-base text-[#1e3a5f] mb-10">الطرف الثاني</h5>
                  <div className="border-b-2 border-gray-400 mx-10 my-8" />
                  <p className="text-xs text-gray-500">التوقيع والختم</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-10 pt-5 border-t-2 border-[#1e3a5f] flex justify-between items-end text-xs text-gray-500">
                <div className="flex gap-5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {company.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {company.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {company.website}
                  </span>
                </div>
                {qrCodeUrl && (
                  <div>
                    <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isArabic ? "إغلاق" : "Close"}
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
    </Dialog>
  );
}
