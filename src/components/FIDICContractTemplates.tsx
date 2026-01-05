import { useState } from "react";
import { 
  FileText, 
  Download, 
  Eye, 
  Copy,
  BookOpen,
  Scale,
  Building2,
  Shield,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Languages,
  FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, ShadingType, PageBreak } from "docx";

// FIDIC Contract Types
const FIDIC_CONTRACT_TYPES = [
  {
    id: "red_book",
    nameEn: "Red Book (Construction)",
    nameAr: "الكتاب الأحمر (البناء)",
    descriptionEn: "Conditions of Contract for Construction for Building and Engineering Works Designed by the Employer",
    descriptionAr: "شروط العقد للإنشاءات لأعمال البناء والهندسة المصممة من قبل صاحب العمل",
    color: "bg-red-500",
    useCases: ["Building construction", "Infrastructure projects", "Civil engineering"],
    useCasesAr: ["إنشاء المباني", "مشاريع البنية التحتية", "الهندسة المدنية"]
  },
  {
    id: "yellow_book",
    nameEn: "Yellow Book (Plant & Design-Build)",
    nameAr: "الكتاب الأصفر (التصميم والبناء)",
    descriptionEn: "Conditions of Contract for Plant and Design-Build for Electrical and Mechanical Plant and for Building and Engineering Works Designed by the Contractor",
    descriptionAr: "شروط العقد للتصميم والبناء للمحطات الكهربائية والميكانيكية وأعمال البناء والهندسة المصممة من قبل المقاول",
    color: "bg-yellow-500",
    useCases: ["Design-build projects", "Turnkey projects", "Industrial plants"],
    useCasesAr: ["مشاريع التصميم والبناء", "المشاريع الجاهزة", "المحطات الصناعية"]
  },
  {
    id: "silver_book",
    nameEn: "Silver Book (EPC/Turnkey)",
    nameAr: "الكتاب الفضي (EPC/تسليم مفتاح)",
    descriptionEn: "Conditions of Contract for EPC/Turnkey Projects - Contractor takes most risks",
    descriptionAr: "شروط العقد لمشاريع EPC/تسليم المفتاح - يتحمل المقاول معظم المخاطر",
    color: "bg-gray-400",
    useCases: ["Large industrial projects", "Power plants", "Process plants"],
    useCasesAr: ["المشاريع الصناعية الكبيرة", "محطات الطاقة", "مصانع العمليات"]
  },
  {
    id: "green_book",
    nameEn: "Green Book (Short Form)",
    nameAr: "الكتاب الأخضر (النموذج القصير)",
    descriptionEn: "Short Form of Contract for simple or repetitive works of short duration",
    descriptionAr: "نموذج العقد القصير للأعمال البسيطة أو المتكررة قصيرة المدة",
    color: "bg-green-500",
    useCases: ["Small projects", "Minor works", "Maintenance contracts"],
    useCasesAr: ["المشاريع الصغيرة", "الأعمال الثانوية", "عقود الصيانة"]
  },
  {
    id: "pink_book",
    nameEn: "Pink Book (MDB Harmonised)",
    nameAr: "الكتاب الوردي (MDB المنسق)",
    descriptionEn: "Conditions of Contract for Construction - Multilateral Development Bank Harmonised Edition",
    descriptionAr: "شروط العقد للإنشاءات - النسخة المنسقة لبنوك التنمية متعددة الأطراف",
    color: "bg-pink-500",
    useCases: ["World Bank projects", "ADB projects", "Development bank financing"],
    useCasesAr: ["مشاريع البنك الدولي", "مشاريع بنك التنمية الآسيوي", "تمويل بنوك التنمية"]
  }
];

