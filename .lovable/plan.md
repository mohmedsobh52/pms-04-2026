

## الفحص والتحليل

طلب المستخدم شامل ويتضمن: (1) فحص الأخطاء وإصلاحها، (2) رفع دقة التسعير التلقائي إلى ≥95%، (3) تطبيق كل الاقتراحات السابقة + المتبقية، (4) تحسينات أداء.

## الأخطاء المكتشفة

من console logs و network logs:

1. **`UpdateBanner.tsx`** يستدعي مشروع Supabase خاطئ (`brbgdvesterjvwduvsrf` و `krdgyvamkgqhvdeihayk`) → `Failed to fetch`. يجب أن يستخدم العميل من `@/integrations/supabase/client` فقط.
2. **`ContractManagement.tsx`** يولّد warning: "Function components cannot be given refs" — مكوّن داخله يُمرّر له `ref` من Radix Dialog/Tabs دون `forwardRef`. سأفحص الملف لتحديد المكوّن وأغلّفه بـ `React.forwardRef`.
3. **`AnalysisResults.tsx`** يحتاج مراجعة بعد التعديلات الأخيرة (lint/types).

## التحسينات المطلوبة

### A. إصلاح الأخطاء
- `src/components/UpdateBanner.tsx`: استبدال أي `createClient` خارجي بـ `import { supabase } from "@/integrations/supabase/client"`.
- `src/components/ContractManagement.tsx`: تحديد المكوّن المُمرَّر داخل `<Dialog>`/`<Card>` وتغليفه بـ `forwardRef`.

### B. رفع دقة التسعير ≥95% في `AutoPriceDialog.tsx`
- تغيير `confidenceThreshold` الافتراضي من 50 → **95**، ونطاق Slider إلى `min=80, max=99, step=1`.
- تحسين `calculateConfidence` و `calculateTextSimilarity`:
  - تطبيع النص (إزالة تشكيل عربي، توحيد الحروف ا/أ/إ/آ، ي/ى، ة/ه).
  - مطابقة دقيقة للوحدة (`unit`) كعامل ترجيح إضافي (+10).
  - مطابقة الفئة (`category`) (+10).
  - استخدام Jaccard similarity على الكلمات الفعّالة (≥3 أحرف).
  - رفع وزن المطابقة الكاملة (+80 بدل 60).
  - حد أعلى 99% (لا 95%).
- إضافة فلترة صارمة: لا يتم اقتراح أي بند بثقة <95% افتراضياً.

### C. تطبيق الاقتراحات المتبقية في `AnalysisResults.tsx`
1. **فلتر "غير المسعّرة فقط"**: زر toggle بجانب البحث في تبويب Items.
2. **لوحة اختصارات (?)**: نافذة `Dialog` تظهر عند `Shift+?` تعرض كل الاختصارات (Ctrl+B, Ctrl+F, 1-7, Shift+?).
3. **شريط تقدم بارز للفئة الحالية**: مكوّن صغير أعلى محتوى التبويب الحالي عندما يكون tab=items ومحدد فلتر فئة.

### D. تحسينات أداء عامة
- `AnalysisResults.tsx`: تحويل `pricingStats` calculations الكبيرة لاستخدام `useMemo` بشكل صحيح (تأكد).
- `AutoPriceDialog.tsx`: تقليل re-computation عند تغيير threshold (memo on inner matching فقط).
- إضافة `React.memo` للمكوّنات الفرعية الثقيلة في AnalysisResults إن لزم.

## الملفات المتأثرة

| الملف | التغيير |
|------|---------|
| `src/components/UpdateBanner.tsx` | إصلاح Supabase client الخاطئ |
| `src/components/ContractManagement.tsx` | إصلاح forwardRef warning |
| `src/components/project-details/AutoPriceDialog.tsx` | رفع الثقة ≥95% + خوارزمية أدق |
| `src/components/AnalysisResults.tsx` | فلتر unpriced، لوحة اختصارات، تحسين أداء |

## ملاحظات
- لا تغييرات DB.
- بعد التنفيذ: اختبار يدوي شامل (تحديث banner، تبويب contracts بدون warnings، AutoPrice مع threshold 95، اختصار Shift+?).

