

# إضافة أنواع ضمانات جديدة

## التغيير

توسيع قائمة أنواع الضمانات في تبويب "الضمانات البنكية" لتتوافق مع الأنواع المطلوبة كما في الصورة المرجعية.

## الأنواع الحالية (4 أنواع)

| المفتاح | عربي | إنجليزي |
|---------|------|---------|
| bid_bond | ضمان ابتدائي | Bid Bond |
| performance_bond | ضمان حسن التنفيذ | Performance Bond |
| advance_payment | ضمان الدفعة المقدمة | Advance Payment Bond |
| retention | ضمان المحتجزات | Retention Bond |

## الأنواع بعد التعديل (6 أنواع)

| المفتاح | عربي | إنجليزي |
|---------|------|---------|
| bid_bond | ضمان العطاء | Bid Bond |
| performance_bond | ضمان الأداء | Performance Bond |
| advance_payment | الدفعة المقدمة | Advance Payment Bond |
| retention | الاحتجاز | Retention Bond |
| **maintenance** | **الصيانة** | **Maintenance Bond** |
| **other** | **أخرى** | **Other** |

## التفاصيل التقنية

### الملف: `src/components/tender/GuaranteesTab.tsx`

1. تحديث كائن `guaranteeTypes` (سطر 72-77):
   - تعديل التسميات العربية لتتوافق مع المرجع
   - إضافة نوعين جديدين: `maintenance` و `other`

2. تحديث نوع TypeScript في واجهة `Guarantee` (سطر ~56) لإضافة الأنواع الجديدة إلى union type

| الموقع | التعديل |
|--------|---------|
| سطر 72-77 | تحديث كائن `guaranteeTypes` بإضافة نوعين وتعديل التسميات |
| واجهة `Guarantee` | تحديث نوع `type` |

### ملف واحد يتأثر

`src/components/tender/GuaranteesTab.tsx`

