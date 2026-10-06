import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Sale, ShopSettings } from '@/types';

export function exportToCSV(filename: string, rows: object[]) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row: any) => {
        return keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportToExcel(filename: string, sheetName: string, rows: object[]) {
  if (!rows || !rows.length) return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Strips Arabic/Urdu script and cleans Walk-in Customer string for safe ASCII PDF rendering
 */
export function safePdfText(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/\(عام گاہک\)/g, '')
    .replace(/عام گاہک/g, '')
    .replace(/\(Walk-in\)/gi, '')
    .replace(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g, '')
    .trim();
}

/**
 * Beautiful, structured A4 PDF Generator for Invoices
 */
export function generateInvoicePDF(sale: Sale, settings: ShopSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const rawCust = sale.customerName || 'Walk-in Customer';
  const cleanCustomerName = safePdfText(rawCust) || 'Walk-in Customer';

  // 1. Top Header Banner (slate-900)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 34, 'F');

  // Shop Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(safePdfText(settings.shopName) || 'Retail Store POS', 14, 14);

  // Address & Contacts
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const addressText = `${safePdfText(settings.address) || ''}, ${safePdfText(settings.city) || ''} | Tel: ${settings.phone || ''} ${settings.whatsapp ? `| WA: ${settings.whatsapp}` : ''}`;
  doc.text(addressText, 14, 22);

  // Right Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text('RETAIL SALE INVOICE', 196, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  if (sale.status === 'returned_full') {
    doc.setTextColor(239, 68, 68); // red
    doc.text('** FULLY RETURNED & REFUNDED **', 196, 21, { align: 'right' });
  } else if (sale.status === 'returned_partial') {
    doc.setTextColor(245, 158, 11); // amber
    doc.text('** PARTIALLY RETURNED **', 196, 21, { align: 'right' });
  } else {
    doc.text('Official Customer Memo', 196, 21, { align: 'right' });
  }

  // 2. Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 38, 182, 22, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE NO:', 18, 44);
  doc.text('DATE & TIME:', 78, 44);
  doc.text('CUSTOMER NAME:', 134, 44);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(sale.invoiceNumber, 18, 50.5);
  doc.text(new Date(sale.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), 78, 50.5);
  doc.text(cleanCustomerName.substring(0, 30), 134, 50.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Payment: ${sale.paymentMethod.toUpperCase()} | Cashier: ${safePdfText(sale.userName)}`, 18, 56);
  if (sale.customerPhone) {
    doc.text(`Phone: ${sale.customerPhone}`, 134, 56);
  }

  // 3. Items Table Header
  let startY = 65;
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(14, startY, 182, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('#', 17, startY + 4.8);
  doc.text('Item Description / Size / Variant', 24, startY + 4.8);
  doc.text('Qty', 115, startY + 4.8, { align: 'center' });
  doc.text('Unit Price', 142, startY + 4.8, { align: 'right' });
  doc.text('Disc (Rs)', 166, startY + 4.8, { align: 'right' });
  doc.text('Total (Rs)', 192, startY + 4.8, { align: 'right' });

  startY += 7;

  // 4. Table Body
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  sale.items.forEach((item, index) => {
    if (startY > 245) {
      doc.addPage();
      startY = 20;

      // Repeat table header on new page
      doc.setFillColor(30, 41, 59);
      doc.rect(14, startY, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('#', 17, startY + 4.8);
      doc.text('Item Description / Variant (Continued)', 24, startY + 4.8);
      doc.text('Qty', 115, startY + 4.8, { align: 'center' });
      doc.text('Unit Price', 142, startY + 4.8, { align: 'right' });
      doc.text('Disc (Rs)', 166, startY + 4.8, { align: 'right' });
      doc.text('Total (Rs)', 192, startY + 4.8, { align: 'right' });
      startY += 7;
      doc.setTextColor(30, 41, 59);
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, startY, 182, 7.5, 'F');
    }

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(String(index + 1), 17, startY + 5);

    let label = safePdfText(item.productName);
    if (item.variantDetails) {
      label += ` (${safePdfText(item.variantDetails)})`;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(label.substring(0, 50), 24, startY + 5);

    doc.setFont('helvetica', 'normal');
    doc.text(`${item.quantity} ${item.unit || ''}`, 115, startY + 5, { align: 'center' });
    doc.text(Number(item.unitPrice).toLocaleString(), 142, startY + 5, { align: 'right' });
    doc.text(item.discount > 0 ? Number(item.discount).toLocaleString() : '-', 166, startY + 5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(Number(item.lineTotal).toLocaleString(), 192, startY + 5, { align: 'right' });

    startY += 7.5;
  });

  // Table bottom border
  doc.setDrawColor(203, 213, 225);
  doc.line(14, startY, 196, startY);
  startY += 5;

  // 5. Summary Box (Aligned right)
  const summaryX = 118;
  const summaryW = 78;
  const summaryHeight = 44;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, startY, summaryW, summaryHeight, 1.5, 1.5, 'FD');

  let curY = startY + 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', summaryX + 4, curY);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${Number(sale.subtotal).toLocaleString()}`, summaryX + summaryW - 4, curY, { align: 'right' });

  if (sale.discount > 0) {
    curY += 5;
    doc.setTextColor(22, 101, 52);
    doc.text('Discount Applied:', summaryX + 4, curY);
    doc.text(`-Rs. ${Number(sale.discount).toLocaleString()}`, summaryX + summaryW - 4, curY, { align: 'right' });
  }

  if (sale.tax > 0) {
    curY += 5;
    doc.setTextColor(100, 116, 139);
    doc.text('Tax / GST:', summaryX + 4, curY);
    doc.setTextColor(15, 23, 42);
    doc.text(`+Rs. ${Number(sale.tax).toLocaleString()}`, summaryX + summaryW - 4, curY, { align: 'right' });
  }

  // Grand Total bar
  curY += 6;
  doc.setFillColor(15, 23, 42);
  doc.rect(summaryX, curY - 3.5, summaryW, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL:', summaryX + 4, curY + 1.8);
  doc.text(`Rs. ${Number(sale.grandTotal).toLocaleString()}`, summaryX + summaryW - 4, curY + 1.8, { align: 'right' });

  // Paid & Balance
  curY += 8;
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Paid (${sale.paymentMethod.toUpperCase()}):`, summaryX + 4, curY);
  doc.text(`Rs. ${Number(sale.paidAmount).toLocaleString()}`, summaryX + summaryW - 4, curY, { align: 'right' });

  curY += 5;
  if (sale.balanceAmount > 0) {
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('Remaining Balance Due:', summaryX + 4, curY);
    doc.text(`Rs. ${Number(sale.balanceAmount).toLocaleString()}`, summaryX + summaryW - 4, curY, { align: 'right' });
  } else if (sale.changeAmount > 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Change Returned:', summaryX + 4, curY);
    doc.text(`Rs. ${Number(sale.changeAmount).toLocaleString()}`, summaryX + summaryW - 4, curY, { align: 'right' });
  } else {
    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill Status:', summaryX + 4, curY);
    doc.text('PAID IN FULL', summaryX + summaryW - 4, curY, { align: 'right' });
  }

  // 6. Footer Notes & Signature
  let footerY = Math.max(startY + summaryHeight + 12, 262);
  if (footerY > 280) {
    doc.addPage();
    footerY = 250;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(safePdfText(settings.invoiceFooter) || 'Thank you for shopping with us! No return without original bill.', 14, footerY);
  doc.text(`Offline POS System | Generated on ${new Date().toLocaleString()}`, 14, footerY + 4);

  doc.setFont('helvetica', 'normal');
  doc.line(145, footerY + 1, 196, footerY + 1);
  doc.text('Authorized Signature', 170, footerY + 5, { align: 'center' });

  doc.save(`Invoice_${sale.invoiceNumber}.pdf`);
}

/**
 * Beautiful Monthly & Period Sales Report PDF Generator
 */
export function generateMonthlySalesReportPDF(
  periodTitle: string,
  sales: Sale[],
  settings: ShopSettings
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const totalRevenue = sales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalPaid = sales.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalBalance = sales.reduce((acc, s) => acc + s.balanceAmount, 0);
  const totalGrossProfit = sales.reduce((acc, s) => acc + s.grossProfit, 0);
  const totalItemsCount = sales.reduce((acc, s) => acc + s.items.reduce((ia, i) => ia + i.quantity, 0), 0);

  // Top header banner (slate-900)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(safePdfText(settings.shopName) || 'KitabGhar POS', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`${safePdfText(settings.address) || ''}, ${safePdfText(settings.city) || ''} | Tel: ${settings.phone || ''}`, 14, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(52, 211, 153);
  doc.text('SALES AUDIT REPORT', 196, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(periodTitle, 196, 21, { align: 'right' });

  // KPI Summary Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 36, 182, 22, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL SALES:', 20, 42);
  doc.text('INVOICES COUNT:', 60, 42);
  doc.text('ITEMS SOLD:', 102, 42);
  doc.text('CASH COLLECTED:', 138, 42);
  doc.text('GROSS PROFIT:', 170, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${totalRevenue.toLocaleString()}`, 20, 48);
  doc.text(`${sales.length} Bills`, 60, 48);
  doc.text(`${totalItemsCount} Units`, 102, 48);
  doc.text(`Rs. ${totalPaid.toLocaleString()}`, 138, 48);
  doc.setTextColor(22, 101, 52);
  doc.text(`Rs. ${totalGrossProfit.toLocaleString()}`, 170, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleString()} | Credit Balance Due: Rs. ${totalBalance.toLocaleString()}`, 20, 54);

  // Invoices Table Header
  let startY = 62;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, startY, 182, 6.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Inv #', 17, startY + 4.5);
  doc.text('Date', 40, startY + 4.5);
  doc.text('Customer', 72, startY + 4.5);
  doc.text('Items', 115, startY + 4.5, { align: 'center' });
  doc.text('Method', 135, startY + 4.5, { align: 'center' });
  doc.text('Amount (Rs)', 165, startY + 4.5, { align: 'right' });
  doc.text('Profit (Rs)', 192, startY + 4.5, { align: 'right' });

  startY += 6.5;

  sales.forEach((s, idx) => {
    if (startY > 265) {
      doc.addPage();
      startY = 20;

      doc.setFillColor(30, 41, 59);
      doc.rect(14, startY, 182, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('Inv #', 17, startY + 4.5);
      doc.text('Date', 40, startY + 4.5);
      doc.text('Customer', 72, startY + 4.5);
      doc.text('Items', 115, startY + 4.5, { align: 'center' });
      doc.text('Method', 135, startY + 4.5, { align: 'center' });
      doc.text('Amount (Rs)', 165, startY + 4.5, { align: 'right' });
      doc.text('Profit (Rs)', 192, startY + 4.5, { align: 'right' });
      startY += 6.5;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, startY, 182, 6.5, 'F');
    }

    const cleanCust = safePdfText(s.customerName) || 'Walk-in Customer';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    doc.setFont('helvetica', 'bold');
    doc.text(s.invoiceNumber, 17, startY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.text(new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' }), 40, startY + 4.5);
    doc.text(cleanCust.substring(0, 24), 72, startY + 4.5);
    doc.text(String(s.items.length), 115, startY + 4.5, { align: 'center' });
    doc.text(s.paymentMethod.toUpperCase(), 135, startY + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(Number(s.grandTotal).toLocaleString(), 165, startY + 4.5, { align: 'right' });
    doc.setTextColor(22, 101, 52);
    doc.text(Number(s.grossProfit).toLocaleString(), 192, startY + 4.5, { align: 'right' });

    startY += 6.5;
  });

  // Bottom Line & Totals
  doc.setDrawColor(203, 213, 225);
  doc.line(14, startY, 196, startY);
  startY += 4;

  doc.setFillColor(15, 23, 42);
  doc.rect(14, startY, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`TOTALS FOR ${periodTitle.toUpperCase()}:`, 18, startY + 5.5);
  doc.text(`Rs. ${totalRevenue.toLocaleString()}`, 165, startY + 5.5, { align: 'right' });
  doc.setTextColor(52, 211, 153);
  doc.text(`Rs. ${totalGrossProfit.toLocaleString()}`, 192, startY + 5.5, { align: 'right' });

  const footerY = Math.min(startY + 20, 280);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Report generated by KitabGhar POS ERP | Official Financial Summary`, 14, footerY);
  doc.line(145, footerY - 1, 196, footerY - 1);
  doc.text('Owner / Manager Signature', 170, footerY + 3.5, { align: 'center' });

  const cleanFilename = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Sales_Report_${cleanFilename}.pdf`);
}

/**
 * Beautiful Report PDF Generator
 */
export function exportReportToPDF(title: string, headers: string[], rows: (string | number)[][], filename: string) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  // Top header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 842, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(safePdfText(title) || 'Report', 36, 30);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${new Date().toLocaleString()} | Offline Business ERP`, 806, 30, { align: 'right' });

  // Table
  let startY = 70;
  const margin = 36;
  const tableWidth = 770;
  const colWidth = tableWidth / headers.length;

  // Header Row
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, startY - 14, tableWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  headers.forEach((h, i) => {
    doc.text(safePdfText(String(h)), margin + 8 + i * colWidth, startY);
  });

  startY += 18;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  rows.forEach((row, rowIndex) => {
    if (startY > 540) {
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 842, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`${safePdfText(title)} (Continued)`, 36, 22);

      startY = 60;
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, startY - 14, tableWidth, 20, 'F');
      headers.forEach((h, i) => {
        doc.text(safePdfText(String(h)), margin + 8 + i * colWidth, startY);
      });
      startY += 18;
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
    }

    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, startY - 10, tableWidth, 16, 'F');
    }

    row.forEach((cell, i) => {
      const text = cell === null || cell === undefined ? '' : safePdfText(String(cell));
      doc.text(text.substring(0, 32), margin + 8 + i * colWidth, startY);
    });

    startY += 16;
  });

  doc.save(`${filename}.pdf`);
}
