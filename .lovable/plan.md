
# خطة إصلاح مشكلة عدم ظهور الكميات (Qty = 0)

## المشكلة

في شاشة **Extracted Quantities**، جميع الكميات تظهر بقيمة **0** رغم أن التحليل نجح واستخرج 26 بند. هذا يعني أن الـ AI يُرجع البيانات لكن حقل `quantity` لا يُعالج بشكل صحيح.

## التحليل الفني

### السبب الجذري

الكود الحالي في `FastExtractionDrawingAnalyzer.tsx` (سطر 204):
```typescript
quantities: data.analysis?.quantities || [],
```

يأخذ `quantities` مباشرة من رد AI **بدون أي تطبيع (normalization)**. 

المشاكل المحتملة:
1. **AI يُرجع `quantity` كـ string**: مثل `"150"` بدلاً من `150`
2. **AI يُرجع اسم حقل مختلف**: مثل `qty`, `Quantity`, `QTY`
3. **AI يُرجع null/undefined**: أو كائن فارغ
4. **AI يُرجع نص وصفي**: مثل `"calculated"` أو `"TBD"`

### موقع المشكلة

```typescript
// سطر 608 - العرض
<TableCell className="text-right font-mono font-semibold">
  {q.quantity.toLocaleString()}  // ← إذا كان quantity ليس رقم، يظهر 0 أو يفشل
</TableCell>
```

## الحل المقترح

### 1. إضافة دالة تطبيع الكميات

```typescript
// دالة لتطبيع الكميات المستخرجة
const normalizeQuantities = (quantities: any[]): ExtractedQuantity[] => {
  if (!Array.isArray(quantities)) return [];
  
  return quantities.map((q, idx) => {
    // استخراج الكمية من حقول متعددة محتملة
    let qty = 0;
    const rawQty = q.quantity ?? q.qty ?? q.Quantity ?? q.QTY ?? q.amount ?? q.Amount ?? 0;
    
    // تحويل لرقم
    if (typeof rawQty === 'number') {
      qty = rawQty;
    } else if (typeof rawQty === 'string') {
      // إزالة الفواصل والرموز
      const cleaned = rawQty.replace(/[,،]/g, '').replace(/[^\d.-]/g, '');
      qty = parseFloat(cleaned) || 0;
    }
    
    return {
      item_number: String(q.item_number || q.itemNumber || q.no || idx + 1),
      category: q.category || q.Category || 'General',
      subcategory: q.subcategory || q.subCategory || q.sub_category || '',
      description: q.description || q.Description || q.desc || '',
      quantity: qty,
      unit: q.unit || q.Unit || '-',
      measurement_basis: q.measurement_basis || q.measurementBasis || '',
      pipe_diameter: q.pipe_diameter || q.pipeDiameter || q.diameter || '',
      pipe_material: q.pipe_material || q.pipeMaterial || q.material || '',
      notes: q.notes || q.Notes || ''
    };
  }).filter(q => q.description); // إزالة البنود الفارغة
};
```

### 2. تطبيق التطبيع عند استلام النتائج

```typescript
// سطر 200-207 - تحديث
const result: DrawingAnalysisResult = {
  fileId: file.id,
  fileName: file.name,
  success: data.success,
  quantities: normalizeQuantities(data.analysis?.quantities || []),  // ← تطبيع هنا
  drawingInfo: data.analysis?.drawing_info || { title: file.name, type: drawingType, scale: "N/A" },
  summary: data.analysis?.summary || { totalItems: 0, categories: [] },
};
```

### 3. إضافة حماية عند العرض (fallback)

```typescript
// سطر 608 - تحديث العرض ليكون آمناً
<TableCell className="text-right font-mono font-semibold">
  {(q.quantity || 0).toLocaleString()}
</TableCell>
```

### 4. إضافة logging للتشخيص (مؤقت)

```typescript
console.log("Raw AI quantities:", data.analysis?.quantities);
console.log("Normalized quantities:", normalizedQtys);
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/FastExtractionDrawingAnalyzer.tsx` | إضافة دالة التطبيع + تحديث معالجة النتائج |

## الكود التفصيلي

### FastExtractionDrawingAnalyzer.tsx

#### إضافة دالة التطبيع (بعد الـ interfaces):

