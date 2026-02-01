
# خطة إصلاح خطأ Auto Classify (402 - نفاد رصيد AI)

## المشكلة

عند الضغط على زر **Auto Classify** في شاشة تصنيف الملفات، يظهر خطأ عام "The app encountered an error". السبب هو أن Edge Function تُرجع خطأ **402** (نفاد رصيد AI) ولكن الواجهة الأمامية لا تتعامل معه بشكل صحيح.

## التحليل الفني

### الخطأ الفعلي من Network Logs:
```
POST /functions/v1/classify-files
Status: 402
Response: {"error":"AI credits exhausted. Please add credits."}
```

### المشكلة في الكود الحالي:
```typescript
// FastExtractionClassifier.tsx - lines 79-82
} catch (error) {
  console.error("Classification error:", error);
  toast.error(isArabic ? "فشل التصنيف التلقائي" : "Auto-classification failed");
}
```

الكود الحالي:
- يلتقط جميع الأخطاء بشكل عام
- لا يتحقق من نوع الخطأ (402 أو 429)
- لا يُظهر رسالة مفيدة للمستخدم
- لا يوفر بديل محلي

## الحل المقترح

### 1. إضافة تصنيف محلي ذكي (Local Fallback)

تصنيف الملفات بناءً على اسم الملف ونوعه دون الحاجة لـ AI:

```typescript
const localClassifyFiles = (files: FileToClassify[]): ClassificationResult[] => {
  return files.map(file => {
    const name = file.fileName.toLowerCase();
    const type = file.fileType.toLowerCase();
    
    // BOQ patterns
    if (name.includes('boq') || name.includes('كمي') || name.includes('مقايس')) {
      return { fileName: file.fileName, category: 'boq', confidence: 0.8 };
    }
    // Drawing patterns
    if (name.includes('drawing') || name.includes('رسم') || name.includes('dwg') || type.includes('dwg')) {
      return { fileName: file.fileName, category: 'drawings', confidence: 0.8 };
    }
    // ... more patterns
    
    return { fileName: file.fileName, category: 'general', confidence: 0.5 };
  });
};
```

### 2. معالجة أخطاء محددة (402, 429)

```typescript
} catch (error: any) {
  console.error("Classification error:", error);
  
  // Check for specific error codes
  const errorMessage = error?.message || '';
  const statusCode = error?.status || 0;
  
  if (statusCode === 402 || errorMessage.includes('402') || errorMessage.includes('credits')) {
    // AI Credits exhausted - use local fallback
    toast.warning(
      isArabic 
        ? "نفد رصيد AI - يتم استخدام التصنيف المحلي" 
        : "AI credits exhausted - using local classification"
    );
    const localResults = localClassifyFiles(filesToClassify);
    // Apply local results...
    return;
  }
  
  if (statusCode === 429 || errorMessage.includes('429') || errorMessage.includes('rate')) {
    toast.error(
      isArabic 
        ? "تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً" 
        : "Rate limit exceeded. Please try again later"
    );
    return;
  }
  
  // Generic error
  toast.error(isArabic ? "فشل التصنيف التلقائي" : "Auto-classification failed");
}
```

### 3. إضافة زر للتصنيف المحلي كبديل

إضافة زر منفصل يسمح بالتصنيف المحلي مباشرة:

```typescript
<Button
  onClick={handleLocalClassify}
  variant="outline"
  className="gap-2"
>
  <Zap className="h-4 w-4" />
  {isArabic ? "تصنيف سريع" : "Quick Classify"}
</Button>
```

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/FastExtractionClassifier.tsx` | إضافة معالجة أخطاء محددة + تصنيف محلي |
| `src/lib/local-file-classification.ts` | ملف جديد - منطق التصنيف المحلي |

## منطق التصنيف المحلي الكامل

التصنيف يعتمد على أنماط في اسم الملف:

| الفئة | الأنماط (إنجليزي) | الأنماط (عربي) |
|-------|------------------|----------------|
| BOQ | boq, bill, quantity, pricing | كمي، مقايس، تسعير، بنود |
| Drawings | drawing, dwg, plan, section | رسم، مخطط، قطاع |
| Specifications | spec, standard, technical | مواصفات، معايير، فني |
| Contracts | contract, agreement, legal | عقد، اتفاقية، قانوني |
| Quotations | quotation, quote, bid, offer | عرض سعر، مناقصة، تسعيرة |
| Reports | report, analysis, study | تقرير، دراسة، تحليل |
| Schedules | schedule, timeline, gantt | جدول زمني، برنامج |
| General | (fallback) | (افتراضي) |

## تجربة المستخدم بعد الإصلاح

### السيناريو 1: AI يعمل بشكل طبيعي
1. المستخدم يضغط "Auto Classify"
2. يتم التصنيف عبر AI
3. تظهر رسالة نجاح ✓

### السيناريو 2: نفاد رصيد AI (402)
1. المستخدم يضغط "Auto Classify"
2. يظهر تحذير: "نفد رصيد AI - يتم استخدام التصنيف المحلي"
3. يتم التصنيف محلياً بناءً على اسم الملف
4. الملفات تُصنف تلقائياً ✓

### السيناريو 3: تجاوز حد الطلبات (429)
1. المستخدم يضغط "Auto Classify"
2. يظهر خطأ: "تم تجاوز الحد الأقصى. يرجى المحاولة لاحقاً"
3. المستخدم يمكنه استخدام "Quick Classify" أو التصنيف اليدوي

## مخطط التدفق

```text
Auto Classify Click
        │
        ▼
