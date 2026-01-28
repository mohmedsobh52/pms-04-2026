
# خطة إضافة اختصار "Pricing Accuracy" على الشاشة الرئيسية

## تحليل الوضع الحالي

### موقع تبويب Pricing Accuracy حالياً
- **المسار**: `/projects/:projectId/pricing?tab=accuracy`
- **الصفحة**: `TenderSummaryPage.tsx` (صفحة التسعير)
- **التبويب**: ضمن تبويبات التسعير (Site Staff, Facilities, Insurance, Guarantees, **Accuracy**, Settings)

### هيكل الشاشة الرئيسية
الصفحة الرئيسية تحتوي على:
1. **PhaseActionsGrid**: شبكة الإجراءات حسب مراحل المشروع (6 مراحل)
2. **mainModules**: الوحدات الرئيسية (المشاريع، العروض، العقود، المشتريات، المخاطر، الإعدادات)
3. **KPI Summary Cards**: بطاقات مؤشرات الأداء

---

## الحل المقترح

إضافة اختصار "Pricing Accuracy" في **المرحلة 3** (مرحلة التسعير والتحليل) ضمن `PhaseActionsGrid`، لأن هذه المرحلة تحتوي على:
- عروض الأسعار (Quotations)
- التسعير التاريخي (Historical Pricing)
- تحليل التكاليف (Cost Analysis)

### الإجراء الجديد
```tsx
{ 
  icon: Target, 
  label: { ar: "دقة التسعير", en: "Pricing Accuracy" }, 
  description: { ar: "تتبع دقة الأسعار", en: "Track price accuracy" },
  href: "/pricing-accuracy",  // صفحة مستقلة جديدة
  isNew: true,
  previewText: { ar: "مقارنة الأسعار المقترحة مع النهائية", en: "Compare suggested vs final prices" }
}
```

---

## خيارات التنفيذ

### الخيار 1: إضافة اختصار يفتح صفحة مستقلة (موصى به)
- إنشاء صفحة `/pricing-accuracy` مستقلة تعرض `PricingAccuracyTab` بدون الحاجة لاختيار مشروع
- **المميزات**: وصول مباشر وسريع من الشاشة الرئيسية
- **العيوب**: يتطلب إنشاء صفحة جديدة

### الخيار 2: إضافة اختصار يوجه لصفحة التسعير مع تحديد المشروع
- الرابط: `/projects` ثم اختيار مشروع → التسعير → Accuracy
- **العيوب**: يتطلب خطوات إضافية

---

## التنفيذ المقترح

### 1. إنشاء صفحة جديدة: `src/pages/PricingAccuracyPage.tsx`

```tsx
import { useLanguage } from "@/hooks/useLanguage";
import { PricingAccuracyTab } from "@/components/tender/PricingAccuracyTab";
import { NavigationBar } from "@/components/NavigationBar";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function PricingAccuracyPage() {
  const { isArabic } = useLanguage();
  
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto p-6">
        <Breadcrumbs />
        <PricingAccuracyTab isArabic={isArabic} />
      </main>
    </div>
  );
}
```

### 2. تحديث `src/App.tsx`: إضافة المسار الجديد

```tsx
<Route path="/pricing-accuracy" element={<PricingAccuracyPage />} />
```

### 3. تحديث `src/components/home/PhaseActionsGrid.tsx`

إضافة الاختصار في المرحلة 3 (phaseConfigs[2].actions):

```tsx
// في المرحلة 3 (id: 3) - بعد Cost Analysis
{ 
  icon: Target, 
  label: { ar: "دقة التسعير", en: "Pricing Accuracy" }, 
  description: { ar: "تتبع دقة الأسعار", en: "Track price accuracy" },
  href: "/pricing-accuracy",
  isNew: true,
  previewText: { ar: "مقارنة الأسعار المقترحة مع الأسعار النهائية المعتمدة", en: "Compare suggested prices with final approved prices" }
}
```

### 4. تحديث Global Search

إضافة الصفحة الجديدة في `GlobalSearchContext.tsx` ضمن قائمة الصفحات:

```tsx
{
  id: 'pricing-accuracy',
  type: 'page',
  label: 'Pricing Accuracy',
  labelAr: 'دقة التسعير',
  description: 'Track and compare suggested vs final prices',
  descriptionAr: 'تتبع ومقارنة الأسعار المقترحة مع النهائية',
  icon: 'Target',
  href: '/pricing-accuracy',
  keywords: ['pricing', 'accuracy', 'comparison', 'track', 'دقة', 'تسعير', 'مقارنة']
}
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/PricingAccuracyPage.tsx` | **ملف جديد** - صفحة مستقلة لدقة التسعير |
| `src/App.tsx` | إضافة Route جديد `/pricing-accuracy` |
| `src/components/home/PhaseActionsGrid.tsx` | إضافة اختصار في المرحلة 3 |
| `src/contexts/GlobalSearchContext.tsx` | إضافة الصفحة للبحث العالمي |

---

## النتيجة المتوقعة

| الميزة | الحالة |
|--------|--------|
| اختصار على الشاشة الرئيسية | ✅ في المرحلة 3 |
| شارة "جديد" | ✅ تظهر على الاختصار |
| البحث العالمي (⌘K) | ✅ يجد الصفحة |
| وصول مباشر بدون مشروع | ✅ صفحة مستقلة |
| ثنائي اللغة | ✅ عربي/إنجليزي |

---

## التصميم المقترح للاختصار

```
┌─────────────────────────────────┐
│  🎯  دقة التسعير          [جديد]│
│      تتبع دقة الأسعار           │
└─────────────────────────────────┘
```

سيظهر في **المرحلة 3** (الأخضر) مع باقي أدوات التسعير.
