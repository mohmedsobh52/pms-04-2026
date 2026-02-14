

# Improving Tender Summary PDF Report Quality

## Problems Identified from the PDF

1. **Guarantee types show raw database keys** like `bid_bond`, `performance_bond` instead of readable labels like "Bid Bond", "Performance Bond"
2. **Indirect cost categories show raw keys** like `headquarters`, `operational` instead of "Headquarters", "Operational Expenses"
3. **Arabic text is corrupted** in the PDF because jsPDF does not support Arabic fonts natively -- Arabic item names and category names appear as garbled characters (`þ"þóþ-...`)
4. **Indirect cost item names** default to Arabic (`c.name`) which corrupts in the PDF -- should use English names (`c.nameEn`)

## Solution

All changes are in a single file: `src/components/tender/TenderPDFExport.tsx`

### 1. Add Guarantee Type Labels Map

Add a lookup object at the top of the component to translate raw guarantee type keys to proper English labels:

```
const guaranteeTypeLabels: Record<string, string> = {
  bid_bond: "Bid Bond",
  performance_bond: "Performance Bond",
  advance_payment: "Advance Payment Bond",
  retention: "Retention Bond",
  maintenance: "Maintenance Bond",
  other: "Other",
};
```

### 2. Add Indirect Cost Category Labels Map

```
const indirectCategoryLabels: Record<string, string> = {
  headquarters: "Headquarters",
  operational: "Operational Expenses",
  financial: "Financial Costs",
  reserve: "Reserve",
  technical: "Technical Expenses",
  legal: "Legal Expenses",
  marketing: "Marketing & Relations",
  training: "Training & Development",
  safety: "Safety & Health",
  quality: "Quality Control",
  environmental: "Environmental",
  transport: "Transportation",
  other: "Other",
};
```

### 3. Fix Guarantee Table Data (line ~288-289)

Change from displaying the raw key to using the labels map:

**Before:** `g.type || g.typeEn`
**After:** `guaranteeTypeLabels[g.type] || g.typeEn || g.type`

### 4. Fix Indirect Costs Table Data (lines ~319-321)

Change category and name to always prefer English:

**Before:**
- Category: `c.category || c.categoryEn`
- Name: `c.name || c.nameEn`

**After:**
- Category: `indirectCategoryLabels[c.category] || c.categoryEn || c.category`
- Name: `c.nameEn || c.name`

### 5. Fix Staff Table (line ~194-195)

Prefer English position names to avoid Arabic corruption:

**Before:** `s.position || s.positionEn`
**After:** `s.positionEn || s.position`

### 6. Fix Facilities Table (line ~227)

**Before:** `f.name || f.nameEn`
**After:** `f.nameEn || f.name`

### 7. Fix Insurance Table (line ~258)

**Before:** `i.type || i.typeEn`
**After:** `i.typeEn || i.type`

### 8. Fix Subcontractors Table (line ~352)

**Before:** `s.subcontractorName || s.name || s.nameEn`
**After:** `s.subcontractorName || s.nameEn || s.name`

## Summary of Impact

| Issue | Before | After |
|-------|--------|-------|
| Guarantee type column | `bid_bond` | Bid Bond |
| Indirect cost category | `headquarters` | Headquarters |
| Arabic text in all tables | Corrupted characters | English labels used |

### File affected

`src/components/tender/TenderPDFExport.tsx` -- single file, all changes are label mapping and field priority fixes.

