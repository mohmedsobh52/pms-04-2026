
# نقل Fast Extraction إلى تبويب المرفقات (Attachments)

## الهدف

دمج جميع وظائف صفحة "الاستخراج السريع" (`FastExtractionPage`) داخل تبويب المرفقات في صفحة المشاريع `/projects?tab=attachments`، مع الاحتفاظ بجميع الوظائف والربط مع المشاريع.

## التحليل الحالي

```text
الهيكل الحالي:
┌─────────────────────────────────────────────────────┐
│ صفحة مستقلة: /fast-extraction                        │
├─────────────────────────────────────────────────────┤
│ FastExtractionStepper (خطوات العملية)                │
│ ├─ خطوة 1: FastExtractionUploader (رفع الملفات)     │
│ ├─ خطوة 2: FastExtractionClassifier (تصنيف)         │
│ ├─ خطوة 3: FastExtractionDrawingAnalyzer (تحليل)   │
│ └─ خطوة 4: FastExtractionProjectSelector (ربط)      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ تبويب المرفقات: /projects?tab=attachments            │
├─────────────────────────────────────────────────────┤
│ AttachmentsTab                                       │
│ └─ ProjectAttachments (إدارة الملفات فقط)           │
└─────────────────────────────────────────────────────┘
```

## الهيكل الجديد المقترح

```text
┌──────────────────────────────────────────────────────────────────┐
│ تبويب المرفقات المحسّن: /projects?tab=attachments                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ شريط الأدوات العلوي                                          │ │
│  │ [⚡ استخراج سريع] [📂 Project Filter] [+ Upload Files]       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ◄ عند الضغط على "استخراج سريع":                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ FastExtractionPanel (مكون جديد مدمج)                        │ │
│  │ ├─ FastExtractionStepper                                     │ │
│  │ ├─ FastExtractionUploader                                    │ │
│  │ ├─ FastExtractionClassifier                                  │ │
│  │ ├─ FastExtractionDrawingAnalyzer                             │ │
│  │ └─ FastExtractionProjectSelector                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ◄ أو عرض الملفات الحالية:                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ProjectAttachments (القائمة الحالية)                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## التغييرات المطلوبة

### 1. إنشاء مكون جديد `FastExtractionPanel.tsx`

مكون يجمع كل وظائف الاستخراج السريع في لوحة قابلة للتضمين:

```typescript
// src/components/fast-extraction/FastExtractionPanel.tsx
interface FastExtractionPanelProps {
  onComplete?: (projectId: string) => void;
  onCancel?: () => void;
  defaultProjectId?: string;
}

export function FastExtractionPanel({ 
  onComplete, 
  onCancel,
  defaultProjectId 
}: FastExtractionPanelProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [drawingResults, setDrawingResults] = useState<any[]>([]);
  
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {isArabic ? "الاستخراج السريع" : "Fast Extraction"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <FastExtractionStepper currentStep={currentStep} onStepClick={setCurrentStep} />
        {/* Step content... */}
      </CardContent>
    </Card>
  );
}
```

### 2. تحديث `AttachmentsTab.tsx`

إضافة زر الاستخراج السريع وحالة لعرض اللوحة:

```typescript
// src/components/projects/AttachmentsTab.tsx
import { FastExtractionPanel } from "@/components/fast-extraction/FastExtractionPanel";

export function AttachmentsTab({ initialProjectId }: AttachmentsTabProps) {
  const [showFastExtraction, setShowFastExtraction] = useState(false);
  
  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button 
          onClick={() => setShowFastExtraction(true)}
          className="gap-2"
          variant={showFastExtraction ? "secondary" : "default"}
        >
          <Zap className="w-4 h-4" />
          {isArabic ? "استخراج سريع" : "Fast Extraction"}
        </Button>
        {/* Project filter... */}
      </div>
      
      {/* Fast Extraction Panel */}
      {showFastExtraction && (
        <FastExtractionPanel
          defaultProjectId={selectedProjectId}
          onComplete={(projectId) => {
            setShowFastExtraction(false);
            setSelectedProjectId(projectId);
            // Refresh attachments
          }}
          onCancel={() => setShowFastExtraction(false)}
        />
      )}
      
      {/* Existing Project Attachments */}
      {!showFastExtraction && (
        <ProjectAttachments projectId={selectedProjectId} />
      )}
    </div>
  );
}
```

### 3. تحديث التوجيهات في `App.tsx`

إضافة إعادة توجيه من `/fast-extraction` إلى التبويب الجديد:

```typescript
// إعادة توجيه من الصفحة المستقلة إلى التبويب
<Route 
  path="/fast-extraction" 
  element={<Navigate to="/projects?tab=attachments&mode=extraction" replace />} 
/>
```

### 4. تحديث `SavedProjectsPage.tsx`

قراءة معلمة `mode=extraction` لفتح لوحة الاستخراج تلقائياً:

```typescript
const urlMode = searchParams.get("mode");
const [extractionMode, setExtractionMode] = useState(urlMode === "extraction");
```

### 5. إنشاء مجلد المكونات الجديد

```text
src/components/fast-extraction/
├── FastExtractionPanel.tsx       ← المكون الرئيسي المدمج
├── index.ts                       ← تصدير المكونات
└── (المكونات الأصلية تبقى في مكانها)
```

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `src/components/fast-extraction/FastExtractionPanel.tsx` | **ملف جديد** - المكون المدمج |
| `src/components/projects/AttachmentsTab.tsx` | إضافة زر وحالة الاستخراج السريع |
| `src/App.tsx` | إعادة توجيه `/fast-extraction` |
| `src/pages/SavedProjectsPage.tsx` | دعم معلمة `mode=extraction` |

## مميزات التكامل

1. **ربط مباشر بالمشروع**: عند اختيار مشروع في فلتر المرفقات، يُمرر تلقائياً للاستخراج السريع
2. **تحديث فوري**: بعد إكمال الاستخراج، تُحدث قائمة المرفقات تلقائياً
3. **توافق عكسي**: الروابط القديمة `/fast-extraction` تعمل (إعادة توجيه)
4. **تجربة سلسة**: لا حاجة للانتقال بين صفحات مختلفة
5. **الاحتفاظ بالوظائف**: جميع خطوات الاستخراج (رفع، تصنيف، تحليل، ربط) متاحة

## مخطط التدفق

```text
المستخدم يفتح /projects?tab=attachments
           │
           ▼
    ┌──────────────────┐
    │ شريط الأدوات     │
    │ [⚡ استخراج سريع] │
    └────────┬─────────┘
             │ (ضغط)
             ▼
    ┌──────────────────────────────────────┐
    │ FastExtractionPanel                   │
    │ ┌────────────────────────────────┐   │
    │ │ Stepper: [1]-[2]-[3]-[4]       │   │
    │ └────────────────────────────────┘   │
    │                                       │
    │ خطوة 1: رفع الملفات                   │
    │ خطوة 2: تصنيف بالذكاء الاصطناعي       │
    │ خطوة 3: تحليل الرسومات               │
    │ خطوة 4: ربط بالمشروع                 │
    │                                       │
    │ [إكمال] ─────────────────────────────│
    └──────────────────────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────┐
    │ تحديث قائمة ProjectAttachments       │
    │ مع الملفات الجديدة المضافة            │
    └──────────────────────────────────────┘
```
