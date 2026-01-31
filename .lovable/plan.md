

# نقل تبويب المرفقات (Attachments) إلى صفحة المشاريع

## الهدف

دمج صفحة المرفقات الكاملة داخل صفحة المشاريع `/projects` كتبويب رابع بجانب التبويبات الحالية (المشاريع، تحليل BOQ، التقارير).

## التحليل الحالي

```text
الهيكل الحالي:
┌──────────────────────────────────────────────┐
│  صفحة المشاريع /projects                      │
├──────────────────────────────────────────────┤
│  [المشاريع] [تحليل BOQ] [التقارير]           │
│  ────────────────────────────────────────────│
│  محتوى التبويب                               │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  صفحة المرفقات /attachments (منفصلة)          │
├──────────────────────────────────────────────┤
│  ProjectAttachments component                 │
└──────────────────────────────────────────────┘
```

## الهيكل المقترح

```text
الهيكل الجديد:
┌──────────────────────────────────────────────────────┐
│  صفحة المشاريع /projects                              │
├──────────────────────────────────────────────────────┤
│  [المشاريع] [تحليل BOQ] [التقارير] [📎 المرفقات]     │
│  ─────────────────────────────────────────────────── │
│  محتوى التبويب المختار                                │
│                                                       │
│  ◄ إذا تم اختيار "المرفقات":                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │  فلترة المشاريع                                  │ │
│  │  ProjectAttachments component                    │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## التغييرات المطلوبة

### 1. تحديث `src/pages/SavedProjectsPage.tsx`

**إضافة تبويب المرفقات:**

- استيراد `ProjectAttachments` component و `Paperclip` icon
- إضافة state للمشروع المختار في تبويب المرفقات
- إضافة تبويب رابع "المرفقات" في `TabsList`
- إضافة `TabsContent` جديد يحتوي على:
  - فلتر اختيار المشروع
  - مكون `ProjectAttachments`

```typescript
// إضافة في الاستيرادات
import { ProjectAttachments } from "@/components/ProjectAttachments";
import { Paperclip } from "lucide-react";

// تحديث التبويبات
<TabsTrigger value="attachments" className="gap-2">
  <Paperclip className="w-4 h-4" />
  {isArabic ? "المرفقات" : "Attachments"}
</TabsTrigger>

// إضافة محتوى التبويب
<TabsContent value="attachments">
  <AttachmentsTab projects={projects} isArabic={isArabic} />
</TabsContent>
```

### 2. إنشاء مكون جديد `src/components/projects/AttachmentsTab.tsx`

مكون يغلف `ProjectAttachments` مع فلتر المشاريع:

```typescript
interface AttachmentsTabProps {
  projects: ProjectData[];
  isArabic: boolean;
}

export function AttachmentsTab({ projects, isArabic }: AttachmentsTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  
  return (
    <div className="space-y-4">
      {/* Project Filter */}
      <Select ...>
        <SelectItem value="all">All Projects</SelectItem>
        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
      </Select>
      
      {/* Attachments */}
      <ProjectAttachments projectId={selectedProjectId} />
    </div>
  );
}
```

### 3. تحديث `src/App.tsx`

تغيير مسار `/attachments` ليُعيد التوجيه إلى `/projects?tab=attachments`:

```typescript
// قبل
<Route path="/attachments" element={<AttachmentsPage />} />

// بعد  
<Route path="/attachments" element={<Navigate to="/projects?tab=attachments" replace />} />
```

### 4. تحديث دعم URL Parameters

تحديث منطق قراءة التبويب من URL في `SavedProjectsPage.tsx`:

```typescript
const urlTab = searchParams.get("tab");
const initialTab = 
  urlTab === "analyze" ? "analyze" : 
  urlTab === "reports" ? "reports" : 
  urlTab === "attachments" ? "attachments" :  // ← إضافة
  "projects";
```

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `src/pages/SavedProjectsPage.tsx` | إضافة تبويب المرفقات + دعم URL parameter |
| `src/components/projects/AttachmentsTab.tsx` | **ملف جديد** - مكون التبويب |
| `src/App.tsx` | إعادة توجيه `/attachments` → `/projects?tab=attachments` |

## النتيجة المتوقعة

- ✅ تبويب جديد "المرفقات" في صفحة المشاريع
- ✅ جميع وظائف إدارة الملفات متاحة (رفع، تحليل، تصنيف، إلخ)
- ✅ فلترة الملفات حسب المشروع
- ✅ الروابط القديمة `/attachments` تعمل (إعادة توجيه)
- ✅ دعم URL مباشر `/projects?tab=attachments`

