import { formatCurrency, formatUplift } from "./format.js";

export const EXPORT_HEADERS = [
  "Customer ID",
  "ZIP",
  "Channel",
  "Newbie (Yes/No)",
  "Recommendation",
  "Mens uplift (pp)",
  "Womens uplift (pp)",
  "Best-arm uplift (pp)",
  "Est. revenue (assigned arm) ($)",
  "Cost ($)",
];

const ROUND_TO = (value, digits) => Number((value ?? 0).toFixed(digits));

export function mapAllocationRows(rows) {
  return rows.map((row) => [
    String(row.customer_id ?? ""),
    String(row.zip_code ?? ""),
    String(row.channel ?? ""),
    row.newbie ? "Yes" : "No",
    String(row.assigned_arm ?? ""),
    ROUND_TO((row.ite_mens ?? 0) * 100, 4),
    ROUND_TO((row.ite_womens ?? 0) * 100, 4),
    ROUND_TO(Math.max(row.ite_mens ?? 0, row.ite_womens ?? 0) * 100, 4),
    ROUND_TO(row.expected_revenue, 2),
    ROUND_TO(row.cost, 2),
  ]);
}

function protectSpreadsheetText(value) {
  const text = String(value ?? "");
  if (text.trim() && Number.isFinite(Number(text))) return text;
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function csvCell(value, columnIndex) {
  let text;
  if (typeof value === "number") {
    text = columnIndex >= 5 && columnIndex <= 7
      ? value.toFixed(4)
      : columnIndex >= 8
        ? value.toFixed(2)
        : String(value);
  } else {
    text = protectSpreadsheetText(value);
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(rows) {
  const records = [
    EXPORT_HEADERS,
    ...mapAllocationRows(rows),
  ];
  return `\uFEFF${records
    .map((record) => record.map((value, index) => csvCell(value, index)).join(","))
    .join("\r\n")}\r\n`;
}

export function limitPdfRows(rows) {
  return {
    rows: rows.slice(0, 1000),
    totalRows: rows.length,
    truncated: rows.length > 1000,
  };
}

export function isExportDisabled(rows) {
  return rows.length === 0;
}

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDriftStatusLine(drift) {
  if (drift?.status === "done" && drift.data) {
    const data = drift.data;
    return `Data drift check: ${data.status}${data.messages?.[0] ? ` — ${data.messages[0]}` : ""}`;
  }
  if (drift?.status === "unavailable") {
    return `Data drift check unavailable: ${drift.error}`;
  }
  if (drift?.status === "checking") return "Data drift check: checking.";
  return "";
}

export function buildExcelSheets({ rows, summary, planSummary, costMens, costWomens, valuePerConversion, drift }) {
  const assumptions = [
    ["Budget", { value: summary.budget, type: Number, format: "$0.00" }],
    ["Mens e-mail cost", { value: costMens, type: Number, format: "$0.00" }],
    ["Womens e-mail cost", { value: costWomens, type: Number, format: "$0.00" }],
    ["Revenue per conversion", { value: valuePerConversion, type: Number, format: "$0.00" }],
  ];
  const driftLine = getDriftStatusLine(drift);
  if (driftLine) assumptions.push(["Drift status", driftLine]);

  const allocationRows = mapAllocationRows(rows);
  const header = EXPORT_HEADERS.map((value) => ({ value, fontWeight: "bold" }));
  const data = allocationRows.map((row) => row.map((value, index) => {
    if (index >= 5 && index <= 7) return { value, type: Number, format: "0.00" };
    if (index >= 8) return { value, type: Number, format: "$0.00" };
    return value;
  }));
  const widths = [20, 14, 18, 12, 20, 18, 20, 22, 34, 14].map((width) => ({ width }));

  return [
    {
      sheet: "Summary",
      data: [
        [{ value: "EconoCausal campaign plan", fontWeight: "bold" }],
        ...planSummary.map((sentence) => [sentence]),
        [],
        [{ value: "Assumptions", fontWeight: "bold" }],
        ...assumptions,
      ],
      columns: [{ width: 30 }, { width: 100 }],
    },
    {
      sheet: "Allocations",
      data: [header, ...data],
      columns: widths,
      stickyRowsCount: 1,
    },
  ];
}

export function buildPdfTableRows(rows) {
  return mapAllocationRows(rows).map((row) => [
    row[0],
    row[1],
    row[2],
    row[3],
    row[4],
    formatUplift(row[5] / 100),
    formatUplift(row[6] / 100),
    formatUplift(row[7] / 100),
    formatCurrency(row[8]),
    formatCurrency(row[9]),
  ]);
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(rows, fileName) {
  triggerDownload(new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8" }), fileName);
}

export async function downloadExcel(options, fileName) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const sheets = buildExcelSheets(options);
  await writeExcelFile(sheets).toFile(fileName);
}

export async function downloadPdf({ rows, summary, planSummary, costMens, costWomens, valuePerConversion, drift }, fileName) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new JsPDF({ orientation: "landscape", format: "a4" });
  const date = getLocalDateString();
  let y = 16;
  doc.setFontSize(18);
  doc.text("EconoCausal campaign plan", 10, y);
  y += 8;
  doc.setFontSize(9);
  doc.text(`Generated ${date}`, 10, y);
  y += 8;

  doc.setFontSize(8);
  for (const sentence of planSummary) {
    const lines = doc.splitTextToSize(sentence, 275);
    doc.text(lines, 10, y);
    y += lines.length * 4 + 2;
  }
  y += 2;
  doc.setFontSize(9);
  doc.text("Assumptions", 10, y);
  y += 5;
  doc.setFontSize(8);
  const assumptionLines = [
    `Budget: ${formatCurrency(summary.budget)}`,
    `Mens e-mail cost: ${formatCurrency(costMens)}`,
    `Womens e-mail cost: ${formatCurrency(costWomens)}`,
    `Revenue per conversion: ${formatCurrency(valuePerConversion)}`,
    getDriftStatusLine(drift),
  ].filter(Boolean);
  for (const line of assumptionLines) {
    const lines = doc.splitTextToSize(line, 275);
    doc.text(lines, 10, y);
    y += lines.length * 4 + 1;
  }

  const pdfRows = limitPdfRows(rows);
  autoTable(doc, {
    startY: y + 2,
    head: [EXPORT_HEADERS],
    body: buildPdfTableRows(pdfRows.rows),
    margin: { left: 10, right: 10, bottom: 13 },
    styles: { fontSize: 6, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [22, 121, 104], fontSize: 6 },
    theme: "grid",
  });

  if (pdfRows.truncated) {
    let noteY = doc.lastAutoTable.finalY + 5;
    if (noteY > doc.internal.pageSize.getHeight() - 13) {
      doc.addPage();
      noteY = 15;
    }
    doc.setFontSize(8);
    doc.text(`PDF shows the first 1,000 of ${pdfRows.totalRows} rows. Use CSV or Excel for the full list.`, 10, noteY);
  }

  const pageCount = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setFontSize(8);
    doc.text(
      `Page ${pageNumber} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 10,
      doc.internal.pageSize.getHeight() - 6,
      { align: "right" },
    );
  }
  doc.save(fileName);
}
