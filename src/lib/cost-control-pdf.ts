import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface CCPdfOptions {
  isArabic: boolean;
  projectName?: string;
  totals: {
    pv: number; ev: number; ac: number; cv: number; sv: number;
    cpi: number; spi: number; eacByPert: number; etc: number; tcpi: number; progress: number;
  };
  activities: Array<{
    sn: number; activityCode: string; activity: string; activityAr: string;
    discipline: string; progress: number; pv: number; ev: number; ac: number;
    cv: number; sv: number; cpi: number; spi: number; eacByPert: number; etc: number;
  }>;
  alerts?: string[];
}

const fmt = (n: number) => {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return Math.round(n).toLocaleString("en-US");
};

export function exportCostControlPDF(opts: CCPdfOptions): void {
  const { isArabic, projectName, totals, activities, alerts = [] } = opts;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Cost Control Report (EVM)", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  if (projectName) { doc.text(`Project: ${projectName}`, margin, y); y += 5; }
  doc.text(`Generated: ${new Date().toISOString().split("T")[0]}`, margin, y);
  doc.setTextColor(0);
  y += 6;

  // KPI Cards
  const kpis = [
    ["PV", fmt(totals.pv)], ["EV", fmt(totals.ev)], ["AC", fmt(totals.ac)],
    ["CV", fmt(totals.cv)], ["SV", fmt(totals.sv)],
    ["CPI", totals.cpi.toFixed(2)], ["SPI", totals.spi.toFixed(2)],
    ["EAC", fmt(totals.eacByPert)], ["ETC", fmt(totals.etc)],
    ["TCPI", totals.tcpi.toFixed(2)], ["Progress", totals.progress.toFixed(0) + "%"],
  ];
  const cardW = (pageWidth - margin * 2) / kpis.length;
  kpis.forEach((k, i) => {
    const x = margin + i * cardW;
    doc.setDrawColor(220); doc.setFillColor(245, 247, 250);
    doc.roundedRect(x + 1, y, cardW - 2, 16, 2, 2, "FD");
    doc.setFontSize(8); doc.setTextColor(110);
    doc.text(k[0], x + 3, y + 5);
    doc.setFontSize(11); doc.setTextColor(20); doc.setFont("helvetica", "bold");
    doc.text(k[1], x + 3, y + 12);
    doc.setFont("helvetica", "normal");
  });
  y += 22;

  // Alerts
  if (alerts.length > 0) {
    doc.setFontSize(11); doc.setTextColor(180, 40, 40); doc.setFont("helvetica", "bold");
    doc.text("Alerts", margin, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60);
    alerts.forEach(a => { doc.text(`• ${a}`, margin + 2, y); y += 4; });
    doc.setTextColor(0); y += 3;
  }

  // Activities table
  autoTable(doc, {
    startY: y,
    head: [["#", "Code", "Activity", "Disc.", "Prog%", "PV", "EV", "AC", "CV", "SV", "CPI", "SPI", "EAC", "ETC"]],
    body: activities.map(a => [
      a.sn, a.activityCode, a.activity, a.discipline, a.progress + "%",
      fmt(a.pv), fmt(a.ev), fmt(a.ac), fmt(a.cv), fmt(a.sv),
      a.cpi.toFixed(2), a.spi.toFixed(2), fmt(a.eacByPert), fmt(a.etc),
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  doc.save(`Cost_Control_Report_${new Date().toISOString().split("T")[0]}.pdf`);
}
