

# خطة إصلاح أزرار التصدير في تبويب Export

## المشكلة المُكتشفة

بعد التحقيق في قاعدة البيانات وكود التطبيق:

1. **المشروع "الدلم" يحتوي على 834 عنصر** في `analysis_data.items`
2. **البيانات موجودة بشكل صحيح** في قاعدة البيانات
3. **المشكلة**: عند اختيار المشروع، قد تكون دالة `getProjectItems()` لا تعمل بسبب:
   - عدم تحديث `hasData` عند تغيير المشروع المختار
   - عدم وجود logging للتصحيح

## الحل المقترح

### 1. إضافة console.log للتصحيح

```typescript
const selectedProject = projects.find(p => p.id === selectedProjectId);

// Debug logging
console.log("Selected Project ID:", selectedProjectId);
console.log("Selected Project:", selectedProject);
console.log("Analysis Data:", selectedProject?.analysis_data);
```

### 2. تحسين دالة getProjectItems

```typescript
const getProjectItems = () => {
  console.log("Getting items for:", selectedProject?.name);
  
  if (!selectedProject?.analysis_data) {
    console.log("No analysis_data found");
    return [];
  }
  
  const data = selectedProject.analysis_data;
  console.log("Analysis data type:", typeof data);
  console.log("Analysis data keys:", Object.keys(data));
  
  // Handle string data (if JSON wasn't parsed)
  let parsedData = data;
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse analysis_data:", e);
      return [];
    }
  }
  
  // Support different data structures
  const items = parsedData.items || 
                parsedData.boq_items || 
                parsedData.analysisData?.items || 
                [];
  
  console.log("Found items count:", items.length);
  return items;
};
```

### 3. إضافة useMemo للتحسين

```typescript
const projectItems = useMemo(() => getProjectItems(), [selectedProject]);
const hasData = projectItems.length > 0;
```

### 4. إضافة تنبيه مرئي

عند عدم وجود بيانات بعد اختيار مشروع، إظهار رسالة توضيحية:

```typescript
{selectedProjectId && !hasData && (
  <Alert variant="warning" className="mt-4">
    <AlertDescription>
      {isArabic 
        ? "هذا المشروع لا يحتوي على بيانات BOQ للتصدير. تأكد من تحليل الملف أولاً." 
        : "This project has no BOQ data to export. Make sure to analyze the file first."}
    </AlertDescription>
  </Alert>
)}
```

---

## التعديلات المطلوبة

| الملف | التغيير |
|-------|---------|
| `src/components/reports/ExportTab.tsx` | إضافة logging + تحسين getProjectItems + useMemo |

---

## التغييرات التفصيلية

```typescript
// src/components/reports/ExportTab.tsx

import React, { useState, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ... existing code ...

export const ExportTab = React.forwardRef<HTMLDivElement, ExportTabProps>(
  ({ projects, isLoading }, ref) => {
    const { isArabic } = useLanguage();
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    // Debug: log when project changes
    console.log("ExportTab - selectedProjectId:", selectedProjectId);
    console.log("ExportTab - selectedProject:", selectedProject?.name);
    console.log("ExportTab - analysis_data keys:", 
      selectedProject?.analysis_data ? Object.keys(selectedProject.analysis_data) : null
    );

    // Helper function with improved parsing
    const getProjectItems = () => {
      if (!selectedProject?.analysis_data) return [];
      
      let data = selectedProject.analysis_data;
      
      // Handle if data is a string (JSON not parsed)
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse analysis_data:", e);
          return [];
        }
      }
      
      // Support different data structures
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data.boq_items)) return data.boq_items;
      if (data.analysisData && Array.isArray(data.analysisData.items)) {
        return data.analysisData.items;
      }
      
      return [];
    };

    // Use useMemo to recalculate when selectedProject changes
    const projectItems = useMemo(() => getProjectItems(), [selectedProject]);
    const hasData = projectItems.length > 0;

    console.log("ExportTab - projectItems count:", projectItems.length);
    console.log("ExportTab - hasData:", hasData);

    // ... rest of handlers use projectItems instead of calling getProjectItems() ...

    const handleExportBOQ = () => {
      if (projectItems.length === 0) {
        toast.error(isArabic ? "لا توجد بيانات للتصدير" : "No data to export");
        return;
      }
      exportBOQToExcel(projectItems, selectedProject?.name || "Project");
      toast.success(isArabic ? "تم تصدير جدول الكميات بنجاح" : "BOQ exported successfully");
    };

    // Similar updates for all other handlers...
  }
);
```

---

## النتيجة المتوقعة

```text
✅ Console logs للتصحيح عند اختيار مشروع
✅ دعم بيانات JSON النصية (string)
✅ استخدام useMemo لإعادة الحساب عند تغيير المشروع
✅ رسالة تحذير واضحة عند عدم وجود بيانات
✅ جميع أزرار التصدير تعمل بشكل صحيح
```

