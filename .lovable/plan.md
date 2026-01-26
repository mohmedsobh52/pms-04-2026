

# خطة إصلاح زر "Auto Price"

## تشخيص المشكلة

### السبب الجذري
زر "Auto Price" يعاني من **نفس مشكلة z-index** التي أصلحناها سابقاً لأزرار "Start Pricing" و "Edit Project":

```text
ترتيب الطبقات الحالي:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ProjectHeader Actions:     z-[60] ✅ (محمي - تم إصلاحه)
Tabs Navigation:           z-55   ✅ (محمي)
BOQ Card Header Buttons:   z-auto ❌ (غير محمي!)
Dialog Overlay:            z-50   (قد يحجب الأزرار)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

الأزرار في `CardHeader` داخل `ProjectBOQTab.tsx` (Auto Price, Add Item, Delete Zero Qty, File Order, Filter, etc.) ليس لها `z-index` عالي، لذلك تُحجب بواسطة Dialog Overlay بعد إغلاقه.

---

## الحل المقترح

### 1. إضافة z-index لقسم أزرار BOQ

**في ملف `src/components/project-details/ProjectBOQTab.tsx` - السطر 164:**

```typescript
// قبل
<div className="flex items-center gap-2 flex-wrap">

// بعد
<div className="flex items-center gap-2 flex-wrap project-actions-section">
```

هذا يطبق نفس CSS المحمي الذي أضفناه سابقاً (`z-index: 60` و `pointer-events: auto`).

---

## ملخص التغييرات

| الملف | السطر | التغيير | الأثر |
|-------|-------|---------|-------|
| `ProjectBOQTab.tsx` | 164 | إضافة `project-actions-section` class | يحمي جميع أزرار BOQ من z-index conflicts |

---

## الأزرار المحمية بعد الإصلاح

1. ✅ **Auto Price** - سيعمل بشكل صحيح
2. ✅ **Add Item** - سيعمل بشكل صحيح
3. ✅ **Delete Zero Qty** - سيعمل بشكل صحيح
4. ✅ **File Order dropdown** - سيعمل بشكل صحيح
5. ✅ **Filter button** - سيعمل بشكل صحيح
6. ✅ **Refresh button** - سيعمل بشكل صحيح
7. ✅ **Download button** - سيعمل بشكل صحيح

---

## ترتيب الطبقات بعد الإصلاح

```text
ترتيب الطبقات الجديد:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Select Dropdowns:          z-[70] ✅
ProjectHeader Actions:     z-[60] ✅
BOQ Card Header Buttons:   z-[60] ✅ (سيُضاف)
Tabs Navigation:           z-55   ✅
Dialog Overlay:            z-50
Normal Content:            z-auto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ملاحظة مهمة

**سلوك زر Auto Price الطبيعي:**
- الزر يكون **معطلاً (disabled)** عندما جميع البنود مسعرة بالفعل
- من البيانات الحالية، يبدو أن جميع الـ 485 بند لها أسعار
- بعد الإصلاح، إذا كانت هناك بنود غير مسعرة، سيعمل الزر

---

## الاختبار المطلوب

بعد تطبيق التغييرات:

1. **اختبار Auto Price:**
   - إذا كانت هناك بنود غير مسعرة → النقر على الزر → يبدأ التسعير التلقائي
   - إذا كانت جميع البنود مسعرة → الزر يكون معطلاً (وهذا سلوك صحيح)

2. **اختبار بعد إغلاق Dialog:**
   - فتح Quick Price أو Edit Item Dialog → إغلاقه → النقر على Auto Price → يجب أن يستجيب

3. **اختبار Add Item:**
   - النقر على "Add Item" → يجب أن يفتح dialog الإضافة

4. **اختبار File Order dropdown:**
   - النقر على "File Order" → يجب أن تظهر القائمة المنسدلة

