

# خطة إضافة زر "تحليل الكل" مع اختيار تحديد الكل

## الهدف

إضافة زر لتحليل جميع عروض الأسعار دفعة واحدة مع إمكانية:
1. تحديد الكل / إلغاء تحديد الكل
2. تحليل جميع العروض المحددة بالتسلسل

## التصميم المقترح

### واجهة المستخدم

```text
┌─────────────────────────────────────────────────────────────────┐
│ عروض الأسعار المرفوعة (7)                                        │
│                                                                   │
│ ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│ │ ☑ تحديد الكل        │  │ ✨ تحليل المحدد  │  │ إلغاء التحديد│ │
│ └──────────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                   │
│ ☐ SQ1-54260 HDPE QUOTATION SPS           [OCR] [تحليل AI] [👁] 🗑 │
│ ☐ QUOTATION 38181 02.11.2025 RVK         [OCR] [تحليل AI] [👁] 🗑 │
│ ☐ SPS Q1-54514                           [OCR] [تحليل AI] [👁] 🗑 │
│ ...                                                               │
└───────────────────────────────────────────────────────────────────┘
```

### حالة التحليل الجماعي

```text
┌──────────────────────────────────────────────────────────┐
│ ████████████████████░░░░░░░░░░ 60%                       │
│ جاري تحليل 3 من 5 عروض...                               │
│ الحالي: SPS Q1-54514                                     │
└──────────────────────────────────────────────────────────┘
```

## التغييرات المطلوبة

### ملف: `src/components/QuotationUpload.tsx`

#### 1. إضافة State جديدة

```typescript
// State للتحديد الجماعي
const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set());
const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentName: '' });
```

#### 2. إضافة دوال التحديد

```typescript
// تحديد الكل
const handleSelectAll = () => {
  const pendingIds = quotations
    .filter(q => q.status !== 'analyzed')
    .map(q => q.id);
  setSelectedForBatch(new Set(pendingIds));
};

// إلغاء تحديد الكل
const handleDeselectAll = () => {
  setSelectedForBatch(new Set());
};

// تبديل تحديد عرض واحد
const toggleSelection = (id: string) => {
  setSelectedForBatch(prev => {
    const newSet = new Set(prev);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return newSet;
  });
};
```

#### 3. إضافة دالة التحليل الجماعي

```typescript
// تحليل جميع العروض المحددة
const handleBatchAnalyze = async () => {
  if (selectedForBatch.size === 0) {
    toast({
      title: "لا توجد عروض محددة",
      description: "يرجى تحديد عرض واحد على الأقل",
      variant: "destructive",
    });
    return;
  }

  const quotationsToAnalyze = quotations.filter(
    q => selectedForBatch.has(q.id) && q.status !== 'analyzed'
  );

  if (quotationsToAnalyze.length === 0) {
    toast({
      title: "جميع العروض محللة",
      description: "العروض المحددة تم تحليلها مسبقاً",
    });
    return;
  }

  setIsBatchAnalyzing(true);
  setBatchProgress({ current: 0, total: quotationsToAnalyze.length, currentName: '' });

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < quotationsToAnalyze.length; i++) {
    const quotation = quotationsToAnalyze[i];
    setBatchProgress({ 
      current: i + 1, 
      total: quotationsToAnalyze.length, 
      currentName: quotation.name 
    });

    try {
      await analyzeQuotation(quotation);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`Failed to analyze ${quotation.name}:`, error);
    }

    // تأخير بسيط لتجنب حدود الـ rate limit
    if (i < quotationsToAnalyze.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  setIsBatchAnalyzing(false);
  setSelectedForBatch(new Set());
  
  toast({
    title: "اكتمل التحليل الجماعي",
    description: `نجح: ${successCount} | فشل: ${failCount}`,
    variant: failCount > 0 ? "default" : "default",
  });
};
```

#### 4. تحديث واجهة المستخدم - إضافة شريط التحكم

```tsx
{/* Bulk Actions Bar */}
{quotations.length > 0 && (
  <Card>
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">
          عروض الأسعار المرفوعة ({quotations.length})
        </CardTitle>
        
        <div className="flex items-center gap-2">
          {/* Select All / Deselect All */}
          <Button
            variant="outline"
            size="sm"
            onClick={selectedForBatch.size > 0 ? handleDeselectAll : handleSelectAll}
            disabled={isBatchAnalyzing}
            className="gap-1.5"
          >
            {selectedForBatch.size > 0 ? (
              <>
                <X className="w-3.5 h-3.5" />
                إلغاء التحديد ({selectedForBatch.size})
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                تحديد الكل
              </>
            )}
          </Button>

          {/* Batch Analyze Button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleBatchAnalyze}
            disabled={selectedForBatch.size === 0 || isBatchAnalyzing}
            className="gap-1.5 bg-primary"
          >
            {isBatchAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            تحليل المحدد ({selectedForBatch.size})
          </Button>
        </div>
      </div>
    </CardHeader>
    
    {/* Batch Progress */}
    {isBatchAnalyzing && (
      <div className="px-6 pb-4 space-y-2">
        <Progress 
          value={(batchProgress.current / batchProgress.total) * 100} 
        />
        <p className="text-sm text-muted-foreground text-center">
          جاري تحليل {batchProgress.current} من {batchProgress.total}...
          <span className="block text-xs">{batchProgress.currentName}</span>
        </p>
      </div>
    )}
    
    <CardContent>
      {/* Quotation items with checkboxes */}
    </CardContent>
  </Card>
)}
```

#### 5. إضافة Checkbox لكل عرض

```tsx
<div className="flex items-center gap-4">
  {/* Selection Checkbox */}
  <Checkbox
    checked={selectedForBatch.has(quotation.id)}
    onCheckedChange={() => toggleSelection(quotation.id)}
    disabled={isBatchAnalyzing || quotation.status === 'analyzed'}
    className="h-5 w-5"
  />
  
  {/* Existing file icon and info */}
  <div className={`w-10 h-10 rounded-lg...`}>
    ...
  </div>
</div>
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/QuotationUpload.tsx` | إضافة التحديد الجماعي والتحليل الجماعي |

## مميزات الحل

1. **تحديد سريع**: زر واحد لتحديد جميع العروض غير المحللة
2. **تقدم مرئي**: شريط تقدم يظهر حالة التحليل الجماعي
3. **حماية من الـ Rate Limit**: تأخير 2 ثانية بين كل تحليل
4. **تخطي المحلل**: العروض التي تم تحليلها مسبقاً لا تظهر في التحديد
5. **تقرير نهائي**: إظهار عدد الناجح والفاشل

## ملاحظات

- العروض التي تحتاج OCR (PDF ممسوح ضوئياً) ستفشل في التحليل التلقائي
- يمكن للمستخدم تحديد عروض محددة بدلاً من تحديد الكل
- الزر معطل أثناء التحليل الجماعي لمنع التداخل

