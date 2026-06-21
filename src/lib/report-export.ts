import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

export interface PdfExportOptions {
  title: string;
  fileName?: string;
  isArabic?: boolean;
  orientation?: "p" | "l";
}

/**
 * Export a DOM node to PDF. Uses html2canvas for layout fidelity so AR text
 * renders correctly (no font shaping issues with jsPDF native text).
 */
export async function exportNodeToPdf(node: HTMLElement, opts: PdfExportOptions): Promise<void> {
  const { title, fileName, isArabic, orientation = "p" } = opts;
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
  if (isArabic) pdf.setR2L(true);
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 32;
  const availW = pageW - margin * 2;
  const ratio = canvas.height / canvas.width;
  const imgW = availW;
  const imgH = imgW * ratio;

  pdf.setFontSize(14);
  pdf.text(title, margin, margin - 8);

  if (imgH <= pageH - margin * 2) {
    pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH, undefined, "FAST");
  } else {
    // multi-page slice
    let remaining = canvas.height;
    let offsetY = 0;
    const sliceHpx = Math.floor((pageH - margin * 2) * (canvas.width / imgW));
    const tmp = document.createElement("canvas");
    tmp.width = canvas.width;
    tmp.height = sliceHpx;
    const ctx = tmp.getContext("2d")!;
    while (remaining > 0) {
      ctx.clearRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);
      const part = tmp.toDataURL("image/png");
      pdf.addImage(part, "PNG", margin, margin, imgW, pageH - margin * 2, undefined, "FAST");
      offsetY += sliceHpx;
      remaining -= sliceHpx;
      if (remaining > 0) pdf.addPage();
    }
  }
  pdf.save((fileName ?? title.replace(/\s+/g, "_")) + ".pdf");
}

/** Export rows to an .xlsx file. Keys of the first row define columns. */
export function exportRowsToExcel(rows: Record<string, unknown>[], sheetName: string, fileName: string): void {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "": "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Report");
  XLSX.writeFile(wb, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}
