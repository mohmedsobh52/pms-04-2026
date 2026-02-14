

# Adding Page Tips Box to Every Page

## Overview

Create a collapsible "Tips" box that appears on every page, providing contextual usage guidance for each section of the application. The tips will be page-specific based on the current route.

## Design

- A collapsible card with a lightbulb icon, initially collapsed to avoid cluttering the UI
- Users can expand/collapse it; the collapsed state is saved in localStorage
- Each page gets its own set of tips (bilingual: English + Arabic)
- Placed inside `PageLayout` so it automatically appears on all pages

## Technical Details

### 1. New Component: `src/components/PageTipsBox.tsx`

A reusable collapsible tips component that:
- Accepts tips as props OR auto-detects from the current route using `useLocation()`
- Uses `Collapsible` from Radix UI (already installed)
- Shows a `Lightbulb` icon with "Usage Tips" title
- Stores open/closed state in localStorage per page
- Supports bilingual tips (English/Arabic)

### 2. Tips Data: `src/lib/page-tips.ts`

A centralized map of route patterns to tips arrays:

| Route Pattern | Page | Example Tips |
|---------------|------|-------------|
| `/dashboard` | Dashboard | "View all your projects at a glance", "Click on a project to see details" |
| `/projects/:id` | Project Details | "Use the BOQ tab to manage items", "Export reports from the Documents tab" |
| `/tender/:id` | Tender Summary | "Add staff, facilities, and insurance costs", "Export PDF from the top toolbar" |
| `/reports` | Reports | "Compare multiple projects side by side", "Export data in Excel or PDF format" |
| `/procurement` | Procurement | "Manage external partners and contracts", "Track partner performance" |
| `/contracts` | Contracts | "Create and manage project contracts", "Set milestones and payment schedules" |
| `/risk` | Risk Management | "Identify and assess project risks", "Set mitigation strategies" |
| `/library` | Library | "Manage materials, labor, and equipment rates", "Import rates from Excel" |
| `/quotations` | Quotations | "Upload and compare supplier quotations" |
| `/resources` | Resources | "Plan resource allocation with Gantt charts" |
| `/historical-pricing` | Historical Pricing | "Compare prices across past projects" |
| `/saved-projects` | Saved Projects | "Load, compare, or delete saved projects" |
| `/settings` | Settings | "Configure application preferences" |
| ... and more for each page |

Each tip entry has `{ en: string, ar: string }` for bilingual support.

### 3. Modify `PageLayout.tsx`

Add the `PageTipsBox` component after the `NavigationBar` and before the `PageTransition` content. The component auto-detects the current route and shows relevant tips.

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/page-tips.ts` | Create - tips data map |
| `src/components/PageTipsBox.tsx` | Create - reusable tips component |
| `src/components/PageLayout.tsx` | Modify - add PageTipsBox |

