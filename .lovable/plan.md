

# تحسين تنسيق التاريخ في نموذج إنشاء المشروع

## المشكلة الحالية

التنسيق الحالي للتاريخ يعرض:
- **الآن**: "January 1st, 2026" 
- **المطلوب**: "2026-01-15" (yyyy-MM-dd)

## الحل

تغيير تنسيق عرض التاريخ من `"PPP"` إلى `"yyyy-MM-dd"` في:
- حقل تاريخ البدء (Start Date)
- حقل تاريخ الانتهاء (Expected End Date)

## التغييرات التقنية

### الملف: `src/pages/NewProjectPage.tsx`

#### 1. تاريخ البدء (السطر 354)
```typescript
// قبل
format(formData.startDate, "PPP", { locale: isArabic ? ar : enUS })

// بعد
format(formData.startDate, "yyyy-MM-dd")
```

#### 2. تاريخ الانتهاء (السطر 390)
```typescript
// قبل
format(formData.endDate, "PPP", { locale: isArabic ? ar : enUS })

// بعد
format(formData.endDate, "yyyy-MM-dd")
```

## النتيجة المتوقعة

| الحقل | قبل | بعد |
|-------|-----|-----|
| Start Date | January 1st, 2026 | 2026-01-01 |
| Expected End Date | January 15th, 2026 | 2026-01-15 |

## ملاحظة

تنسيق `yyyy-MM-dd` هو المعيار الدولي ISO 8601 وهو:
- سهل القراءة والفهم
- موحد بين اللغات
- مناسب للترتيب والفرز

