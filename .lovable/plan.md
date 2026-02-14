

# تحسين عرض البيانات التاريخية بجدول BOQ منظم مع التعديل والربط بالتحليل

## الهدف

تحويل عرض البيانات التاريخية من جدول ديناميكي (أعمدة عشوائية من الملف) إلى جدول BOQ منظم بأعمدة ثابتة:
**Item No | Description | وصف البند | Unit | Quantity | Unit Price | Total | Item Code**

مع إمكانية التعديل والحذف والإضافة لكل بند، وربط البيانات بتحليل البنود والتسعير.

---

## التعديلات المطلوبة

### 1. تحويل بيانات الملفات عند الاستيراد (Normalization)

عند رفع ملف Excel/PDF، يتم تحويل البيانات المستخرجة إلى نسق موحد قبل الحفظ:

| العمود الموحد | الأسماء المتوقعة من الملف |
|---|---|
| `item_number` | Item, No, رقم البند, item_number, البند |
| `description` | Description, DESCRIPTION, الوصف الانجليزي |
| `description_ar` | وصف البند, الوصف |
| `unit` | Unit, الوحدة, unit |
| `quantity` | Quantity, الكمية, qty, quantity |
| `unit_price` | Price, سعر الوحدة, unit_price, price |
| `total_price` | Total, الإجمالي, total, total_price |
| `item_code` | Item code, كود البند, item_code |

### 2. انشاء مكون `src/components/HistoricalItemsTable.tsx`

مكون جدول BOQ منظم يعرض البنود التاريخية بالأعمدة الثابتة أعلاه، مع:

- **تعديل مباشر (Inline Editing)**: الضغط على أي خلية يحولها لحقل إدخال (Input) قابل للتعديل
- **حذف بند**: زر حذف لكل صف
- **إضافة بند جديد**: زر "إضافة بند" يضيف صفاً فارغاً في نهاية الجدول
- **حفظ التعديلات**: زر حفظ يرسل التحديثات لقاعدة البيانات (تحديث عمود `items` في جدول `historical_pricing_files`)
- **تصدير إلى Excel**: تصدير البيانات المنظمة
- **بحث وفلترة**: البحث داخل بنود الملف الواحد

### 3. تعديل `src/pages/HistoricalPricingPage.tsx`

- **حوار العرض (View Dialog)**: استبدال الجدول الديناميكي الحالي (سطور 879-914) بالمكون الجديد `HistoricalItemsTable` مع تمرير البنود والـ fileId
- **حوار الرفع (Upload Dialog)**: استبدال معاينة البيانات (سطور 600-653) بنفس المكون لمعاينة وتعديل البيانات قبل الحفظ
- **إضافة دالة التحويل (normalizeHistoricalItems)**: تحويل البيانات الخام من الملف إلى النسق الموحد عند الرفع

### 4. إضافة دالة `normalizeHistoricalItems` في `src/lib/historical-data-utils.ts`

ملف مساعد يحتوي على:
- **normalizeHistoricalItems**: تحويل بيانات خام (أعمدة مختلفة) إلى النسق الموحد
- **matchColumnName**: مطابقة أسماء الأعمدة بالعربي والإنجليزي
- **calculateTotal**: حساب الإجمالي تلقائياً (الكمية × سعر الوحدة)

### 5. ربط البيانات التاريخية بالتحليل والتسعير

تحسين مكون `HistoricalPriceComparison.tsx` الموجود:
- تعديل دالة `findSimilarItems` لتقرأ البنود بالنسق الموحد الجديد (item_number, description, unit_price) بدلاً من البحث العشوائي
- هذا يحسن دقة المطابقة التاريخية تلقائياً لأن أسماء الحقول أصبحت ثابتة

---

## الملفات المتأثرة

| الملف | الإجراء |
|---|---|
| `src/lib/historical-data-utils.ts` | إنشاء - دوال التحويل والتطبيع |
| `src/components/HistoricalItemsTable.tsx` | إنشاء - جدول BOQ تفاعلي |
| `src/pages/HistoricalPricingPage.tsx` | تعديل - استخدام الجدول الجديد + التحويل |
| `src/components/HistoricalPriceComparison.tsx` | تعديل - قراءة البنود بالنسق الموحد |

---

## التفاصيل التقنية

### هيكل البند الموحد (Normalized Item)

```text
interface NormalizedHistoricalItem {
  id: string;           // معرف فريد (UUID)
  item_number: string;  // رقم البند
  description: string;  // الوصف بالإنجليزية
  description_ar: string; // وصف البند بالعربية
  unit: string;         // الوحدة
  quantity: number;     // الكمية
  unit_price: number;   // سعر الوحدة
  total_price: number;  // الإجمالي
  item_code: string;    // كود البند
}
```

### طريقة الحفظ

البنود تبقى محفوظة في عمود `items` (jsonb) في جدول `historical_pricing_files` - لكن بالنسق الموحد بدلاً من البيانات الخام. عند التعديل/الحذف/الإضافة يتم تحديث هذا العمود مباشرة.

