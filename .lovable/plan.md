

# خطة إضافة تحرير البيانات الناقصة مباشرة في جدول التحليل

## المشكلة الحالية

من الصورة المرفقة، يظهر أن بعض البنود الناتجة من التحليل تحتوي على بيانات ناقصة:
- **الكمية (Qty)**: تظهر `0`
- **الوحدة (Unit)**: تظهر `الوحدة` (افتراضي/خطأ)
- **السعر (Price)**: تظهر `0`
- **الإجمالي (Total)**: تظهر `0`

حالياً:
- ✅ **Unit Price** و **Total** قابلة للتحرير مباشرة (عبر `EditableUnitPrice`)
- ❌ **Quantity** غير قابلة للتحرير مباشرة
- ❌ **Unit** غير قابلة للتحرير مباشرة

---

## الحل المقترح

### 1. إنشاء مكون `EditableQuantity`

مكون جديد مشابه لـ `EditableUnitPrice` للكمية:

```typescript
// src/components/EditableQuantity.tsx
interface EditableQuantityProps {
  value: number;
  onSave: (newValue: number) => void;
  className?: string;
  disabled?: boolean;
}
```

### 2. إنشاء مكون `EditableUnit`

مكون جديد لتحرير الوحدة باستخدام قائمة منسدلة:

```typescript
// src/components/EditableUnit.tsx
interface EditableUnitProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  disabled?: boolean;
}
```

**الوحدات المتاحة:**
- م³ / m3 (متر مكعب)
- م² / m2 (متر مربع)
- م.ط / m (متر طولي)
- كجم / kg (كيلوجرام)
- طن / ton
- قطعة / pcs
- مقطوعية / ls
- عدد / nr

### 3. تحديث `AnalysisResults.tsx`

**أ. إضافة handlers للكمية والوحدة:**

```typescript
// Handler لتحديث الكمية
const handleEditQuantity = useCallback((itemNumber: string, newQty: number) => {
  // تحديث الكمية في analysisData
  // إعادة حساب Total = Qty × Unit Price
}, []);

// Handler لتحديث الوحدة
const handleEditUnit = useCallback((itemNumber: string, newUnit: string) => {
  // تحديث الوحدة في analysisData
}, []);
```

**ب. تحديث خلايا الجدول:**

```tsx
// من (عرض فقط):
<td className="px-3 py-3 text-center">
  <span>{item.quantity.toLocaleString()}</span>
</td>

// إلى (قابل للتحرير):
<td className="px-3 py-3 text-center">
  <EditableQuantity
    value={item.quantity}
    onSave={(newQty) => handleEditQuantity(item.item_number, newQty)}
    className={item.quantity === 0 ? "text-destructive" : undefined}
  />
</td>
```

```tsx
// من (عرض فقط):
<td className="px-3 py-3 text-center">
  <span>{item.unit}</span>
</td>

// إلى (قابل للتحرير):
<td className="px-3 py-3 text-center">
  <EditableUnit
    value={item.unit}
    onSave={(newUnit) => handleEditUnit(item.item_number, newUnit)}
    className={!item.unit || item.unit === "الوحدة" ? "text-destructive" : undefined}
  />
</td>
```

### 4. تمييز البنود الناقصة بصرياً

إضافة تمييز للبنود التي تحتاج إلى إدخال بيانات:

```tsx
// إضافة صف مميز للبنود الناقصة
const hasIncompletedData = !item.quantity || item.quantity === 0 || 
                            !item.unit || item.unit === "الوحدة";

<tr className={cn(
  hasIncompletedData && "bg-warning/10 border-l-4 border-l-warning"
)}>
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/EditableQuantity.tsx` | ملف جديد |
| `src/components/EditableUnit.tsx` | ملف جديد |
| `src/components/AnalysisResults.tsx` | تحديث خلايا الجدول + handlers |

---

## تفاصيل تقنية

### مكون EditableQuantity

```tsx
// تحرير رقمي مع:
// - حد أدنى 0
// - دعم الأرقام العشرية
// - تلوين أحمر للقيم الصفرية
// - أيقونة تحرير تظهر عند hover
```

### مكون EditableUnit

```tsx
// قائمة منسدلة مع:
// - وحدات قياسية مسبقة التعريف
// - خيار إدخال وحدة مخصصة
// - دعم ثنائي اللغة (عربي/إنجليزي)
```

---

## النتيجة المتوقعة

| قبل | بعد |
|-----|-----|
| الكمية تظهر `0` ولا يمكن تعديلها | نقرة واحدة لإدخال الكمية |
| الوحدة تظهر خاطئة ولا يمكن تعديلها | قائمة منسدلة لاختيار الوحدة الصحيحة |
| البنود الناقصة غير مميزة | خلفية صفراء للبنود التي تحتاج استكمال |

---

## ميزات إضافية

1. **تنبيه البنود الناقصة**: شريط تحذير في أعلى الجدول يعرض عدد البنود الناقصة
2. **فلتر سريع**: زر لعرض البنود الناقصة فقط (مشابه لـ "Zero Qty Only" الموجود)
3. **حساب تلقائي**: عند إدخال الكمية، يتم حساب الإجمالي تلقائياً (Qty × Unit Price)

