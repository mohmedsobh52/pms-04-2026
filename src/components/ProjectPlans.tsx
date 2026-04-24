import { useState } from "react";
import {
  ShieldCheck,
  FileText,
  Users,
  MessageSquare,
  AlertTriangle,
  UserPlus,
  Workflow,
  Stamp,
  Sparkles,
  Loader2,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface ProjectPlansProps {
  projectName?: string;
  itemsCount?: number;
  isArabic: boolean;
}

type PlanKey =
  | "quality"
  | "method"
  | "stakeholder"
  | "communication"
  | "risk"
  | "staffing"
  | "workflow"
  | "permits";

interface PlanDef {
  key: PlanKey;
  icon: typeof ShieldCheck;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  template: (ctx: { projectName: string; isArabic: boolean }) => string;
}

const PLANS: PlanDef[] = [
  {
    key: "quality",
    icon: ShieldCheck,
    titleAr: "خطة الجودة",
    titleEn: "Quality Plan",
    descAr: "معايير ضبط الجودة وإجراءات الفحص والاختبار",
    descEn: "Quality control standards, inspection and testing procedures",
    template: ({ projectName, isArabic }) =>
      isArabic
        ? `خطة إدارة الجودة - ${projectName}\n\n1. الأهداف\n- ضمان مطابقة الأعمال للمواصفات الفنية والعقدية.\n- تطبيق نظام ISO 9001 في جميع مراحل المشروع.\n\n2. مسؤوليات الجودة\n- مدير الجودة: الإشراف العام وإصدار التقارير.\n- مهندس الجودة: تنفيذ الفحوصات الميدانية.\n\n3. إجراءات الفحص (ITP)\n- فحص استلام المواد قبل الصرف.\n- فحص الأعمال أثناء التنفيذ.\n- اختبارات نهائية قبل التسليم.\n\n4. السجلات والتوثيق\n- تقارير الفحص اليومية.\n- شهادات اختبار المواد.\n- محاضر عدم المطابقة (NCR).\n\n5. التحسين المستمر\n- مراجعة دورية كل شهر.\n- تحليل أسباب الانحرافات.`
        : `Quality Management Plan - ${projectName}\n\n1. Objectives\n- Ensure conformance to specifications and contract.\n- Apply ISO 9001 across all project phases.\n\n2. Responsibilities\n- Quality Manager: oversight and reporting.\n- Quality Engineer: field inspections.\n\n3. Inspection & Test Plan (ITP)\n- Material receiving inspection.\n- In-process inspection.\n- Final testing before handover.\n\n4. Records\n- Daily inspection reports.\n- Material test certificates.\n- Non-Conformance Reports (NCR).\n\n5. Continuous Improvement\n- Monthly review.\n- Root-cause analysis of deviations.`,
  },
  {
    key: "method",
    icon: FileText,
    titleAr: "Method of Statement",
    titleEn: "Method of Statement",
    descAr: "طريقة تنفيذ الأعمال خطوة بخطوة مع متطلبات السلامة",
    descEn: "Step-by-step execution method with safety requirements",
    template: ({ projectName, isArabic }) =>
      isArabic
        ? `Method Statement - ${projectName}\n\n1. نطاق العمل\nوصف الأعمال المطلوب تنفيذها.\n\n2. المراجع\n- المخططات التنفيذية.\n- المواصفات الفنية.\n- اشتراطات السلامة OSHA.\n\n3. الموارد\n- العمالة المطلوبة وتخصصاتها.\n- المعدات والأدوات.\n- المواد والاعتمادات.\n\n4. خطوات التنفيذ\n4.1 التحضير الموقعي.\n4.2 التحديد والتسوية.\n4.3 التنفيذ المتسلسل للأعمال.\n4.4 الفحص والاعتماد.\n\n5. متطلبات السلامة (HSE)\n- تقييم المخاطر JSA.\n- معدات الوقاية الشخصية PPE.\n- خطة الطوارئ.\n\n6. ضبط الجودة\n- نقاط الفحص (Hold Points).\n- نماذج الاستلام.`
        : `Method Statement - ${projectName}\n\n1. Scope of Work\nDescription of works to be executed.\n\n2. References\n- Shop drawings.\n- Technical specifications.\n- OSHA safety requirements.\n\n3. Resources\n- Manpower and trades.\n- Equipment & tools.\n- Materials & approvals.\n\n4. Execution Sequence\n4.1 Site preparation.\n4.2 Setting out.\n4.3 Sequential execution.\n4.4 Inspection & approval.\n\n5. HSE Requirements\n- Job Safety Analysis (JSA).\n- PPE requirements.\n- Emergency plan.\n\n6. Quality Control\n- Hold points.\n- Inspection request forms.`,
  },
  {
    key: "stakeholder",
    icon: Users,
    titleAr: "خطة إدارة المعنيين",
    titleEn: "Stakeholder Management Plan",
    descAr: "تحديد وتصنيف المعنيين واستراتيجيات التواصل معهم",
    descEn: "Identify, classify and engage project stakeholders",
    template: ({ projectName, isArabic }) =>
      isArabic
        ? `خطة إدارة المعنيين - ${projectName}\n\n1. تحديد المعنيين\n- المالك / صاحب العمل.\n- الاستشاري والمصمم.\n- المقاول الرئيسي والمقاولين الفرعيين.\n- الموردون والجهات الحكومية.\n- المجتمع المحلي.\n\n2. مصفوفة التأثير/الاهتمام\n- تأثير عالٍ - اهتمام عالٍ: إدارة عن قرب.\n- تأثير عالٍ - اهتمام منخفض: إبقاء راضٍ.\n- تأثير منخفض - اهتمام عالٍ: إبقاء على اطلاع.\n- تأثير منخفض - اهتمام منخفض: متابعة.\n\n3. استراتيجية المشاركة\n- اجتماعات أسبوعية مع المالك والاستشاري.\n- تقارير شهرية للجهات الرقابية.\n- ورش عمل دورية للفريق.\n\n4. آليات حل النزاعات\n- التصعيد المرحلي.\n- لجان فض النزاع.`
        : `Stakeholder Management Plan - ${projectName}\n\n1. Stakeholder Identification\n- Owner / Client.\n- Consultant & Designer.\n- Main contractor & subcontractors.\n- Suppliers & government entities.\n- Local community.\n\n2. Power/Interest Matrix\n- High power, high interest: manage closely.\n- High power, low interest: keep satisfied.\n- Low power, high interest: keep informed.\n- Low power, low interest: monitor.\n\n3. Engagement Strategy\n- Weekly meetings with client & consultant.\n- Monthly reports to authorities.\n- Periodic team workshops.\n\n4. Conflict Resolution\n- Escalation ladder.\n- Dispute resolution committees.`,
  },
  {
    key: "communication",
    icon: MessageSquare,
    titleAr: "خطة الاتصالات",
    titleEn: "Communications Plan",
    descAr: "قنوات وتواتر التواصل وأنواع التقارير",
    descEn: "Channels, frequency and reporting types",
    template: ({ projectName, isArabic }) =>
      isArabic
        ? `خطة الاتصالات - ${projectName}\n\n1. الأهداف\n- ضمان تدفق المعلومات بدقة وفي الوقت المناسب.\n\n2. قنوات الاتصال\n- البريد الإلكتروني الرسمي.\n- نظام إدارة الوثائق (DMS).\n- اجتماعات Microsoft Teams.\n- مكالمات هاتفية للأمور العاجلة.\n\n3. التقارير الدورية\n- يومي: تقرير الموقع.\n- أسبوعي: تقرير التقدم.\n- شهري: تقرير شامل + EVM.\n\n4. مصفوفة المسؤولية (RACI)\nتحديد المسؤول والمنفذ والمستشار والمُبلَّغ لكل نشاط اتصالي.\n\n5. إدارة الوثائق\n- نظام ترميز موحد.\n- مراجعات وإصدارات.\n- أرشفة إلكترونية.`
        : `Communications Plan - ${projectName}\n\n1. Objectives\n- Ensure timely and accurate information flow.\n\n2. Channels\n- Official email.\n- Document Management System (DMS).\n- Microsoft Teams meetings.\n- Phone calls for urgent matters.\n\n3. Regular Reports\n- Daily: site report.\n- Weekly: progress report.\n- Monthly: comprehensive report + EVM.\n\n4. RACI Matrix\nDefine Responsible, Accountable, Consulted, Informed for each activity.\n\n5. Document Control\n- Unified coding system.\n- Revisions & versioning.\n- Electronic archiving.`,
  },
  {
    key: "risk",
    icon: AlertTriangle,
    titleAr: "خطة إدارة المخاطر",
    titleEn: "Risk Management Plan",
    descAr: "تحديد وتقييم ومعالجة مخاطر المشروع",
    descEn: "Identify, assess and respond to project risks",
    template: ({ projectName, isArabic }) =>
      isArabic
        ? `خطة إدارة المخاطر - ${projectName}\n\n1. منهجية إدارة المخاطر\nتطبيق دليل PMBOK في جميع العمليات.\n\n2. تحديد المخاطر\n- مخاطر فنية: تأخر التصاميم، تغييرات النطاق.\n- مخاطر مالية: تذبذب الأسعار، تأخر الدفعات.\n- مخاطر تشغيلية: نقص العمالة، أعطال المعدات.\n- مخاطر خارجية: الطقس، اللوائح، السوق.\n\n3. التحليل\n- التحليل النوعي: مصفوفة الاحتمال × التأثير.\n- التحليل الكمي: محاكاة Monte Carlo للتكلفة والمدة.\n\n4. استراتيجيات الاستجابة\n- التجنب / النقل / التخفيف / القبول.\n\n5. المراقبة\n- سجل المخاطر يحدّث أسبوعياً.\n- مراجعة شهرية مع الإدارة العليا.\n\n6. الاحتياطيات\n- احتياطي طوارئ (Contingency).\n- احتياطي إداري (Management Reserve).`
        : `Risk Management Plan - ${projectName}\n\n1. Methodology\nApply PMBOK across all processes.\n\n2. Risk Identification\n- Technical: design delays, scope changes.\n- Financial: price volatility, late payments.\n- Operational: labor shortage, equipment failure.\n- External: weather, regulations, market.\n\n3. Analysis\n- Qualitative: probability × impact matrix.\n- Quantitative: Monte Carlo simulation.\n\n4. Response Strategies\n- Avoid / Transfer / Mitigate / Accept.\n\n5. Monitoring\n- Risk register updated weekly.\n- Monthly review with senior management.\n\n6. Reserves\n- Contingency reserve.\n- Management reserve.`,
  },
  {
    key: "staffing",
    icon: UserPlus,
    titleAr: "خطة التوظيف",
    titleEn: "Staffing Plan",
    descAr: "احتياجات الكوادر البشرية وجدول التعبئة",
    descEn: "Human resource needs and mobilization schedule",
    template: ({ projectName, isArabic }) =>
      isArabic
        ? `خطة التوظيف - ${projectName}\n\n1. الهيكل التنظيمي\n- مدير المشروع.\n- مديرو الأقسام (إنشاءات، كهروميكانيك، جودة، سلامة).\n- مهندسو الموقع والمراقبون.\n- العمالة الفنية والمساعدة.\n\n2. متطلبات الكوادر\n- الأعداد المطلوبة لكل مرحلة.\n- المؤهلات والخبرات.\n\n3. جدول التعبئة (Mobilization)\n- مرحلة الإطلاق: 30%.\n- ذروة التنفيذ: 100%.\n- مرحلة التسليم: 40%.\n\n4. التدريب والتأهيل\n- توجيه السلامة (HSE Induction).\n- تدريبات فنية متخصصة.\n\n5. تقييم الأداء\n- مراجعة ربع سنوية.\n- مؤشرات أداء (KPIs).`
        : `Staffing Plan - ${projectName}\n\n1. Organization Structure\n- Project Manager.\n- Section managers (Civil, MEP, QA, HSE).\n- Site engineers & supervisors.\n- Skilled & unskilled labor.\n\n2. Resource Requirements\n- Counts per phase.\n- Qualifications & experience.\n\n3. Mobilization Schedule\n- Kickoff: 30%.\n- Peak execution: 100%.\n- Handover: 40%.\n\n4. Training\n- HSE induction.\n- Specialized technical training.\n\n5. Performance Evaluation\n- Quarterly reviews.\n- KPIs.`,
  },
  {
    key: "workflow",
    icon: Workflow,
    titleAr: "آلية العمل لبنود المشروع",
    titleEn: "Project Items Work Methodology",
    descAr: "تسلسل التنفيذ والاعتمادات لكل بند",
    descEn: "Execution sequence and approvals for each item",
    template: ({ projectName, isArabic, itemsCount }: any) =>
      isArabic
        ? `آلية العمل لبنود المشروع - ${projectName}\n\nعدد البنود: ${itemsCount || 0}\n\n1. تسلسل التنفيذ العام\n- اعتماد المخططات التنفيذية.\n- اعتماد عينات المواد.\n- طلب الفحص (IR) قبل البدء.\n- التنفيذ وفق Method Statement.\n- الفحص والاعتماد (Hold Points).\n- توثيق الإنجاز (As-Built).\n\n2. آلية الاعتمادات\n- Material Submittal خلال 7 أيام.\n- Shop Drawings خلال 14 يوماً.\n- Inspection Request قبل 24 ساعة.\n\n3. ربط البنود بالموارد\n- مصفوفة بند × مادة × عمالة × معدة.\n\n4. مؤشرات التقدم\n- نسبة الإنجاز لكل بند.\n- مقارنة بالخط الأساسي (Baseline).\n\n5. التسليم والإغلاق\n- Punch List.\n- شهادة الإنجاز الجوهري.\n- شهادة التسليم النهائي.`
        : `Work Methodology for Project Items - ${projectName}\n\nTotal items: ${itemsCount || 0}\n\n1. General Execution Sequence\n- Shop drawings approval.\n- Material samples approval.\n- Inspection Request (IR) before start.\n- Execution per Method Statement.\n- Inspection & approval (Hold Points).\n- As-Built documentation.\n\n2. Approval Workflow\n- Material Submittal within 7 days.\n- Shop Drawings within 14 days.\n- Inspection Request 24h in advance.\n\n3. Item-Resource Mapping\n- Item × Material × Labor × Equipment matrix.\n\n4. Progress Indicators\n- % completion per item.\n- Baseline comparison.\n\n5. Handover & Closeout\n- Punch List.\n- Substantial Completion.\n- Final Acceptance.`,
  },
  {
    key: "permits",
    icon: Stamp,
    titleAr: "خطة التصاريح",
    titleEn: "Permits Plan",
    descAr: "التصاريح الحكومية والبلدية المطلوبة قبل وأثناء التنفيذ",
    descEn: "Government and municipal permits required",
    template: ({ projectName, isArabic }) =>
      isArabic
        ? `خطة التصاريح - ${projectName}\n\n1. التصاريح قبل البدء\n- رخصة البناء من البلدية.\n- تصريح الحفر والتربة.\n- موافقة الدفاع المدني.\n- تصريح الكهرباء والمياه المؤقتة.\n\n2. التصاريح أثناء التنفيذ\n- تصاريح الأعمال الساخنة (Hot Work).\n- تصاريح العمل في الأماكن المغلقة.\n- تصاريح العمل على ارتفاعات.\n- تصاريح إغلاق الطرق.\n\n3. التصاريح البيئية\n- تصريح إدارة المخلفات.\n- موافقة الأثر البيئي.\n\n4. التصاريح النهائية\n- شهادة الإشغال.\n- توصيل الخدمات الدائمة.\n\n5. المسؤوليات والمدد\n- جدول زمني لكل تصريح.\n- المسؤول عن المتابعة.\n- تكاليف الرسوم.`
        : `Permits Plan - ${projectName}\n\n1. Pre-Start Permits\n- Building permit from municipality.\n- Excavation & soil permit.\n- Civil Defense approval.\n- Temporary power & water connection.\n\n2. Execution Permits\n- Hot work permits.\n- Confined space permits.\n- Work-at-height permits.\n- Road closure permits.\n\n3. Environmental Permits\n- Waste management permit.\n- Environmental impact approval.\n\n4. Final Permits\n- Occupancy certificate.\n- Permanent utilities connection.\n\n5. Responsibilities & Timeline\n- Timeline per permit.\n- Responsible party.\n- Fees & costs.`,
  },
];

export const ProjectPlans = ({ projectName, itemsCount, isArabic }: ProjectPlansProps) => {
  const { toast } = useToast();
  const [contents, setContents] = useState<Record<PlanKey, string>>(
    {} as Record<PlanKey, string>
  );
  const [generating, setGenerating] = useState<PlanKey | null>(null);

  const generate = (plan: PlanDef) => {
    setGenerating(plan.key);
    setTimeout(() => {
      const text = plan.template({
        projectName: projectName || (isArabic ? "المشروع" : "Project"),
        isArabic,
        itemsCount,
      } as any);
      setContents((prev) => ({ ...prev, [plan.key]: text }));
      setGenerating(null);
      toast({
        title: isArabic ? "تم التوليد" : "Generated",
        description: isArabic ? plan.titleAr : plan.titleEn,
      });
    }, 400);
  };

  const exportPDF = (plan: PlanDef) => {
    const text = contents[plan.key];
    if (!text) {
      toast({
        title: isArabic ? "لا يوجد محتوى" : "No content",
        variant: "destructive",
      });
      return;
    }
    const doc = new jsPDF();
    const title = isArabic ? plan.titleAr : plan.titleEn;
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 14, 25);
    doc.save(`${plan.key}-plan-${Date.now()}.pdf`);
  };

  return (
    <Card className="mt-6" dir={isArabic ? "rtl" : "ltr"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="w-5 h-5 text-primary" />
          {isArabic ? "خطط المشروع" : "Project Plans"}
          <Badge variant="secondary" className="ml-2">
            {PLANS.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={PLANS[0].key} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 h-auto gap-1 bg-muted/50 p-1">
            {PLANS.map((p) => {
              const Icon = p.icon;
              return (
                <TabsTrigger
                  key={p.key}
                  value={p.key}
                  className="flex flex-col items-center gap-1 py-2 px-1 text-[10px] md:text-xs h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="w-4 h-4" />
                  <span className="leading-tight text-center">
                    {isArabic ? p.titleAr : p.titleEn}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const text = contents[plan.key] || "";
            const isGen = generating === plan.key;
            return (
              <TabsContent key={plan.key} value={plan.key} className="mt-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {isArabic ? plan.titleAr : plan.titleEn}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isArabic ? plan.descAr : plan.descEn}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => generate(plan)}
                      disabled={isGen}
                      className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isGen ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {isArabic ? "توليد" : "Generate"}
                    </Button>
                    {text && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportPDF(plan)}
                        className="gap-2"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>

                <Textarea
                  value={text}
                  onChange={(e) =>
                    setContents((prev) => ({ ...prev, [plan.key]: e.target.value }))
                  }
                  placeholder={
                    isArabic
                      ? 'اضغط "توليد" لإنشاء قالب جاهز للتعديل...'
                      : 'Click "Generate" to create an editable template...'
                  }
                  className="min-h-[320px] font-mono text-xs leading-relaxed bg-background"
                  dir={isArabic ? "rtl" : "ltr"}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProjectPlans;
