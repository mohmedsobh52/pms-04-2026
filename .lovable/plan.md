
# خطة إصلاح مشكلة عدم ظهور سعر البند في التقارير

## المشكلة

في تقرير "Bill of Quantities Report - Comprehensive Pricing"، جميع الأسعار تظهر "-" رغم أن:
- Total Items: 485
- **Total Value: 0** ← المشكلة الرئيسية
- Excluded Items: 349

## التحليل الفني

### السبب الجذري

البيانات في `analysis_data` تحتوي على أسعار **صفر** من التحليل الأولي:

```json
{
  "unit_price": 0,
  "total_price": 0,
  "rate": 0
}
```

بينما الأسعار المُحدّثة (بعد التسعير بـ AI أو يدوياً) مُخزنة في جدول `project_items` منفصل.

### المشكلة في الكود

```typescript
// سطر 86-94 في ExportTab.tsx
const items = getProjectItems(selectedProject);  // يجلب من analysis_data أولاً

if (items.length > 0) {
  setDynamicItems(items);  // ← يستخدم البيانات القديمة مع أسعار صفر
  return;
}

// فقط إذا لم يجد بنود، يجلب من project_items
```

**النتيجة:** التقرير يستخدم `analysis_data` (أسعار قديمة = 0) بدلاً من `project_items` (أسعار محدّثة).

### تحقق من البيانات

| المصدر | unit_price | total_price |
|--------|------------|-------------|
| `analysis_data` | 0 | 0 |
| `project_items` | ✓ قيم صحيحة | ✓ قيم صحيحة |

## الحل المقترح

### الاستراتيجية: جلب `project_items` أولاً

تغيير ترتيب الأولوية ليجلب من `project_items` (الأسعار المحدّثة) قبل `analysis_data`:

```typescript
// الترتيب الجديد:
// 1. جلب من project_items (الأسعار الأحدث)
// 2. إذا لم يوجد، استخدم analysis_data
```

### التغييرات المطلوبة

#### 1. تحديث منطق جلب البيانات

```typescript
// ExportTab.tsx - useEffect
useEffect(() => {
  const fetchItems = async () => {
    if (!selectedProject) {
      setDynamicItems([]);
      return;
    }
    
    setIsLoadingItems(true);
    
    // الأولوية 1: جلب من project_items (الأسعار المحدّثة)
    try {
      const { data: dbItems, error } = await supabase
        .from("project_items")
        .select("*")
        .eq("project_id", selectedProject.id)
        .order("item_number");
      
      if (!error && dbItems && dbItems.length > 0) {
        console.log("✅ Using project_items (updated prices):", dbItems.length);
        setDynamicItems(dbItems);
        setIsLoadingItems(false);
        return;
      }
    } catch (err) {
      console.error("Error fetching project_items:", err);
    }
    
    // الأولوية 2: استخدام analysis_data كـ fallback
    const items = getProjectItems(selectedProject);
    if (items.length > 0) {
      console.log("⚠️ Using analysis_data (may have outdated prices):", items.length);
      setDynamicItems(items);
    } else {
      setDynamicItems([]);
    }
    
    setIsLoadingItems(false);
  };
  
  fetchItems();
}, [selectedProjectId, selectedProject?.analysis_data]);
```

#### 2. إضافة تطبيع الأسعار للتأكد من أنها أرقام

```typescript
// دالة مساعدة لتطبيع الأسعار
const normalizeItemPrices = (items: any[]): any[] => {
  return items.map(item => {
    // استخراج السعر من حقول متعددة محتملة
    const unitPrice = parseFloat(
      item.unit_price || item.rate || item.price || item.ai_rate || 0
    ) || 0;
    
    const quantity = parseFloat(item.quantity || item.qty || 0) || 0;
    const totalPrice = parseFloat(
      item.total_price || item.amount || item.total || (unitPrice * quantity)
    ) || 0;
    
    return {
      ...item,
      unit_price: unitPrice,
      total_price: totalPrice,
      quantity: quantity
    };
  });
};
```

#### 3. تحديث حساب القيمة الإجمالية

```typescript
// عند حساب totalValue
const totalValue = filteredItems.reduce((sum: number, item: any) => {
  const price = parseFloat(item.total_price) || 
                parseFloat(item.amount) || 
                (parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0)) || 
                0;
  return sum + price;
}, 0);
```

#### 4. تحديث عرض الجدول

```typescript
// تحديث منطق عرض الأسعار
${filteredItems.map((item: any, idx: number) => {
  // تطبيع القيم
  const unitPrice = parseFloat(item.unit_price) || parseFloat(item.rate) || 0;
  const aiRate = parseFloat(item.ai_rate) || parseFloat(item.ai_suggested_rate) || 0;
  const displayPrice = unitPrice > 0 ? unitPrice : aiRate;
  const quantity = parseFloat(item.quantity) || 0;
  const displayTotal = parseFloat(item.total_price) || (displayPrice * quantity) || 0;
  
  return `
    <tr>
      <td>${idx + 1}</td>
      <td>${item.description || '-'}</td>
      <td>${quantity > 0 ? quantity.toLocaleString('en-US') : '-'}</td>
      <td>${item.unit || '-'}</td>
      <td>${displayPrice > 0 ? displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
      <td class="ai-price">${aiRate > 0 ? aiRate.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
      <td>${displayTotal > 0 ? displayTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
    </tr>
  `;
}).join('')}
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/reports/ExportTab.tsx` | تغيير ترتيب جلب البيانات + تطبيع الأسعار |

## مخطط التدفق

```text
قبل الإصلاح:
┌─────────────────┐     ┌─────────────────┐
│ analysis_data   │ ──► │ أسعار = 0       │
│ (أولوية 1)      │     │ التقرير فارغ    │
└─────────────────┘     └─────────────────┘

بعد الإصلاح:
┌─────────────────┐     ┌─────────────────┐
│ project_items   │ ──► │ أسعار صحيحة     │
│ (أولوية 1)      │     │ التقرير مكتمل   │
└─────────────────┘     └─────────────────┘
         │
         ▼ (إذا فارغ)
┌─────────────────┐
│ analysis_data   │
│ (احتياطي)       │
└─────────────────┘
```

## اختبار الحل

1. ✅ فتح صفحة التقارير واختيار مشروع مُسعّر
2. ✅ الضغط على "Print" أو "PDF"
3. ✅ التأكد من ظهور الأسعار في الأعمدة
4. ✅ التأكد من أن Total Value ليس صفراً
5. ✅ تصدير Excel والتحقق من القيم