┌───────────────────┐
│ Call Edge Function│
│ classify-files    │
└───────────────────┘
        │
        ▼
    Response?
   /    │    \
  /     │     \
200    402    429
 │      │      │
 ▼      ▼      ▼
Apply  Local   Show
AI     Fallback Error
Results        Message
 │      │      │
 ▼      ▼      ▼
   ┌─────────┐
   │ Update  │
   │ Files   │
   └─────────┘
```

## التغييرات التفصيلية

### ملف جديد: `src/lib/local-file-classification.ts`

```typescript
interface FileToClassify {
  fileName: string;
  fileType: string;
}

interface ClassificationResult {
  fileName: string;
  category: string;
  confidence: number;
}

const CATEGORY_PATTERNS = {
  boq: {
    en: ['boq', 'bill of quantities', 'pricing', 'cost estimate', 'quantity'],
    ar: ['كمي', 'مقايس', 'تسعير', 'بنود', 'جدول الكميات']
  },
  drawings: {
    en: ['drawing', 'dwg', 'plan', 'section', 'elevation', 'detail', 'layout'],
    ar: ['رسم', 'مخطط', 'قطاع', 'واجهة', 'تفصيل', 'تخطيط']
  },
  specifications: {
    en: ['spec', 'specification', 'standard', 'technical', 'requirement'],
    ar: ['مواصفات', 'معايير', 'فني', 'متطلبات', 'شروط']
  },
  contracts: {
    en: ['contract', 'agreement', 'legal', 'terms', 'conditions'],
    ar: ['عقد', 'اتفاقية', 'قانوني', 'شروط']
  },
  quotations: {
    en: ['quotation', 'quote', 'bid', 'offer', 'proposal', 'tender'],
    ar: ['عرض', 'سعر', 'مناقصة', 'تسعيرة', 'اقتراح']
  },
  reports: {
    en: ['report', 'analysis', 'study', 'summary', 'review'],
    ar: ['تقرير', 'دراسة', 'تحليل', 'ملخص', 'مراجعة']
  },
  schedules: {
    en: ['schedule', 'timeline', 'gantt', 'program', 'milestone'],
    ar: ['جدول', 'زمني', 'برنامج', 'مراحل']
  }
};

export function classifyFilesLocally(files: FileToClassify[]): ClassificationResult[] {
  return files.map(file => {
    const name = file.fileName.toLowerCase();
    
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      const allPatterns = [...patterns.en, ...patterns.ar];
      if (allPatterns.some(pattern => name.includes(pattern))) {
        return {
          fileName: file.fileName,
          category,
          confidence: 0.75
        };
      }
    }
    
    return {
      fileName: file.fileName,
      category: 'general',
      confidence: 0.5
    };
  });
}
```

### تحديث: `src/components/FastExtractionClassifier.tsx`

التغييرات الرئيسية:
1. استيراد دالة التصنيف المحلي
2. تحديث `handleAutoClassify` للتعامل مع الأخطاء
3. إضافة زر "Quick Classify" كبديل

## ملاحظات للاختبار

1. ✅ اختبار مع رصيد AI متاح - يجب أن يعمل عادي
2. ✅ اختبار مع نفاد رصيد AI - يجب استخدام الفallback
3. ✅ اختبار زر Quick Classify - يجب أن يصنف محلياً
4. ✅ التأكد من ظهور الرسائل بالعربية والإنجليزية