// FIDIC Key Clauses for Subcontracts
const FIDIC_SUBCONTRACT_CLAUSES = {
  general: [
    {
      clauseNo: "1",
      titleEn: "General Provisions",
      titleAr: "الأحكام العامة",
      contentEn: "Definitions, interpretation, communications, and governing law provisions applicable to the subcontract.",
      contentAr: "التعريفات والتفسير والاتصالات وأحكام القانون الحاكم المطبقة على عقد الباطن."
    },
    {
      clauseNo: "2",
      titleEn: "The Contractor",
      titleAr: "المقاول",
      contentEn: "Contractor's obligations, right of access, permits, and cooperation with the Subcontractor.",
      contentAr: "التزامات المقاول وحق الوصول والتصاريح والتعاون مع مقاول الباطن."
    },
    {
      clauseNo: "3",
      titleEn: "The Subcontractor",
      titleAr: "مقاول الباطن",
      contentEn: "Subcontractor's general obligations, performance security, and key personnel requirements.",
      contentAr: "الالتزامات العامة لمقاول الباطن وضمان الأداء ومتطلبات الموظفين الرئيسيين."
    }
  ],
  execution: [
    {
      clauseNo: "4",
      titleEn: "Design (if applicable)",
      titleAr: "التصميم (إن وجد)",
      contentEn: "Design obligations, errors in documents, and approval procedures.",
      contentAr: "التزامات التصميم والأخطاء في المستندات وإجراءات الموافقة."
    },
    {
      clauseNo: "5",
      titleEn: "Staff and Labour",
      titleAr: "الموظفون والعمالة",
      contentEn: "Working hours, wages, safety regulations, and health standards.",
      contentAr: "ساعات العمل والأجور ولوائح السلامة ومعايير الصحة."
    },
    {
      clauseNo: "6",
      titleEn: "Plant, Materials and Workmanship",
      titleAr: "المعدات والمواد والحرفية",
      contentEn: "Quality assurance, samples, inspection, and testing requirements.",
      contentAr: "ضمان الجودة والعينات والفحص ومتطلبات الاختبار."
    },
    {
      clauseNo: "7",
      titleEn: "Programme",
      titleAr: "البرنامج الزمني",
      contentEn: "Subcontractor's programme, progress reports, and coordination requirements.",
      contentAr: "برنامج مقاول الباطن وتقارير التقدم ومتطلبات التنسيق."
    }
  ],
  completion: [
    {
      clauseNo: "8",
      titleEn: "Commencement, Delays and Suspension",
      titleAr: "البدء والتأخيرات والتعليق",
      contentEn: "Start of work, extension of time, delay damages, and suspension procedures.",
      contentAr: "بدء العمل وتمديد الوقت وتعويضات التأخير وإجراءات التعليق."
    },
    {
      clauseNo: "9",
      titleEn: "Testing and Completion",
      titleAr: "الاختبار والإنجاز",
      contentEn: "Testing on completion, completion certificate, and taking over procedures.",
      contentAr: "الاختبار عند الإنجاز وشهادة الإنجاز وإجراءات التسلم."
    },
    {
      clauseNo: "10",
      titleEn: "Defects Liability",
      titleAr: "مسؤولية العيوب",
      contentEn: "Defects notification period, remedying defects, and performance certificate.",
      contentAr: "فترة الإخطار بالعيوب وإصلاح العيوب وشهادة الأداء."
    }
  ],
  payment: [
    {
      clauseNo: "11",
      titleEn: "Payment",
      titleAr: "الدفع",
      contentEn: "Contract price, payment applications, interim payments, and final payment.",
      contentAr: "سعر العقد وطلبات الدفع والمدفوعات المرحلية والدفع النهائي."
    },
    {
      clauseNo: "12",
      titleEn: "Variations and Adjustments",
      titleAr: "التغييرات والتعديلات",
      contentEn: "Variation procedures, valuation of variations, and adjustments for changes in legislation.",
      contentAr: "إجراءات التغيير وتقييم التغييرات والتعديلات للتغييرات في التشريعات."
    }
  ],
  disputes: [
    {
      clauseNo: "13",
      titleEn: "Claims and Disputes",
      titleAr: "المطالبات والنزاعات",
      contentEn: "Claims procedure, Dispute Adjudication Board, amicable settlement, and arbitration.",
      contentAr: "إجراء المطالبات ومجلس فض النزاعات والتسوية الودية والتحكيم."
    },
    {
      clauseNo: "14",
      titleEn: "Termination",
      titleAr: "الإنهاء",
      contentEn: "Termination by Contractor, termination by Subcontractor, and payment after termination.",
      contentAr: "الإنهاء من قبل المقاول والإنهاء من قبل مقاول الباطن والدفع بعد الإنهاء."
    }
  ]
};

// Subcontractor Template Structure
interface SubcontractTemplate {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  fidic_type: string;
  contentEn: string;
  contentAr: string;
  sections: Array<{
    titleEn: string;
    titleAr: string;
    contentEn: string;
    contentAr: string;
  }>;
}

