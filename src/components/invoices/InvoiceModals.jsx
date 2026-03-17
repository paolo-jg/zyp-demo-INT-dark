/**
 * InvoiceModals - Portal-Style UI
 * 
 * Modal components for invoices with consistent dark theme.
 */

import React, { useState } from 'react';
import { X, Upload, FileText, Check, Download } from 'lucide-react';

// Safe number formatting helper
const safeToFixed = (value, decimals = 2) => {
  const num = parseFloat(value);
  return isNaN(num) ? '0.00' : num.toFixed(decimals);
};

// Create Invoice Options Modal
export function CreateInvoiceModal({ isOpen, onClose, onCreate, onUpload }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Invoice</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <button
            onClick={onCreate}
            className="w-full flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 rounded-lg transition-colors"
          >
            <div className="w-11 h-11 bg-emerald-200 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Create New Invoice</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Build an invoice from scratch</p>
            </div>
          </button>
          <button
            onClick={onUpload}
            className="w-full flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 rounded-lg transition-colors"
          >
            <div className="w-11 h-11 bg-blue-200 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-700" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Upload PDF Invoice</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Upload an existing invoice file</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Upload Invoice Modal
export function UploadInvoiceModal({ 
  isOpen, 
  onClose, 
  recipients, 
  onSubmit 
}) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfData, setPdfData] = useState(null);

  if (!isOpen) return null;

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setPdfData(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const invoiceNumber = document.getElementById('upload-invoice-number')?.value;
    const dueDate = document.getElementById('upload-invoice-due-date')?.value;
    const amount = document.getElementById('upload-invoice-amount')?.value;

    if (!selectedClient || !pdfFile || !invoiceNumber || !dueDate || !amount) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      selectedClient,
      pdfFile,
      pdfData,
      invoiceNumber,
      dueDate,
      amount
    });

    // Reset form
    setSelectedClient(null);
    setPdfFile(null);
    setPdfData(null);
  };

  // Filter to US clients only
  const usClients = recipients.filter(r => 
    r.country === 'USA' || r.country === 'US' || r.country === 'United States'
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload Invoice</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Client Selection */}
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Client *</label>
            <div className="relative">
              <button
                onClick={() => setShowClientDropdown(!showClientDropdown)}
                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-left text-sm hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
              >
                {selectedClient ? selectedClient.name : 'Select a client...'}
              </button>
              {showClientDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto z-10">
                  {usClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client);
                        setShowClientDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {client.name}
                    </button>
                  ))}
                  {usClients.length === 0 && (
                    <div className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-sm">No US clients found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Number */}
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Invoice Number *</label>
            <input
              id="upload-invoice-number"
              type="text"
              placeholder="INV-001"
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-gray-200 dark:focus:border-gray-600"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Due Date *</label>
            <input
              id="upload-invoice-due-date"
              type="date"
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-gray-200 dark:focus:border-gray-600"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Amount (USD) *</label>
            <input
              id="upload-invoice-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:border-gray-200 dark:focus:border-gray-600"
            />
          </div>

          {/* PDF Upload */}
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Invoice PDF *</label>
            <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800">
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                {pdfFile ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-700">
                    <Check className="w-5 h-5" />
                    <span className="text-sm">{pdfFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500 dark:text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Click to upload PDF</p>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 text-black font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
          >
            Upload Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// Status Update Modal
export function StatusUpdateModal({ isOpen, onClose, invoice, onUpdateStatus, statusLogs }) {
  if (!isOpen || !invoice) return null;

  const statuses = invoice.type === 'Receivable' 
    ? ['Sent', 'Viewed', 'Partially Received', 'Fully Received', 'Cancelled']
    : ['Received', 'Partially Paid', 'Fully Paid', 'Disputed'];

  const logs = (statusLogs || {})[invoice?.invoiceNumber] || [];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Update Status</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{invoice.invoiceNumber}</p>
        </div>
        <div className="p-5">
          <div className="space-y-2 mb-6">
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => onUpdateStatus(status)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 rounded-lg text-left text-sm transition-colors"
              >
                {status}
              </button>
            ))}
          </div>

          {logs.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Status History</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-900 dark:text-white">{log.status}</span>
                    <span className="text-gray-500 dark:text-gray-400">{log.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// PDF Viewer Modal
export function PdfViewerModal({ isOpen, onClose, invoice, onPayInvoice, onDownload }) {
  if (!isOpen || !invoice) return null;

  const handleDownload = () => {
    if (invoice.pdfData) {
      const link = document.createElement('a');
      link.href = invoice.pdfData;
      link.download = `${invoice.invoiceNumber}.pdf`;
      link.click();
    } else if (invoice.invoiceData) {
      // Generate a printable invoice in a new window
      const items = invoice.invoiceData.lineItems || [];
      const rows = items.map(item => `
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:12px 0">${item.description || item.name || ''}</td>
          <td style="text-align:center;padding:12px 0">${item.quantity || item.qty || 0}</td>
          <td style="text-align:right;padding:12px 0">$${(item.rate || item.price || 0).toFixed(2)}</td>
          <td style="text-align:right;padding:12px 0">$${(item.amount || 0).toFixed(2)}</td>
        </tr>
      `).join('');
      const html = `<!DOCTYPE html><html><head><title>${invoice.invoiceNumber}</title>
        <style>body{font-family:Inter,system-ui,sans-serif;margin:40px;color:#111}
        table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 0;border-bottom:2px solid #111;font-size:13px;color:#6b7280}</style></head>
        <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">
          <div><img src="${window.location.origin}/zyp-logo.svg" alt="Zyp" style="height:40px;width:auto" />
          ${invoice.invoiceData.title ? `<div style="font-size:14px;color:#6b7280;margin-top:4px">${invoice.invoiceData.title}</div>` : ''}</div>
          <div style="text-align:right"><div style="font-size:22px;font-weight:700">${invoice.invoiceNumber}</div>
          <div style="color:#6b7280;font-size:14px">Date: ${invoice.date}</div>
          <div style="color:#6b7280;font-size:14px">Due: ${invoice.dueDate}</div></div>
        </div>
        <div style="display:flex;gap:80px;margin-bottom:32px">
          <div><div style="font-size:12px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">From</div>
          <div style="font-weight:500">${invoice.invoiceData.sender || ''}</div></div>
          <div><div style="font-size:12px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Bill To</div>
          <div style="font-weight:500">${invoice.businessName}</div></div>
        </div>
        <table><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div style="display:flex;justify-content:flex-end;margin-top:24px">
          <div style="width:240px">
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px"><span style="color:#6b7280">Subtotal</span><span>$${(invoice.invoiceData.subtotal || 0).toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #111;font-weight:700;font-size:18px;margin-top:8px"><span>Total</span><span>${invoice.amount}</span></div>
          </div>
        </div>
        ${invoice.invoiceData.notes ? `<div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb"><div style="font-size:12px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Notes</div><div style="font-size:14px;color:#374151">${invoice.invoiceData.notes}</div></div>` : ''}
        </body></html>`;
      const w = window.open('', '_blank');
      w.document.write(html);
      w.document.close();
      w.print();
    } else if (onDownload) {
      onDownload(invoice);
    }
  };

  const isPayable = invoice.type === 'Payable';
  const isPaid = invoice.status?.includes('Paid') || invoice.status?.includes('Fully');

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold">{invoice.invoiceNumber}</h2>
          <div className="flex items-center gap-2">
            {/* Download Button */}
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            {/* Pay Button (for Payable invoices) */}
            {isPayable && !isPaid && onPayInvoice && (
              <button 
                onClick={() => { onPayInvoice(invoice); onClose(); }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-900 text-black font-medium rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Pay Invoice
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-800">
          {invoice.pdfData ? (
            <iframe
              src={invoice.pdfData}
              className="w-full h-full min-h-[600px] rounded-lg"
              title={invoice.invoiceNumber}
            />
          ) : invoice.invoiceData ? (
            <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-8 rounded-xl max-w-2xl mx-auto">
              <div className="flex justify-between items-start mb-8">
                <img src="/zyp-logo.svg" alt="Zyp" className="h-10 w-auto" />
                <div className="text-right">
                  <div className="text-2xl font-bold">{invoice.invoiceNumber}</div>
                  <div className="text-gray-500 dark:text-gray-400">Date: {invoice.date}</div>
                  <div className="text-gray-500 dark:text-gray-400">Due: {invoice.dueDate}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 uppercase mb-1">From</div>
                  <div className="font-medium">{invoice.invoiceData.sender || 'Your Company'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 uppercase mb-1">Bill To</div>
                  <div className="font-medium">{invoice.businessName}</div>
                </div>
              </div>

              {invoice.invoiceData.lineItems && (
                <table className="w-full mb-8">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 text-sm text-gray-500 dark:text-gray-400">Description</th>
                      <th className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">Qty</th>
                      <th className="text-right py-2 text-sm text-gray-500 dark:text-gray-400">Rate</th>
                      <th className="text-right py-2 text-sm text-gray-500 dark:text-gray-400">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.invoiceData.lineItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3">{item.description || item.name}</td>
                        <td className="text-center py-3">{item.quantity || item.qty}</td>
                        <td className="text-right py-3">${safeToFixed(item.rate || item.price)}</td>
                        <td className="text-right py-3">${safeToFixed(item.amount || (item.qty || 0) * (item.price || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span>${safeToFixed(invoice.invoiceData.subtotal)}</span>
                  </div>
                  {parseFloat(invoice.invoiceData.tax) > 0 && (
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Tax</span>
                      <span>${safeToFixed(invoice.invoiceData.tax)}</span>
                    </div>
                  )}
                  {parseFloat(invoice.invoiceData.discount) > 0 && (
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Discount</span>
                      <span>-${safeToFixed(invoice.invoiceData.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t-2 border-gray-900 font-bold text-lg mt-1">
                    <span>Total</span>
                    <span>{invoice.amount}</span>
                  </div>
                </div>
              </div>

              {invoice.invoiceData.notes && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-500 dark:text-gray-400 uppercase mb-1">Notes</div>
                  <div className="text-sm text-gray-700 dark:text-gray-200">{invoice.invoiceData.notes}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No preview available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default { CreateInvoiceModal, UploadInvoiceModal, StatusUpdateModal, PdfViewerModal };
