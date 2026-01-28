
# خطة إصلاح عرض قيم التحليل في التقرير

## تحليل المشكلة

### الوضع الحالي:
من خلال الصورة المرفقة، نلاحظ أن أعمدة **Unit Price** و **AI Rate** و **Total** تظهر بقيم "-" بدلاً من الأرقام الفعلية.

### السبب:
عند تمرير البيانات إلى `PrintableReport`، الكود الحالي يستخدم:
```typescript
const aiRate = calcCosts.aiSuggestedRate || 0;
```
هذا يعني أنه إذا لم يكن هناك `aiSuggestedRate` محفوظ في localStorage، سيكون AI Rate = 0، ولا يستخدم سعر الوحدة الأصلي كـ fallback.

### المشكلة في التقرير:
```typescript
// formatCurrency(0) ← يظهر كـ "-" في التقرير
<td>${formatCurrency(item.ai_rate || item.unit_price || 0)}</td>
```
لكن لأن `ai_rate` تم تعيينها إلى `0` بشكل صريح، الـ fallback إلى `unit_price` لا يعمل!

---

## الحل المقترح

### التغيير في `AnalysisResults.tsx`:

**الكود الحالي (السطر 1532-1537):**
```typescript
.map(item => {
  const calcCosts = getItemCalculatedCosts(item.item_number);
  const aiRate = calcCosts.aiSuggestedRate || 0;  // ← المشكلة هنا
  return {
    ...item,
    ai_rate: aiRate,
    calculated_total: aiRate * (item.quantity || 0)
  };
})
```

**الكود المصحح:**
```typescript
.map(item => {
  const calcCosts = getItemCalculatedCosts(item.item_number);
  // استخدام AI Rate أو السعر الأصلي كـ fallback
  const aiRate = calcCosts.aiSuggestedRate || item.unit_price || 0;
  return {
    ...item,
    ai_rate: aiRate,
    calculated_total: aiRate * (item.quantity || 0)
  };
})
```

---

## التغييرات التفصيلية

### ملف: `src/components/AnalysisResults.tsx`

| السطر | التغيير |
|-------|---------|
| ~1533 | تعديل حساب `aiRate` ليشمل `item.unit_price` كـ fallback |

### الكود النهائي:

```typescript
// في PrintableReport mapping (السطر 1529-1539)
boqItems={(data.items || [])
  .filter(item => !deletedItemNumbers.has(item.item_number))
  .map(item => {
    const calcCosts = getItemCalculatedCosts(item.item_number);
    // Use AI Rate, or fallback to original unit_price, or 0
    const aiRate = calcCosts.aiSuggestedRate || item.unit_price || 0;
    return {
      ...item,
      ai_rate: aiRate,
      calculated_total: aiRate * (item.quantity || 0)
    };
  })}
```

---

## النتيجة المتوقعة

### قبل الإصلاح:
| # | الوصف | الكمية | AI Rate | الإجمالي |
|---|-------|--------|---------|----------|
| 1 | تسوية ترابية... | 279,250 | - | - |
| 2 | تسوية ترابية... | 70,000 | - | - |

### بعد الإصلاح:
| # | الوصف | الكمية | AI Rate | الإجمالي |
|---|-------|--------|---------|----------|
| 1 | تسوية ترابية... | 279,250 | 62.00 | 17,313,500 |
| 2 | تسوية ترابية... | 70,000 | 47.00 | 3,290,000 |

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/AnalysisResults.tsx` | تعديل fallback logic لـ AI Rate في PrintableReport mapping |

---

## اختبارات التحقق

| الاختبار | النتيجة المتوقعة |
|---------|----------------|
| فتح تقرير بدون AI rates محفوظة | يعرض الأسعار الأصلية من `unit_price` |
| فتح تقرير مع AI rates محفوظة | يعرض AI rates |
| الإجمالي في التقرير | Qty × (AI Rate أو Unit Price) |
| ملخص التقرير (Total Value) | مجموع كل الإجماليات صحيح |