const SUBCONTRACT_TEMPLATES: SubcontractTemplate[] = [
  {
    id: "civil_works",
    nameEn: "Civil Works Subcontract",
    nameAr: "عقد باطن أعمال مدنية",
    descriptionEn: "Standard subcontract for civil and structural works",
    descriptionAr: "عقد باطن قياسي للأعمال المدنية والإنشائية",
    fidic_type: "red_book",
    contentEn: "SUBCONTRACT AGREEMENT FOR CIVIL WORKS",
    contentAr: "اتفاقية عقد الباطن للأعمال المدنية",
    sections: [
      {
        titleEn: "Scope of Work",
        titleAr: "نطاق العمل",
        contentEn: "The Subcontractor shall execute the civil and structural works including but not limited to:\n- Excavation and earthworks\n- Concrete works (foundations, columns, beams, slabs)\n- Structural steelwork installation\n- Masonry and blockwork\n- Waterproofing and insulation",
        contentAr: "يجب على مقاول الباطن تنفيذ الأعمال المدنية والإنشائية بما في ذلك على سبيل المثال لا الحصر:\n- الحفر وأعمال التربة\n- أعمال الخرسانة (الأساسات والأعمدة والكمرات والبلاطات)\n- تركيب الهياكل المعدنية\n- أعمال البناء بالطوب\n- العزل المائي والحراري"
      },
      {
        titleEn: "Performance Security",
        titleAr: "ضمان الأداء",
        contentEn: "The Subcontractor shall provide a performance security in the form of a bank guarantee for 10% of the Subcontract Price, valid until the Defects Liability Period expires.",
        contentAr: "يجب على مقاول الباطن تقديم ضمان أداء في شكل ضمان بنكي بنسبة 10% من قيمة عقد الباطن، صالح حتى انتهاء فترة مسؤولية العيوب."
      },
      {
        titleEn: "Programme and Progress",
        titleAr: "البرنامج الزمني والتقدم",
        contentEn: "The Subcontractor shall submit a detailed programme within 14 days of the Subcontract Date, showing the sequence, timing, and dependencies of all activities.",
        contentAr: "يجب على مقاول الباطن تقديم برنامج تفصيلي خلال 14 يوماً من تاريخ عقد الباطن، يوضح تسلسل وتوقيت وترابط جميع الأنشطة."
      },
      {
        titleEn: "Payment Terms",
        titleAr: "شروط الدفع",
        contentEn: "Monthly progress payments based on certified work completed. 10% retention to be released: 50% upon Taking Over, 50% upon Performance Certificate issuance.",
        contentAr: "مدفوعات شهرية على أساس العمل المعتمد المنجز. محتجزات 10% يتم تحريرها: 50% عند التسلم، و50% عند إصدار شهادة الأداء."
      },
      {
        titleEn: "Defects Liability Period",
        titleAr: "فترة مسؤولية العيوب",
        contentEn: "12 months from the date of Taking Over Certificate, during which the Subcontractor shall remedy any defects at their own cost.",
        contentAr: "12 شهراً من تاريخ شهادة التسلم، يلتزم خلالها مقاول الباطن بإصلاح أي عيوب على نفقته الخاصة."
      }
    ]
  },
  {
    id: "mep_works",
    nameEn: "MEP Works Subcontract",
    nameAr: "عقد باطن أعمال ميكانيكية وكهربائية",
    descriptionEn: "Standard subcontract for mechanical, electrical and plumbing works",
    descriptionAr: "عقد باطن قياسي للأعمال الميكانيكية والكهربائية والسباكة",
    fidic_type: "yellow_book",
    contentEn: "SUBCONTRACT AGREEMENT FOR MEP WORKS",
    contentAr: "اتفاقية عقد الباطن لأعمال MEP",
    sections: [
      {
        titleEn: "Scope of Work",
        titleAr: "نطاق العمل",
        contentEn: "The Subcontractor shall design, supply, install, test and commission:\n- HVAC systems\n- Electrical power and lighting systems\n- Fire detection and suppression systems\n- Plumbing and drainage systems\n- Building Management System (BMS)",
        contentAr: "يجب على مقاول الباطن تصميم وتوريد وتركيب واختبار وتشغيل:\n- أنظمة التكييف والتهوية\n- أنظمة الطاقة الكهربائية والإنارة\n- أنظمة كشف وإطفاء الحريق\n- أنظمة السباكة والصرف\n- نظام إدارة المبنى (BMS)"
      },
      {
        titleEn: "Design Responsibility",
        titleAr: "مسؤولية التصميم",
        contentEn: "The Subcontractor is responsible for the complete design of MEP systems according to the Employer's Requirements and applicable codes.",
        contentAr: "مقاول الباطن مسؤول عن التصميم الكامل لأنظمة MEP وفقاً لمتطلبات صاحب العمل والأكواد المعمول بها."
      },
      {
        titleEn: "Testing and Commissioning",
        titleAr: "الاختبار والتشغيل",
        contentEn: "Comprehensive testing and commissioning of all MEP systems, including 72-hour continuous operation tests and seasonal performance verification.",
        contentAr: "اختبار وتشغيل شامل لجميع أنظمة MEP، بما في ذلك اختبارات التشغيل المستمر لمدة 72 ساعة والتحقق من الأداء الموسمي."
      },
      {
        titleEn: "Warranties",
        titleAr: "الضمانات",
        contentEn: "Manufacturer's warranties for major equipment (minimum 2 years). Workmanship warranty for 12 months from Taking Over.",
        contentAr: "ضمانات الشركة المصنعة للمعدات الرئيسية (حد أدنى سنتان). ضمان الحرفية لمدة 12 شهراً من التسلم."
      }
    ]
  },
  {
    id: "finishing_works",
    nameEn: "Finishing Works Subcontract",
    nameAr: "عقد باطن أعمال التشطيبات",
    descriptionEn: "Standard subcontract for interior finishing works",
    descriptionAr: "عقد باطن قياسي لأعمال التشطيبات الداخلية",
    fidic_type: "red_book",
    contentEn: "SUBCONTRACT AGREEMENT FOR FINISHING WORKS",
    contentAr: "اتفاقية عقد الباطن لأعمال التشطيبات",
    sections: [
      {
        titleEn: "Scope of Work",
        titleAr: "نطاق العمل",
        contentEn: "The Subcontractor shall provide all labour, materials and equipment for:\n- Internal plastering and rendering\n- Painting and decorative finishes\n- Floor finishes (tiles, marble, wood)\n- Ceiling works (gypsum, suspended)\n- Joinery and carpentry",
        contentAr: "يجب على مقاول الباطن توفير جميع العمالة والمواد والمعدات لـ:\n- اللياسة والرندرة الداخلية\n- الدهانات والتشطيبات الزخرفية\n- تشطيبات الأرضيات (بلاط، رخام، خشب)\n- أعمال الأسقف (جبس، معلق)\n- النجارة والأعمال الخشبية"
      },
      {
        titleEn: "Quality Standards",
        titleAr: "معايير الجودة",
        contentEn: "All works shall comply with approved samples and mock-ups. The Subcontractor shall prepare sample rooms for approval before proceeding with finishing works.",
        contentAr: "يجب أن تتوافق جميع الأعمال مع العينات المعتمدة والنماذج. يجب على مقاول الباطن إعداد غرف عينة للموافقة قبل المضي في أعمال التشطيب."
      },
      {
        titleEn: "Protection of Works",
        titleAr: "حماية الأعمال",
        contentEn: "The Subcontractor shall protect all completed finishes from damage by other trades until Taking Over.",
        contentAr: "يجب على مقاول الباطن حماية جميع التشطيبات المكتملة من الضرر من الحرف الأخرى حتى التسلم."
      }
    ]
  },
  {
    id: "landscape_works",
    nameEn: "Landscape Works Subcontract",
    nameAr: "عقد باطن أعمال تنسيق المواقع",
    descriptionEn: "Standard subcontract for landscaping and external works",
    descriptionAr: "عقد باطن قياسي لأعمال تنسيق المواقع والأعمال الخارجية",
    fidic_type: "green_book",
    contentEn: "SUBCONTRACT AGREEMENT FOR LANDSCAPE WORKS",
    contentAr: "اتفاقية عقد الباطن لأعمال تنسيق المواقع",
    sections: [
      {
        titleEn: "Scope of Work",
        titleAr: "نطاق العمل",
        contentEn: "The Subcontractor shall provide:\n- Soft landscaping (planting, lawns, irrigation)\n- Hard landscaping (paving, kerbs, street furniture)\n- External lighting\n- Playground equipment installation\n- Maintenance during establishment period",
        contentAr: "يجب على مقاول الباطن توفير:\n- تنسيق المواقع الناعم (الزراعة، المسطحات الخضراء، الري)\n- تنسيق المواقع الصلب (الرصف، الأرصفة، أثاث الشوارع)\n- الإنارة الخارجية\n- تركيب معدات الملاعب\n- الصيانة خلال فترة التأسيس"
      },
      {
        titleEn: "Plant Guarantee",
        titleAr: "ضمان النباتات",
        contentEn: "All plants shall be guaranteed for 12 months from planting. Dead or dying plants shall be replaced at Subcontractor's cost.",
        contentAr: "جميع النباتات مضمونة لمدة 12 شهراً من الزراعة. يجب استبدال النباتات الميتة أو المحتضرة على نفقة مقاول الباطن."
      }
    ]
  }
];

