

# خطة إصلاح إعادة توجيه صفحة Pricing Accuracy

## المشكلة

المسار `/pricing-accuracy` يعيد التوجيه إلى `/projects` فقط بدون توضيح للمستخدم أين يجد الخاصية.

## الحل

تحديث إعادة التوجيه مع تحسين تجربة المستخدم:

### التعديل المطلوب في `src/App.tsx`

```typescript
// السطر 121 - تحديث إعادة التوجيه
// من:
<Route path="/pricing-accuracy" element={<Navigate to="/projects" replace />} />

// إلى - حذف السطر تماماً وإزالة PricingAccuracyPage من الاستيرادات
// لأن الخاصية موجودة الآن داخل:
// /projects/:projectId/pricing → تبويب "Accuracy"
```

### حذف الاستيراد غير المستخدم

```typescript
// حذف السطر 54
const PricingAccuracyPage = lazy(() => import("./pages/PricingAccuracyPage"));
```

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `src/App.tsx` | حذف استيراد PricingAccuracyPage + حذف/تحديث مسار `/pricing-accuracy` |

---

## النتيجة

```text
✅ إزالة المسار القديم غير المستخدم
✅ المستخدم يصل للخاصية من: المشاريع → اختيار مشروع → التسعير → تبويب Accuracy
✅ تنظيف الكود من الاستيرادات غير المستخدمة
```

