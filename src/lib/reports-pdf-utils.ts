import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReportProject {
  id: string;
  name: string;
  file_name?: string;
  status?: string;
  project_type?: string;
  created_at: string;
  items_count?: number;
  total_value?: number;
  currency?: string;
}

export interface ReportStats {
  totalProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  draftProjects: number;
  pendingProjects: number;
  totalBOQValue: number;
  totalTenderValue?: number;
}

export interface ReportPDFOptions {
  isArabic: boolean;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  stats: ReportStats;
  projects: ReportProject[];
  topProjects: Array<{ name: string; value: number }>;
  typeBreakdown: Array<{ name: string; count: number }>;
  companyName?: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtDate = (d: Date | string) =>
  new Date(d).toISOString().split("T")[0];

/**
 * Generates a comprehensive Reports PDF (stats + table + top 5 + type breakdown).
 * Note: jsPDF with default fonts has limited Arabic glyph support; we render
 * Latin labels alongside Arabic where useful and let the browser handle the
 * filename/title in Arabic.
 */
export function exportReportsPDF(opts: ReportPDFOptions): void {
  const { isArabic, dateFrom, dateTo, stats, projects, topProjects, typeBreakdown, companyName } = opts;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(isArabic ? "Projects Report / تقرير المشاريع" : "Projects Report", margin, y);
  y += 7;

  // Subtitle: date range + company
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  const range =
    dateFrom || dateTo
      ? `${dateFrom ? fmtDate(dateFrom) : "…"}  →  ${dateTo ? fmtDate(dateTo) : "…"}`
      : isArabic ? "All dates / كل التواريخ" : "All dates";
  doc.text(`Date range: ${range}`, margin, y);
  y += 5;
  if (companyName) {
    doc.text(`Company: ${companyName}`, margin, y);
    y += 5;
  }
  doc.text(`Generated: ${new Date().toISOString().split("T")[0]}`, margin, y);
  doc.setTextColor(0);
  y += 8;

  // Stats cards (drawn as colored rectangles)
  const cards = [
    { label: "Total", value: stats.totalProjects, color: [59, 130, 246] },
    { label: "In Progress", value: stats.inProgressProjects, color: [245, 158, 11] },
    { label: "Completed", value: stats.completedProjects, color: [16, 185, 129] },
    { label: "Draft", value: stats.draftProjects, color: [156, 163, 175] },
    { label: "Suspended", value: stats.pendingProjects, color: [239, 68, 68] },
  ];
  const cardW = (pageWidth - margin * 2 - 4 * 4) / 5;
  cards.forEach((c, i) => {
    const x = margin + i * (cardW + 4);
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.setDrawColor(c.color[0], c.color[1], c.color[2]);
    doc.roundedRect(x, y, cardW, 18, 2, 2, "FD");
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(String(c.value), x + cardW / 2, y + 9, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(c.label, x + cardW / 2, y + 15, { align: "center" });
  });
  doc.setTextColor(0);
  y += 24;

  // Total BOQ Value highlight
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageWidth - margin * 2, 12, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total BOQ Value: ${fmt(stats.totalBOQValue)} SAR`, margin + 2, y + 8);
  y += 18;

  // Type Breakdown
  if (typeBreakdown.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Project Types Distribution", margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Type", "Count"]],
      body: typeBreakdown.map((t) => [t.name, String(t.count)]),
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
      theme: "striped",
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Top 5 Projects
  if (topProjects.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Top 5 Projects by Value", margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["#", "Project", "Value (SAR)"]],
      body: topProjects.map((p, i) => [String(i + 1), p.name, fmt(p.value)]),
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 10 }, 2: { halign: "right" } },
      margin: { left: margin, right: margin },
      theme: "striped",
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Projects Table (filtered)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Projects (${projects.length})`, margin, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["#", "Name", "Type", "Status", "Items", "Value (SAR)", "Created"]],
    body: projects.map((p, i) => [
      String(i + 1),
      p.name,
      p.project_type || "-",
      p.status || "draft",
      String(p.items_count || 0),
      fmt(p.total_value || 0),
      fmtDate(p.created_at),
    ]),
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 8 },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    margin: { left: margin, right: margin },
    theme: "striped",
    didDrawPage: (data) => {
      // Footer page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      const page = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${page} / ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: "center" }
      );
      doc.setTextColor(0);
    },
  });

  const filename = `reports-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
