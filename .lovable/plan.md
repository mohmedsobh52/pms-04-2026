

# إضافة ميزة رفع مجلد كامل مع التصنيف التلقائي

## الميزة المطلوبة

إضافة إمكانية رفع مجلد كامل (Folder Upload) بدلاً من اختيار الملفات واحداً واحداً، ثم يقوم النظام بتصنيف جميع الملفات تلقائياً.

## التغييرات المطلوبة

### 1. تحديث `FastExtractionUploader.tsx`

**إضافة زر رفع مجلد:**
```text
┌─────────────────────────────────────────────────────┐
│                                                     │
│         📁  Drag and drop files here               │
│             or click to select files                │
│                                                     │
│     ┌──────────────┐   ┌──────────────────┐        │
│     │ Select Files │   │ 📁 Select Folder │        │
│     └──────────────┘   └──────────────────┘        │
│                                                     │
│              Max size: 500MB                        │
└─────────────────────────────────────────────────────┘
```

**التغييرات التقنية:**

```typescript
// إضافة input جديد لرفع المجلدات
<input
  type="file"
  ref={folderInputRef}
  // webkitdirectory attribute للسماح باختيار مجلد
  {...{ webkitdirectory: "", directory: "" }}
  multiple
  onChange={handleFolderSelect}
  className="hidden"
/>

// دالة معالجة المجلد
const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    // تصفية الملفات حسب الأنواع المقبولة
    const acceptedFiles = Array.from(files).filter(file => 
      isAcceptedFileType(file)
    );
    handleFiles(acceptedFiles);
    
    toast.success(
      isArabic 
        ? `تم تحميل ${acceptedFiles.length} ملف من المجلد` 
        : `Loaded ${acceptedFiles.length} files from folder`
    );
  }
};
```

### 2. إضافة مؤشر مسار الملف (اختياري)

عرض مسار الملف داخل المجلد للتوضيح:

```typescript
interface UploadedFile {
  // ... existing fields
  relativePath?: string;  // المسار النسبي داخل المجلد
}

// استخراج المسار النسبي
const relativePath = (file as any).webkitRelativePath || file.name;
```

### 3. تحسين واجهة المستخدم

**إضافة أيقونة وزر للمجلد:**
- أيقونة `FolderUp` من Lucide
- زر منفصل "Select Folder" / "اختر مجلد"
- دعم سحب وإفلات المجلد (Drag & Drop Folder)

### 4. إضافة تصفية ذكية للملفات

```typescript
const ACCEPTED_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.webp'];
const EXCLUDED_PATTERNS = ['.DS_Store', 'Thumbs.db', '__MACOSX'];

const isAcceptedFileType = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  
  // استبعاد ملفات النظام
  if (EXCLUDED_PATTERNS.some(pattern => fileName.includes(pattern.toLowerCase()))) {
    return false;
  }
  
  // التحقق من الامتداد
  return ACCEPTED_EXTENSIONS.some(ext => fileName.endsWith(ext));
};
```

### 5. دعم السحب والإفلات للمجلدات

```typescript
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  
  const items = e.dataTransfer.items;
  const allFiles: File[] = [];
  
  // معالجة المجلدات والملفات
  for (const item of Array.from(items)) {
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        if (entry.isDirectory) {
          // قراءة محتويات المجلد
          const folderFiles = await readDirectory(entry as FileSystemDirectoryEntry);
          allFiles.push(...folderFiles);
        } else {
          const file = item.getAsFile();
          if (file && isAcceptedFileType(file)) {
            allFiles.push(file);
          }
        }
      }
    }
  }
  
  if (allFiles.length > 0) {
    handleFiles(allFiles);
  }
};

// دالة قراءة محتويات المجلد بشكل تكراري
const readDirectory = async (directory: FileSystemDirectoryEntry): Promise<File[]> => {
  const files: File[] = [];
  const reader = directory.createReader();
  
  const readEntries = (): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
  };
  
  let entries = await readEntries();
  while (entries.length > 0) {
    for (const entry of entries) {
      if (entry.isFile) {
        const file = await getFile(entry as FileSystemFileEntry);
        if (isAcceptedFileType(file)) {
          files.push(file);
        }
      } else if (entry.isDirectory) {
        // قراءة المجلدات الفرعية
        const subFiles = await readDirectory(entry as FileSystemDirectoryEntry);
        files.push(...subFiles);
      }
    }
    entries = await readEntries();
  }
  
  return files;
};
```

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `FastExtractionUploader.tsx` | إضافة زر رفع مجلد + دعم سحب المجلدات + تصفية الملفات |

## النتيجة المتوقعة

```text
✅ زر "Select Folder" لاختيار مجلد كامل
✅ سحب وإفلات مجلد في منطقة الرفع
✅ تصفية تلقائية للملفات غير المدعومة
✅ عرض عدد الملفات المحملة من المجلد
✅ الانتقال التلقائي للتصنيف بعد الرفع
✅ دعم المجلدات الفرعية (Nested Folders)
```

## ملاحظات تقنية

- خاصية `webkitdirectory` مدعومة في Chrome, Edge, Firefox
- Safari يدعمها جزئياً
- سيتم تجاهل ملفات النظام مثل `.DS_Store` و `Thumbs.db`

