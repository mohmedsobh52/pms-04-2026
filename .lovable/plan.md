
# إضافة شاشة ترحيب (Onboarding) وإصلاح زر "ابدأ التحليل"

## ما تم تنفيذه مسبقاً (يعمل بشكل صحيح)
- البانر يظهر بعد إنشاء مشروع جديد عبر `location.state.isNewProject`
- زر الإغلاق (X) يخفي البانر بشكل صحيح

## ما يحتاج تعديل أو إضافة

### 1. إصلاح زر "ابدأ التحليل" في البانر
**المشكلة:** الزر يوجه إلى `/analyze` الذي يعيد توجيه المستخدم إلى `/projects` بدلاً من صفحة التحليل الفعلية.

**الحل:**
- الصفحة الرئيسية للتحليل هي `/` (Index.tsx) — لكن هذا غير مناسب للمستخدم
- الحل الصحيح: التوجيه إلى `/projects/:projectId/boq` (تبويب BOQ في المشروع نفسه) مع تمرير state للتحليل، أو التوجيه إلى Index.tsx مع حمل projectId
- الخيار الأبسط والأكثر منطقية: تغيير الوجهة من `/analyze` إلى مسار التحليل الفعلي `/?projectId=${projectId}` حتى يتم ربط النتائج بالمشروع

**التعديل في ProjectDetailsPage.tsx (السطر 871):**
```typescript
// قبل:
onClick={() => navigate("/analyze")}

// بعد:
onClick={() => navigate("/", { state: { projectId, projectName: project?.name } })}
```

### 2. إنشاء مكون OnboardingModal جديد

مكون `src/components/OnboardingModal.tsx` — نافذة منبثقة (Dialog) تظهر فوراً بعد إنشاء مشروع جديد وتوضح خطوات العمل الثلاث:

**الخطوات الثلاث:**
```
┌──────────────────────────────────────────────────────┐
│  🎉 تم إنشاء مشروعك بنجاح!                         │
│  إليك خطوات البدء:                                   │
│                                                      │
│  ① رفع BOQ                                          │
│     ارفع ملف PDF أو Excel لاستخراج بنود الكميات      │
│                                                      │
│  ② التسعير                                          │
│     سعّر البنود يدوياً أو باستخدام الذكاء الاصطناعي  │
│                                                      │
│  ③ التقارير                                         │
│     احصل على تقارير شاملة وتحليلات متقدمة           │
│                                                      │
│  [ابدأ برفع BOQ الآن]    [استكشف المشروع]            │
└──────────────────────────────────────────────────────┘
```

**خصائص المكون:**
- يقبل props: `open`, `onClose`, `projectId`, `projectName`, `isArabic`
- زر "ابدأ برفع BOQ الآن" يغلق النافذة ويوجه إلى التحليل مع projectId
- زر "استكشف المشروع" يغلق النافذة فقط
- يستخدم Dialog من Radix UI (المكتبة المتاحة مسبقاً)
- يعرض مؤشر تقدم بصري للخطوات الثلاث

### 3. تكامل OnboardingModal في ProjectDetailsPage

في `ProjectDetailsPage.tsx`:
```typescript
const [showOnboarding, setShowOnboarding] = useState(isNewProject);
```

ثم إضافة المكون في JSX قبل نهاية `return`:
```typescript
<OnboardingModal
  open={showOnboarding}
  onClose={() => setShowOnboarding(false)}
  projectId={projectId!}
  projectName={project?.name || ""}
  isArabic={isArabic}
  onStartAnalysis={() => {
    setShowOnboarding(false);
    navigate("/", { state: { projectId, projectName: project?.name } });
  }}
/>
```

### ملاحظة: علاقة Onboarding والبانر

- **Onboarding Modal**: يظهر أولاً عند دخول المشروع الجديد (مرة واحدة)
- **البانر**: يبقى ظاهراً تذكيراً للمستخدم حتى يضغط X
- الحالتان مستقلتان: إغلاق النافذة لا يخفي البانر والعكس صحيح

## التغييرات التقنية

| الملف | التغيير |
|-------|---------|
| `src/components/OnboardingModal.tsx` | ملف جديد — مكون شاشة الترحيب |
| `src/pages/ProjectDetailsPage.tsx` | إضافة OnboardingModal + إصلاح وجهة زر "ابدأ التحليل" |

لا تغييرات على قاعدة البيانات أو الـ Edge Functions.
