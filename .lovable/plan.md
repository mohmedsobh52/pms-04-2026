

# خطة إصلاح منطقة "Upload File"

## تشخيص المشكلة

### السبب الجذري
منطقة رفع الملفات في تبويب "Analyze BOQ" تعاني من **نفس مشكلة z-index** التي أصلحناها سابقاً:

```text
ترتيب الطبقات الحالي:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tabs Navigation:           z-55   ✅ (محمي)
Dialog Overlay:            z-50   
Upload Zone:               z-auto ❌ (غير محمي!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

منطقة الرفع في `BOQAnalyzerPanel.tsx` (السطور 559-586) ليس لها `z-index` عالي أو `pointer-events` صريح، لذلك قد تُحجب بواسطة Dialog Overlay بعد إغلاقه.

---

## الحل المقترح

### 1. إضافة class حماية لمنطقة الرفع

**في ملف `src/components/BOQAnalyzerPanel.tsx` - السطر 558:**

تغيير CardContent لإضافة class حماية:

```typescript
// قبل
<CardContent>

// بعد  
<CardContent className="relative z-[55]">
```

### 2. إضافة CSS لمنطقة الرفع في dialog-custom.css

```css
/* Upload zone protection */
.upload-zone,
[class*="border-dashed"] {
  position: relative;
  z-index: 55;
  pointer-events: auto !important;
}

.upload-zone label,
[class*="border-dashed"] label {
  pointer-events: auto !important;
  cursor: pointer !important;
}

.upload-zone input[type="file"],
[class*="border-dashed"] input[type="file"] {
  pointer-events: auto !important;
}
```

---

## ملخص التغييرات

| الملف | السطر | التغيير | الأثر |
|-------|-------|---------|-------|
| `BOQAnalyzerPanel.tsx` | 558 | إضافة `relative z-[55]` للـ CardContent | يحمي منطقة الرفع |
| `dialog-custom.css` | جديد | CSS rules لـ upload zone | يضمن pointer-events |

---

## العناصر المحمية بعد الإصلاح

1. **منطقة السحب والإفلات** - ستعمل بشكل صحيح
2. **النقر للرفع** - سيعمل بشكل صحيح  
3. **اختيار الملف** - سيعمل بشكل صحيح

---

## ترتيب الطبقات بعد الإصلاح

```text
ترتيب الطبقات الجديد:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Select Dropdowns:          z-[70] ✅
Project Actions:           z-[60] ✅
Tabs Navigation:           z-55   ✅
Upload Zone:               z-55   ✅ (سيُضاف)
Dialog Overlay:            z-50
Normal Content:            z-auto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## الاختبار المطلوب

بعد تطبيق التغييرات:

1. **اختبار النقر على منطقة الرفع:**
   - النقر على المنطقة المنقطة → يجب أن يفتح نافذة اختيار الملف
   
2. **اختبار السحب والإفلات:**
   - سحب ملف PDF أو Excel → يجب أن تتغير لون الحدود
   - إفلات الملف → يجب أن يبدأ الرفع

3. **اختبار بعد إغلاق Dialog:**
   - فتح أي dialog في الصفحة → إغلاقه → النقر على منطقة الرفع → يجب أن يعمل فوراً

