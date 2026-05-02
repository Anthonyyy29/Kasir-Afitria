import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRupiah, formatDate } from "@/lib/utils";

interface TransactionItem { productName: string; variantInfo: string; quantity: number; priceAtSale: string | number; subtotal: string | number; }
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

export function generateReceiptPDF(trx: TransactionData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [80, 200] });

  let y = 8;
  const cx = 40;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("KASIR MAMAK", cx, y, { align: "center" });
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
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 8, halign: "center" }, 2: { cellWidth: 20, halign: "right" }, 3: { cellWidth: 18, halign: "right" } },
    margin: { left: 5, right: 5 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

  doc.line(5, y, 75, y);
  y += 4;

  const rows = [
    ["Subtotal", formatRupiah(trx.subtotal)],
    ...(Number(trx.discountAmount) > 0 ? [[`Diskon${trx.discountReason ? ` (${trx.discountReason})` : ""}`, `-${formatRupiah(trx.discountAmount)}`]] : []),
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
