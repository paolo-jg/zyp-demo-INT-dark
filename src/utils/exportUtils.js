// Export utilities for CSV and PDF generation
// Supports recipients, invoices, and transfer history

// CSV Export
export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }
  
  // Build CSV header
  const headers = columns.map(col => col.label);
  const headerRow = headers.map(escapeCSVField).join(',');
  
  // Build data rows
  const dataRows = data.map(item => {
    return columns.map(col => {
      const value = col.accessor(item);
      return escapeCSVField(value);
    }).join(',');
  });
  
  // Combine header and data
  const csvContent = [headerRow, ...dataRows].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// Escape CSV field to handle commas, quotes, and newlines
function escapeCSVField(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Download blob as file
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Format date for export
function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Format currency for export
function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Recipients columns configuration
export const RECIPIENT_COLUMNS = [
  { label: 'Name', accessor: (r) => r.name || r.company || '' },
  { label: 'Company', accessor: (r) => r.company || '' },
  { label: 'Email', accessor: (r) => r.email || '' },
  { label: 'Phone', accessor: (r) => r.phone || '' },
  { label: 'Bank Name', accessor: (r) => r.bankName || r.bank || '' },
  { label: 'Account Name', accessor: (r) => r.accountName || '' },
  { label: 'Account Number', accessor: (r) => r.accountNumber ? `****${r.accountNumber.slice(-4)}` : '' },
  { label: 'Routing Number', accessor: (r) => r.routingNumber || '' },
  { label: 'SWIFT Code', accessor: (r) => r.swiftCode || '' },
  { label: 'Country', accessor: (r) => r.country || '' },
  { label: 'Address', accessor: (r) => r.address || '' },
  { label: 'Verification Status', accessor: (r) => r.verificationStatus || '' },
  { label: 'Notes', accessor: (r) => r.notes || '' },
];

// Invoice columns configuration
export const INVOICE_COLUMNS = [
  { label: 'Invoice Number', accessor: (i) => i.invoiceNumber || i.invoice_number || '' },
  { label: 'Client', accessor: (i) => i.client_name || i.clientName || '' },
  { label: 'Client Email', accessor: (i) => i.client_email || i.clientEmail || '' },
  { label: 'Amount', accessor: (i) => formatCurrency(i.amount, i.currency || 'USD') },
  { label: 'Currency', accessor: (i) => i.currency || 'USD' },
  { label: 'Status', accessor: (i) => i.status || '' },
  { label: 'Issue Date', accessor: (i) => formatDate(i.issue_date || i.issueDate || i.created_at) },
  { label: 'Due Date', accessor: (i) => formatDate(i.due_date || i.dueDate) },
  { label: 'Paid Date', accessor: (i) => formatDate(i.paid_date || i.paidDate) },
  { label: 'Description', accessor: (i) => i.description || '' },
  { label: 'Notes', accessor: (i) => i.notes || '' },
];

// Transaction/Transfer columns configuration
export const TRANSACTION_COLUMNS = [
  { label: 'Date', accessor: (t) => formatDate(t.created_at || t.date) },
  { label: 'Recipient', accessor: (t) => t.recipient_name || t.recipientName || '' },
  { label: 'Recipient Company', accessor: (t) => t.recipient_company || t.recipientCompany || '' },
  { label: 'Amount Sent', accessor: (t) => formatCurrency(t.amount_usd || t.amountUsd || t.amount, 'USD') },
  { label: 'Amount Received', accessor: (t) => formatCurrency(t.amount_php || t.amountPhp, 'PHP') },
  { label: 'Exchange Rate', accessor: (t) => t.exchange_rate || t.exchangeRate || '' },
  { label: 'Fee', accessor: (t) => formatCurrency(t.fee, 'USD') },
  { label: 'Status', accessor: (t) => t.status || '' },
  { label: 'Bank', accessor: (t) => t.recipient_bank || t.recipientBank || '' },
  { label: 'Reference', accessor: (t) => t.reference || t.id || '' },
  { label: 'Notes', accessor: (t) => t.notes || '' },
];

// Export recipients to CSV
export function exportRecipients(recipients) {
  const filename = `zyp-recipients-${new Date().toISOString().split('T')[0]}`;
  exportToCSV(recipients, filename, RECIPIENT_COLUMNS);
}

// Export invoices to CSV
export function exportInvoices(invoices) {
  const filename = `zyp-invoices-${new Date().toISOString().split('T')[0]}`;
  exportToCSV(invoices, filename, INVOICE_COLUMNS);
}

// Export transactions to CSV
export function exportTransactions(transactions) {
  const filename = `zyp-transfers-${new Date().toISOString().split('T')[0]}`;
  exportToCSV(transactions, filename, TRANSACTION_COLUMNS);
}

// PDF Export using browser print
export function exportToPDF(data, title, columns, options = {}) {
  const { orientation = 'landscape', paperSize = 'A4' } = options;
  
  // Generate HTML table
  const tableHtml = generatePDFTable(data, title, columns);
  
  // Open new window and print
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page {
          size: ${paperSize} ${orientation};
          margin: 1cm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 10px;
          line-height: 1.4;
          color: #333;
          padding: 20px;
        }
        h1 {
          font-size: 18px;
          margin-bottom: 5px;
          color: #10b981;
        }
        .subtitle {
          font-size: 11px;
          color: #666;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th {
          background-color: #10b981;
          color: white;
          padding: 8px 6px;
          text-align: left;
          font-weight: 600;
          font-size: 9px;
        }
        td {
          padding: 6px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 9px;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .footer {
          margin-top: 20px;
          font-size: 9px;
          color: #666;
          text-align: center;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      ${tableHtml}
      <div class="footer">
        Generated by Zyp • ${new Date().toLocaleString()}
      </div>
      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() { window.close(); }
        }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Generate HTML table for PDF
function generatePDFTable(data, title, columns) {
  const headers = columns.map(col => `<th>${col.label}</th>`).join('');
  
  const rows = data.map(item => {
    const cells = columns.map(col => {
      const value = col.accessor(item) || '';
      return `<td>${escapeHtml(String(value))}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  
  return `
    <h1>${title}</h1>
    <div class="subtitle">Total Records: ${data.length}</div>
    <table>
      <thead>
        <tr>${headers}</tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// Escape HTML for safe rendering
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export recipients to PDF
export function exportRecipientsPDF(recipients) {
  exportToPDF(recipients, 'Recipients Export', RECIPIENT_COLUMNS);
}

// Export invoices to PDF
export function exportInvoicesPDF(invoices) {
  exportToPDF(invoices, 'Invoices Export', INVOICE_COLUMNS);
}

// Export transactions to PDF
export function exportTransactionsPDF(transactions) {
  exportToPDF(transactions, 'Transfer History Export', TRANSACTION_COLUMNS);
}

// Generic export dialog data
export const EXPORT_OPTIONS = {
  recipients: {
    title: 'Export Recipients',
    csvFn: exportRecipients,
    pdfFn: exportRecipientsPDF,
  },
  invoices: {
    title: 'Export Invoices',
    csvFn: exportInvoices,
    pdfFn: exportInvoicesPDF,
  },
  transactions: {
    title: 'Export Transfer History',
    csvFn: exportTransactions,
    pdfFn: exportTransactionsPDF,
  },
};