```typescript
// Normalize quantities from AI response to handle different field names and types
const normalizeQuantities = (quantities: any[]): ExtractedQuantity[] => {
  if (!Array.isArray(quantities)) {
    console.warn("Quantities is not an array:", quantities);
    return [];
  }
  
  return quantities.map((q, idx) => {
    // Extract quantity from multiple possible field names
    let qty = 0;
    const rawQty = q?.quantity ?? q?.qty ?? q?.Quantity ?? q?.QTY ?? q?.amount ?? q?.Amount ?? 0;
    
    // Convert to number safely
    if (typeof rawQty === 'number' && !isNaN(rawQty)) {
      qty = rawQty;
    } else if (typeof rawQty === 'string') {
      // Remove commas, Arabic commas, and non-numeric chars except decimal point
      const cleaned = rawQty.replace(/[,،\s]/g, '').replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      qty = isNaN(parsed) ? 0 : parsed;
    }
    
    return {
      item_number: String(q?.item_number || q?.itemNumber || q?.no || q?.num || idx + 1),
      category: q?.category || q?.Category || 'General',
      subcategory: q?.subcategory || q?.subCategory || q?.sub_category || '',
      description: q?.description || q?.Description || q?.desc || q?.name || '',
      quantity: qty,
      unit: q?.unit || q?.Unit || '-',
      measurement_basis: q?.measurement_basis || q?.measurementBasis || q?.basis || '',
      pipe_diameter: q?.pipe_diameter || q?.pipeDiameter || q?.diameter || q?.Diameter || '',
      pipe_material: q?.pipe_material || q?.pipeMaterial || q?.material || q?.Material || '',
      notes: q?.notes || q?.Notes || q?.remarks || ''
    };
  }).filter(q => q.description && q.description.trim() !== '');
};
```

#### تحديث معالجة النتائج:

```typescript
// Line ~200-207
const rawQuantities = data.analysis?.quantities || [];
console.log("Raw AI quantities:", JSON.stringify(rawQuantities.slice(0, 3)));

const normalizedQuantities = normalizeQuantities(rawQuantities);
console.log("Normalized quantities:", JSON.stringify(normalizedQuantities.slice(0, 3)));

const result: DrawingAnalysisResult = {
  fileId: file.id,
  fileName: file.name,
  success: data.success,
  quantities: normalizedQuantities,
  drawingInfo: data.analysis?.drawing_info || { title: file.name, type: drawingType, scale: "N/A" },
  summary: {
    totalItems: normalizedQuantities.length,
    categories: [...new Set(normalizedQuantities.map(q => q.category))],
    ...data.analysis?.summary
  },
};
```

#### تحديث عرض الجدول (سطر ~608):

```typescript
<TableCell className="text-right font-mono font-semibold">
  {typeof q.quantity === 'number' ? q.quantity.toLocaleString() : '0'}
</TableCell>
```

#### تحديث حساب الملخص (سطر ~552-557):

```typescript
{Object.entries(
  allQuantities.reduce((acc, q) => {
    const cat = q.category || "Other";
    if (!acc[cat]) acc[cat] = { count: 0, totalQty: 0, unit: q.unit || '-' };
    acc[cat].count++;
    acc[cat].totalQty += (typeof q.quantity === 'number' ? q.quantity : 0);
    return acc;
  }, {} as Record<string, { count: number; totalQty: number; unit: string }>)
).map(([category, data]) => {
```

## مخطط التدفق

```text
AI Response
     │
     ▼
┌─────────────────────────┐
│ data.analysis.quantities│
│ (raw, unvalidated)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ normalizeQuantities()   │
│ - Check field names     │
│ - Convert to number     │
│ - Handle strings        │
│ - Filter empty items    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ ExtractedQuantity[]     │
│ (validated, typed)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Display in Table        │
│ q.quantity.toLocaleString()
└─────────────────────────┘
```

## ملاحظات للاختبار

بعد التنفيذ:
1. ✅ تحليل نفس ملف PDF والتأكد من ظهور الكميات
2. ✅ فحص Console Logs لمعرفة البيانات الخام من AI
3. ✅ التأكد من أن الملخص يُظهر الأرقام الصحيحة
4. ✅ تصدير Excel/PDF والتأكد من الكميات
5. ✅ اختبار مع أنواع ملفات مختلفة (PDF, Image)
