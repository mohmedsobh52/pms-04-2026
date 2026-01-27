

# خطة إضافة الهيدر الاحترافي مع الشعار على جميع الملفات المستخرجة

## نظرة عامة

سيتم تطبيق تصميم الهيدر المرفق (ثلاثي الأعمدة) على جميع الملفات المستخرجة من البرنامج:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  AL IMTYAZ ALWATANIYA CONT.    [LOGO]    الإمتياز الوطنية للمـقـاولات        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## التصميم المستهدف

| الموقع | المحتوى |
|--------|---------|
| **يسار** | اسم الشركة بالإنجليزية (من إعدادات الشركة) |
| **وسط** | شعار الشركة (من localStorage) |
| **يمين** | اسم الشركة بالعربية (من إعدادات الشركة) |

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `src/components/reports/ExportTab.tsx` | إضافة الهيدر لـ PDF والطباعة |
| `src/lib/reports-export-utils.ts` | إضافة الهيدر لـ Excel و PDF |
| `src/lib/docx-utils.ts` | إضافة الهيدر لـ Word |
| `src/components/WordExportDialog.tsx` | تمرير بيانات الشعار |

---

## التفاصيل التقنية

### 1. تحديث ExportTab.tsx (PDF و Print)

**التغييرات:**

إضافة استيرادات:
```typescript
import { getStoredLogo } from "@/components/CompanyLogoUpload";
import { getCompanySettings } from "@/hooks/useCompanySettings";
```

تعديل الهيدر في `handleExportComprehensivePDF` و `handleViewPriceAnalysis` و `handlePrintReport`:

```typescript
const companyLogo = getStoredLogo();
const companySettings = getCompanySettings();
const companyNameEn = companySettings.companyNameEn || 'AL IMTYAZ ALWATANIYA CONT.';
const companyNameAr = companySettings.companyNameAr || 'الإمتياز الوطنية للمـقـاولات';
```

تصميم الهيدر الجديد:
```html
<div class="company-header">
  <div class="company-name-en">${companyNameEn}</div>
  <div class="company-logo">
    ${companyLogo ? `<img src="${companyLogo}" alt="Logo" />` : ''}
  </div>
  <div class="company-name-ar">${companyNameAr}</div>
</div>
```

CSS للهيدر:
```css
.company-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 25px;
  background: #fff;
  border-bottom: 3px solid #1e40af;
  margin-bottom: 20px;
}
.company-name-en {
  font-size: 14px;
  font-weight: 600;
  font-style: italic;
  color: #1e293b;
  font-family: 'Times New Roman', serif;
}
.company-name-ar {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  font-family: 'Cairo', sans-serif;
}
.company-logo img {
  max-height: 50px;
  max-width: 80px;
  object-fit: contain;
}
```

---

### 2. تحديث reports-export-utils.ts (Excel)

**التغييرات:**

إضافة دالة مساعدة لإنشاء هيدر Excel:
```typescript
const addCompanyHeaderToWorksheet = (
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  companyLogo: string | null,
  companyNameEn: string,
  companyNameAr: string
) => {
  let startRow = 1;
  
  // إضافة صف الهيدر
  worksheet.mergeCells('A1:B1');
  worksheet.getCell('A1').value = companyNameEn;
  worksheet.getCell('A1').font = { bold: true, italic: true, name: 'Times New Roman', size: 12 };
  worksheet.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };
  
  // العمود الأوسط للشعار (يتم إضافة الصورة إذا وجدت)
  if (companyLogo) {
    const base64Data = companyLogo.split(',')[1];
    const imageId = workbook.addImage({
      base64: base64Data,
      extension: 'png',
    });
    worksheet.addImage(imageId, {
      tl: { col: 2, row: 0 },
      ext: { width: 80, height: 40 }
    });
  }
  
  // الاسم العربي على اليمين
  worksheet.mergeCells('E1:F1');
  worksheet.getCell('E1').value = companyNameAr;
  worksheet.getCell('E1').font = { bold: true, name: 'Cairo', size: 14 };
  worksheet.getCell('E1').alignment = { horizontal: 'right', vertical: 'middle' };
  
  worksheet.getRow(1).height = 45;
  
  // خط فاصل
  worksheet.getRow(2).height = 5;
  ['A2', 'B2', 'C2', 'D2', 'E2', 'F2'].forEach(cell => {
    worksheet.getCell(cell).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
  });
  
  return 4; // الصف الذي تبدأ منه البيانات
};
```

تحديث `exportBOQToExcel` و `exportEnhancedBOQToExcel` و `exportTenderSummaryToExcel`:
```typescript
export const exportBOQToExcel = async (items: BOQItem[], projectName: string, isArabic = false) => {
  const companyLogo = getStoredLogo();
  const companySettings = getCompanySettings();
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('BOQ', {
    views: [{ rightToLeft: isArabic }]
  });

  // إضافة الهيدر
  const dataStartRow = addCompanyHeaderToWorksheet(
    workbook,
    worksheet,
    companyLogo,
    companySettings.companyNameEn || 'AL IMTYAZ ALWATANIYA CONT.',
    companySettings.companyNameAr || 'الإمتياز الوطنية للمـقـاولات'
  );

  // ... باقي الكود يبدأ من dataStartRow
};
```