export function FIDICContractTemplates() {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<SubcontractTemplate | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<"en" | "ar">(isArabic ? "ar" : "en");

  const handleCopyTemplate = (template: SubcontractTemplate) => {
    const content = activeLanguage === "ar" 
      ? `${template.contentAr}\n\n${template.sections.map(s => `${s.titleAr}\n${s.contentAr}`).join("\n\n")}`
      : `${template.contentEn}\n\n${template.sections.map(s => `${s.titleEn}\n${s.contentEn}`).join("\n\n")}`;
    
    navigator.clipboard.writeText(content);
    toast({
      title: isArabic ? "تم النسخ" : "Copied",
      description: isArabic ? "تم نسخ القالب إلى الحافظة" : "Template copied to clipboard"
    });
  };

  const handleDownloadTemplate = (template: SubcontractTemplate) => {
    const content = activeLanguage === "ar" 
      ? `${template.contentAr}\n\n${template.sections.map(s => `${s.titleAr}\n${s.contentAr}`).join("\n\n")}`
      : `${template.contentEn}\n\n${template.sections.map(s => `${s.titleEn}\n${s.contentEn}`).join("\n\n")}`;
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${template.id}_subcontract_${activeLanguage}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: isArabic ? "تم التحميل" : "Downloaded",
      description: isArabic ? "تم تحميل القالب" : "Template downloaded"
    });
  };

  const handleExportToWord = async (template: SubcontractTemplate) => {
    const fidic = FIDIC_CONTRACT_TYPES.find(f => f.id === template.fidic_type);
    const isAr = activeLanguage === "ar";
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 400 },
            children: [
              new TextRun({
                text: isAr ? "عقد مقاولة من الباطن" : "SUBCONTRACT AGREEMENT",
                bold: true,
                size: 48,
                color: "2563EB",
              }),
            ],
          }),
          // FIDIC Type Badge
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 300 },
            children: [
              new TextRun({
                text: isAr ? `وفقاً لنظام فيديك - ${fidic?.nameAr || ""}` : `Based on FIDIC - ${fidic?.nameEn || ""}`,
                size: 24,
                italics: true,
                color: "64748B",
              }),
            ],
          }),
          // Template Title
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: isAr ? template.contentAr : template.contentEn,
                bold: true,
                size: 36,
              }),
            ],
          }),
          // Description
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 400 },
            children: [
              new TextRun({
                text: isAr ? template.descriptionAr : template.descriptionEn,
                size: 22,
                color: "64748B",
              }),
            ],
          }),
          // Date
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 600 },
            children: [
              new TextRun({
                text: `${isAr ? "التاريخ" : "Date"}: ${new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
                size: 20,
              }),
            ],
          }),
          // Separator
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
                color: "E2E8F0",
              }),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),
          // Sections
          ...template.sections.flatMap((section, idx) => [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
              shading: {
                type: ShadingType.SOLID,
                fill: "F8FAFC",
              },
              children: [
                new TextRun({
                  text: `${idx + 1}. ${isAr ? section.titleAr : section.titleEn}`,
                  bold: true,
                  size: 28,
                  color: "1E293B",
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 100, after: 300 },
              children: [
                new TextRun({
                  text: isAr ? section.contentAr : section.contentEn,
                  size: 22,
                }),
              ],
            }),
          ]),
          // Footer
          new Paragraph({
            spacing: { before: 800 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: isAr 
                  ? "تم إنشاء هذا العقد وفقاً لمعايير فيديك الدولية"
                  : "This contract was generated according to FIDIC International Standards",
                italics: true,
                size: 18,
                color: "94A3B8",
              }),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FIDIC_${template.id}_${activeLanguage}.docx`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: isArabic ? "تم التصدير" : "Exported",
      description: isArabic ? "تم تصدير العقد إلى Word بنجاح" : "Contract exported to Word successfully"
    });
  };

  return (
    <div className="space-y-6">
      {/* FIDIC Overview */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-orange-500/10 to-red-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Scale className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {isArabic ? "عقود فيديك (FIDIC)" : "FIDIC Contracts"}
                <Badge variant="outline" className="text-xs">
                  {isArabic ? "معيار دولي" : "International Standard"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? "الاتحاد الدولي للمهندسين الاستشاريين - معايير العقود الهندسية الدولية"
                  : "International Federation of Consulting Engineers - International Engineering Contract Standards"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Contract Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {FIDIC_CONTRACT_TYPES.map((type) => (
              <div
                key={type.id}
                className="p-4 rounded-lg border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-3 h-3 rounded-full", type.color)} />
                  <span className="font-medium text-sm">
                    {isArabic ? type.nameAr : type.nameEn}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {isArabic ? type.descriptionAr : type.descriptionEn}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(isArabic ? type.useCasesAr : type.useCases).slice(0, 2).map((use, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {use}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FIDIC Subcontract Clauses Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {isArabic ? "بنود عقد الباطن حسب فيديك" : "FIDIC Subcontract Clauses"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {Object.entries(FIDIC_SUBCONTRACT_CLAUSES).map(([category, clauses]) => (
              <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="capitalize">
                    {category === "general" && (isArabic ? "أحكام عامة" : "General Provisions")}
                    {category === "execution" && (isArabic ? "التنفيذ" : "Execution")}
                    {category === "completion" && (isArabic ? "الإنجاز" : "Completion")}
                    {category === "payment" && (isArabic ? "الدفع" : "Payment")}
                    {category === "disputes" && (isArabic ? "النزاعات" : "Disputes")}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {clauses.map((clause) => (
                      <div key={clause.clauseNo} className="p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {isArabic ? `بند ${clause.clauseNo}` : `Clause ${clause.clauseNo}`}
                          </Badge>
                          <span className="font-medium text-sm">
                            {isArabic ? clause.titleAr : clause.titleEn}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? clause.contentAr : clause.contentEn}
                        </p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Subcontract Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {isArabic ? "قوالب عقود الباطن" : "Subcontract Templates"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-muted-foreground" />
              <Button
                variant={activeLanguage === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveLanguage("en")}
              >
                English
              </Button>
              <Button
                variant={activeLanguage === "ar" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveLanguage("ar")}
              >
                العربية
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUBCONTRACT_TEMPLATES.map((template) => {
              const fidic = FIDIC_CONTRACT_TYPES.find(f => f.id === template.fidic_type);
              return (
                <Card key={template.id} className="overflow-hidden">
                  <div className={cn("h-1", fidic?.color || "bg-gray-500")} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">
                          {activeLanguage === "ar" ? template.nameAr : template.nameEn}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {activeLanguage === "ar" ? template.descriptionAr : template.descriptionEn}
                        </p>
                      </div>
                      <Badge className={cn(fidic?.color, "text-white text-xs")}>
                        {fidic?.id.replace("_", " ")}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 flex-1"
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <Eye className="w-4 h-4" />
                            {isArabic ? "معاينة" : "Preview"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>
                              {activeLanguage === "ar" ? template.nameAr : template.nameEn}
                            </DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[60vh]">
                            <div className="space-y-4 p-4" dir={activeLanguage === "ar" ? "rtl" : "ltr"}>
                              <h2 className="text-xl font-bold text-center border-b pb-4">
                                {activeLanguage === "ar" ? template.contentAr : template.contentEn}
                              </h2>
                              {template.sections.map((section, idx) => (
                                <div key={idx} className="space-y-2">
                                  <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                                      {idx + 1}
                                    </span>
                                    {activeLanguage === "ar" ? section.titleAr : section.titleEn}
                                  </h3>
                                  <p className="text-sm whitespace-pre-line text-muted-foreground">
                                    {activeLanguage === "ar" ? section.contentAr : section.contentEn}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleCopyTemplate(template)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleExportToWord(template)}
                      >
                        <FileDown className="w-4 h-4" />
                        Word
                      </Button>
                      
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleDownloadTemplate(template)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
