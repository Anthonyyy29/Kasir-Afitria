import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRupiah, formatDate } from "@/lib/utils";

interface TransactionItem {
  productName: string;
  variantInfo: string;
  quantity: number;
  priceAtSale: string | number;
  subtotal: string | number;
  unit?: string;
}

interface TransactionData {
  transactionNumber: string;
  createdAt: string;
  kasir: { name: string };
  customer: { name: string; phone?: string | null };
  items: TransactionItem[];
  subtotal: string | number;
  discountAmount: string | number;
  discountReason?: string | null;
  totalAmount: string | number;
  paymentAmount: string | number;
  changeAmount: string | number;
}

// Struk thermal 80mm — untuk Cetak Struk
export function generateReceiptPDF(trx: TransactionData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [80, 200] });

  let y = 8;
  const cx = 40;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("AFITRIA SOCK", cx, y, { align: "center" });
  y += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(trx.createdAt), cx, y, { align: "center" });
  y += 4;
  doc.text(`No: ${trx.transactionNumber}`, cx, y, { align: "center" });
  y += 4;
  doc.text(`Kasir: ${trx.kasir.name}`, cx, y, { align: "center" });
  y += 4;
  doc.text(`Pelanggan: ${trx.customer.name}`, cx, y, { align: "center" });
  y += 5;

  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, 75, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Item", "Qty", "Harga", "Total"]],
    body: trx.items.map((item) => [
      `${item.productName}${item.variantInfo ? `\n${item.variantInfo}` : ""}`,
      item.quantity,
      formatRupiah(item.priceAtSale),
      formatRupiah(item.subtotal),
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [60, 90, 180], fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 8, halign: "center" },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 18, halign: "right" },
    },
    margin: { left: 5, right: 5 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

  doc.line(5, y, 75, y);
  y += 4;

  const rows = [
    ["Subtotal", formatRupiah(trx.subtotal)],
    ...(Number(trx.discountAmount) > 0
      ? [[`Diskon${trx.discountReason ? ` (${trx.discountReason})` : ""}`, `-${formatRupiah(trx.discountAmount)}`]]
      : []),
    ["TOTAL", formatRupiah(trx.totalAmount)],
    ["Bayar", formatRupiah(trx.paymentAmount)],
    ["Kembalian", formatRupiah(trx.changeAmount)],
  ];

  doc.setFontSize(8);
  for (const [label, value] of rows) {
    const isBold = label === "TOTAL";
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(label, 7, y);
    doc.text(value, 73, y, { align: "right" });
    y += 4.5;
  }

  y += 2;
  doc.line(5, y, 75, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Terima kasih atas kunjungan Anda!", cx, y, { align: "center" });

  return doc;
}

// Nota A4 dengan harga lengkap — untuk Download Nota
export function generateNotaPDF(trx: TransactionData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 15;
  let y = 15;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("AFITRIA SOCK", margin, y);

  doc.setFontSize(20);
  doc.setTextColor(60, 90, 180);
  doc.text("NOTA PENJUALAN", W - margin, y, { align: "right" });
  doc.setTextColor(0, 0, 0);

  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, W - margin, y);
  y += 7;

  // Info transaksi — kiri
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("No. Nota", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${trx.transactionNumber}`, margin + 28, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Tanggal", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${formatDate(trx.createdAt)}`, margin + 28, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Kasir", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${trx.kasir.name}`, margin + 28, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Pelanggan", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${trx.customer.name}${trx.customer.phone ? ` (${trx.customer.phone})` : ""}`, margin + 28, y);
  y += 10;

  // Tabel item
  autoTable(doc, {
    startY: y,
    head: [["No", "Nama Barang", "Keterangan", "Qty", "Harga Satuan", "Subtotal"]],
    body: trx.items.map((item, i) => [
      i + 1,
      item.productName,
      item.variantInfo || "-",
      item.quantity,
      formatRupiah(item.priceAtSale),
      formatRupiah(item.subtotal),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [60, 90, 180], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 55 },
      2: { cellWidth: 40 },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [245, 247, 255] },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // Ringkasan harga — rata kanan
  const colLabel = W - margin - 70;
  const colValue = W - margin;

  doc.setDrawColor(200, 200, 200);
  doc.line(colLabel - 5, y, W - margin, y);
  y += 5;

  const summaryRows: [string, string, boolean][] = [
    ["Subtotal", formatRupiah(trx.subtotal), false],
    ...(Number(trx.discountAmount) > 0
      ? [[`Diskon${trx.discountReason ? ` (${trx.discountReason})` : ""}`, `-${formatRupiah(trx.discountAmount)}`, false] as [string, string, boolean]]
      : []),
    ["TOTAL", formatRupiah(trx.totalAmount), true],
    ["Uang Diterima", formatRupiah(trx.paymentAmount), false],
    ["Kembalian", formatRupiah(trx.changeAmount), false],
  ];

  doc.setFontSize(9);
  for (const [label, value, bold] of summaryRows) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    if (bold) {
      doc.setFontSize(11);
      doc.setTextColor(60, 90, 180);
    }
    doc.text(label, colLabel, y);
    doc.text(value, colValue, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    y += bold ? 7 : 5;
  }

  // Footer
  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Terima kasih atas kepercayaan Anda!", W / 2, y, { align: "center" });

  return doc;
}

// Surat Jalan A4 tanpa harga — untuk Cetak Surat Jalan
export function generateSuratJalanPDF(trx: TransactionData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 15;
  let y = 15;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("AFITRIA SOCK", margin, y);

  doc.setFontSize(20);
  doc.setTextColor(40, 120, 60);
  doc.text("SURAT JALAN", W - margin, y, { align: "right" });
  doc.setTextColor(0, 0, 0);

  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, W - margin, y);
  y += 7;

  // Info surat jalan
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("No. Surat Jalan", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: SJ-${trx.transactionNumber}`, margin + 38, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Tanggal", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${formatDate(trx.createdAt)}`, margin + 38, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Kepada Yth.", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${trx.customer.name}${trx.customer.phone ? ` / ${trx.customer.phone}` : ""}`, margin + 38, y);
  y += 10;

  // Tabel rincian barang — TANPA HARGA
  autoTable(doc, {
    startY: y,
    head: [["No", "Nama Barang", "Keterangan / Varian", "Qty", "Satuan"]],
    body: trx.items.map((item, i) => [
      i + 1,
      item.productName,
      item.variantInfo || "-",
      item.quantity,
      item.unit || "pcs",
    ]),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [40, 120, 60], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 65 },
      2: { cellWidth: 55 },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 28, halign: "center" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: { fillColor: [240, 250, 242] },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Catatan
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text("* Dokumen ini hanya sebagai tanda pengiriman barang, bukan sebagai bukti pembayaran.", margin, y);
  doc.setTextColor(0, 0, 0);

  y += 12;

  // Kolom tanda tangan
  const col1 = margin + 20;
  const col2 = W / 2 + 20;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Hormat kami,", col1, y, { align: "center" });
  doc.text("Penerima,", col2, y, { align: "center" });

  y += 25;
  doc.line(col1 - 25, y, col1 + 25, y);
  doc.line(col2 - 25, y, col2 + 25, y);
  y += 5;
  doc.text("( Pengirim )", col1, y, { align: "center" });
  doc.text("( ........................ )", col2, y, { align: "center" });

  return doc;
}
