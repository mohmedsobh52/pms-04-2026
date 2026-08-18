import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface AdminPdfFilters {
  search?: string;
  from?: string;
  to?: string;
  section?: string;
}

export interface AdminPdfOptions {
  isArabic: boolean;
  filters: AdminPdfFilters;
  generatedBy?: string | null;
  stats: Array<{ label: string; value: number | string }>;
  financial: Array<{ label: string; value: string }>;
  projects: Array<{ name: string; updated: string; value: string }>;
  activity: Array<{ action: string; date: string }>;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Admin dashboard PDF: branded header, the filters used for the snapshot,
 * and RTL-aware tables (columns and text flipped when Arabic is active).
 */
export function exportAdminDashboardPDF(opts: AdminPdfOptions): void {
  const { isArabic, filters, generatedBy, stats, financial, projects, activity } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const align: "left" | "right" = isArabic ? "right" : "left";
  const anchor = isArabic ? pageWidth - margin : margin;
  let y = margin;

  // ---- Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(isArabic ? "Admin Dashboard Report" : "Admin Dashboard Report", anchor, 12, { align });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${isArabic ? "Generated" : "Generated"}: ${new Date().toLocaleString("en-GB")}${generatedBy ? `  |  ${generatedBy}` : ""}`,
    anchor,
    19,
    { align }
  );
  doc.setTextColor(0, 0, 0);
  y = 34;

  // ---- Applied filters
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(isArabic ? "Applied filters" : "Applied filters", anchor, y, { align });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  const filterLines = [
    `Search: ${filters.search?.trim() || "—"}`,
    `Date range: ${filters.from || "…"} → ${filters.to || "…"}`,
    `Section: ${filters.section || "all"}`,
  ];
  filterLines.forEach((line) => {
    doc.text(line, anchor, y, { align });
    y += 4.5;
  });
  doc.setTextColor(0);
  y += 3;

  const tableOpts = {
    theme: "grid" as const,
    styles: { fontSize: 9, halign: align, cellPadding: 2 },
    headStyles: { fillColor: [13, 115, 119] as [number, number, number], halign: align },
    margin: { left: margin, right: margin },
  };

  const rtl = <T,>(row: T[]) => (isArabic ? [...row].reverse() : row);

  const section = (title: string, head: string[], body: string[][]) => {
    if (!body.length) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, anchor, y, { align });
    y += 3;
    autoTable(doc, {
      ...tableOpts,
      startY: y + 2,
      head: [rtl(head)],
      body: body.map((r) => rtl(r)),
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  };

  section(
    "Key metrics",
    ["Metric", "Value"],
    stats.map((s) => [s.label, String(s.value)])
  );
  section(
    "Financial overview",
    ["Item", "Amount"],
    financial.map((f) => [f.label, f.value])
  );
  section(
    "Projects",
    ["Project", "Updated", "Value"],
    projects.map((p) => [p.name, p.updated, p.value])
  );
  section(
    "Recent activity",
    ["Action", "Date"],
    activity.map((a) => [a.action, a.date])
  );

  // ---- Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(`${i} / ${pages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, {
      align: "center",
    });
  }

  doc.save(`admin-dashboard-${today()}.pdf`);
}