---

### 3. تحديث docx-utils.ts (Word)

**التغييرات:**

تعديل دالة `createCoverPage` لإضافة الهيدر:
```typescript
const createCompanyHeader = (
  companyLogo: string | null,
  companyNameEn: string,
  companyNameAr: string
): Paragraph[] => {
  const headerElements: Paragraph[] = [];
  
  // صف الهيدر مع الأسماء والشعار
  const children: TextRun[] = [];
  
  // الاسم الإنجليزي
  children.push(
    new TextRun({
      text: companyNameEn,
      bold: true,
      italics: true,
      font: 'Times New Roman',
      size: 24,
      color: '1E293B',
    })
  );
  
  // مسافة
  children.push(
    new TextRun({
      text: '          ',
    })
  );
  
  // الاسم العربي
  children.push(
    new TextRun({
      text: companyNameAr,
      bold: true,
      font: 'Cairo',
      size: 28,
      color: '1E293B',
    })
  );
  
  headerElements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children,
    })
  );
  
  // خط فاصل
  headerElements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: {
        bottom: { color: '1E40AF', size: 12, style: BorderStyle.SINGLE }
      },
      spacing: { after: 300 },
      children: [new TextRun({ text: '' })],
    })
  );
  
  return headerElements;
};
```

تعديل `generateWordDocument`:
```typescript
export async function generateWordDocument(options: WordExportOptions): Promise<Blob> {
  const { 
    projectName, 
    companyName,
    companyLogo,  // تم إضافته
    // ...
  } = options;

  // جلب بيانات الشركة
  const companySettings = getCompanySettings();
  const companyNameEn = companySettings.companyNameEn || 'AL IMTYAZ ALWATANIYA CONT.';
  const companyNameAr = companySettings.companyNameAr || 'الإمتياز الوطنية للمـقـاولات';
  const logoFromSettings = companyLogo || getStoredLogo();

  const sections = [];

  // إضافة هيدر الشركة في بداية الوثيقة
  sections.push(...createCompanyHeader(logoFromSettings, companyNameEn, companyNameAr));

  // ... باقي الأقسام
}
```

---

### 4. تحديث WordExportDialog.tsx

**التغييرات:**
```typescript
import { getStoredLogo } from "@/components/CompanyLogoUpload";
import { getCompanySettings } from "@/hooks/useCompanySettings";

const handleExport = async () => {
  setIsGenerating(true);
  try {
    const companyLogo = getStoredLogo();
    const companySettings = getCompanySettings();
    
    const blob = await generateWordDocument({
      projectName,
      boqItems,
      timelineItems,
      resourceItems,
      procurementItems,
      currency,
      companyName: companySettings.companyNameEn || companyName,
      companyLogo,  // إضافة الشعار
      includeSections: sections,
    });

    downloadWordDocument(blob, fileName);
    // ...
  }
}
```

---

## ملخص التعديلات

| الملف | التغيير الرئيسي |
|-------|-----------------|
| `ExportTab.tsx` | إضافة هيدر ثلاثي الأعمدة لجميع تقارير PDF/Print |
| `reports-export-utils.ts` | إضافة هيدر مع شعار لملفات Excel |
| `docx-utils.ts` | إضافة هيدر لملفات Word |
| `WordExportDialog.tsx` | تمرير بيانات الشعار |

---

## النتيجة المتوقعة

### قبل التعديل:
- تقارير بدون هوية الشركة
- لا يظهر الشعار في أي ملف مستخرج

### بعد التعديل:
| نوع الملف | الهيدر |
|-----------|--------|
| **PDF** | اسم إنجليزي (يسار) + شعار (وسط) + اسم عربي (يمين) |
| **Print** | نفس تصميم PDF |
| **Excel** | صف هيدر مع شعار وأسماء ثنائية اللغة |
| **Word** | صفحة غلاف مع هيدر الشركة |

---

## ملاحظات هامة

1. **مصدر البيانات**: 
   - الشعار من `localStorage` عبر `getStoredLogo()`
   - أسماء الشركة من `getCompanySettings()`

2. **القيم الافتراضية**: 
   - إذا لم يُرفع شعار، يظهر الهيدر بدون صورة
   - إذا لم تُملأ أسماء الشركة، تُستخدم قيم افتراضية

3. **التوافق مع RTL**: 
   - التصميم يعمل مع اللغتين
   - ترتيب العناصر ثابت (EN يسار، AR يمين)

4. **جودة الشعار**: 
   - الشعار محفوظ بحد أقصى 300px
   - يتم تصغيره تلقائياً في التقارير

