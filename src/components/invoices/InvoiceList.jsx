/**
 * InvoiceList - Table/cards for invoice listing
 */

import React from 'react';
import { ChevronLeft, ChevronRight, Download, CreditCard, Eye } from 'lucide-react';

export function InvoiceList({
  invoices,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  onViewInvoice,
  onUpdateStatus,
  onPayInvoice,
  onDownload,
  getStatusText,
  getStatusColor,
  getTypeColor,
  isOverdue
}) {
  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const currentInvoices = invoices.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  if (invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="w-8 h-8 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 className="text-lg font-medium mb-2">No invoices found</h3>
        <p className="text-gray-500 dark:text-gray-400">Create your first invoice or adjust your filters</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Invoice</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Business</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentInvoices.map((invoice) => {
              const invoiceIsOverdue = isOverdue(invoice);
              const status = getStatusText(invoice);
              return (
                <tr key={invoice.invoiceNumber} className="border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-50/30">
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium${getTypeColor(invoice.type)}`}>
                      {invoice.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => onViewInvoice(invoice)}
                      className="text-left hover:text-emerald-700 transition-colors"
                    >
                      <div className="font-medium">{invoice.invoiceNumber}</div>
                      {invoice.zyp_id && (
                        <div className="text-xs text-emerald-700 font-mono">{invoice.zyp_id}</div>
                      )}
                      <div className="text-sm text-gray-500 dark:text-gray-400">{invoice.date}</div>
                    </button>
                  </td>
                  <td className="px-6 py-4">{invoice.businessName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateStatus(invoice)}
                        className={`text-xs px-2 py-0.5 rounded-lg font-medium${getStatusColor(invoice)}hover:opacity-80 cursor-pointer`}
                      >
                        {invoiceIsOverdue ? 'Overdue' : status}
                      </button>
                      {invoiceIsOverdue && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">({status})</span>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4${invoiceIsOverdue ? 'text-red-700 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                    {invoice.dueDate || '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">{invoice.amount}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {invoice.type === 'Payable' && !status.includes('Fully Paid') && (
                        <button
                          onClick={() => onPayInvoice(invoice)}
                          className="text-blue-700 hover:text-blue-600"
                          title="Pay Invoice"
                        >
                          <CreditCard className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDownload(invoice)}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-400"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, invoices.length)} of {invoices.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {currentInvoices.map((invoice) => {
          const status = getStatusText(invoice);
          const invoiceIsOverdue = isOverdue(invoice);
          return (
            <div 
              key={invoice.invoiceNumber} 
              className={`bg-white dark:bg-gray-900 rounded-lg p-4 border${invoiceIsOverdue ? 'border-red-500/50' : 'border-gray-200 dark:border-gray-700'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <button 
                    onClick={() => onViewInvoice(invoice)}
                    className="text-emerald-700 font-medium text-sm hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </button>
                  {invoice.zyp_id && (
                    <p className="text-emerald-700 text-xs font-mono">{invoice.zyp_id}</p>
                  )}
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{invoice.businessName}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg font-medium${getTypeColor(invoice.type)}`}>
                  {invoice.type}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={() => onUpdateStatus(invoice)}
                    className={`text-xs px-2 py-0.5 rounded-lg font-medium${getStatusColor(invoice)}`}
                  >
                    {invoiceIsOverdue ? 'Overdue' : status}
                  </button>
                  <p className={`text-xs mt-1${invoiceIsOverdue ? 'text-red-700' : 'text-gray-500 dark:text-gray-400'}`}>
                    Due: {invoice.dueDate || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{invoice.amount}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {invoice.type === 'Payable' && !status.includes('Fully Paid') && (
                      <button
                        onClick={() => onPayInvoice(invoice)}
                        className="text-blue-700"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDownload(invoice)}
                      className="text-gray-500 dark:text-gray-400"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default InvoiceList;
