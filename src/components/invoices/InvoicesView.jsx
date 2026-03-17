/**
 * InvoicesView - Portal-Style UI
 * 
 * Matches the PhilippinesPortal visual design while preserving all functionality.
 */

import React, { useState } from 'react';
import { Search, Plus, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportInvoices } from '../../utils/exportUtils';
import InvoiceCreationFlow from './InvoiceCreationFlow';

import { 
  CreateInvoiceModal, 
  UploadInvoiceModal, 
  StatusUpdateModal, 
  PdfViewerModal 
} from './InvoiceModals';

function InvoicesView({ 
  user, 
  userData, 
  invoices, 
  setInvoices, 
  statusLogs, 
  setStatusLogs, 
  recipients, 
  onAddInvoice, 
  onUpdateStatus, 
  onPayInvoice, 
  onNavigate 
}) {
  // Filter state
  // Philippines users only see Receivables
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvoiceFlow, setShowInvoiceFlow] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Helper functions
  const getStatusText = (invoice) => {
    if (!invoice || !statusLogs) return 'Unknown';
    const logs = (statusLogs || {})[invoice.invoiceNumber];
    const latestLog = logs?.[logs.length - 1];
    let status = latestLog?.status || 'Sent';
    return status;
  };

  const isOverdue = (invoice) => {
    if (!invoice.dueDate) return false;
    const status = getStatusText(invoice);
    if (status.includes('Fully Paid') || status.includes('Fully Received')) return false;
    const parts = invoice.dueDate.split('/');
    if (parts.length !== 3) return false;
    const dueDate = new Date(parts[2], parts[0] - 1, parts[1]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const getStatusColor = (invoice) => {
    if (isOverdue(invoice)) return 'bg-red-50 dark:bg-red-900/30 text-red-700 border border-red-200';
    const status = getStatusText(invoice);
    if (status.includes('Fully Received') || status.includes('Paid')) return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 border border-emerald-200';
    if (status.includes('Partially Received')) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 border border-amber-200';
    if (status.includes('Viewed')) return 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 border border-violet-200';
    if (status.includes('Sent')) return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 border border-blue-200';
    if (status.includes('Draft')) return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    return 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
  };

  const getTypeColor = () => 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 border border-blue-200';

  const downloadInvoice = (invoice) => {
    if (invoice.pdfData) {
      const link = document.createElement('a');
      link.href = invoice.pdfData;
      link.download = `${invoice.invoiceNumber}.pdf`;
      link.click();
    }
  };

  // Filter invoices
  // Only show Receivable invoices for Philippines users
  const receivableInvoices = invoices.filter(i => i.type === 'Receivable');
  const filteredInvoices = receivableInvoices.filter(invoice => {
    const matchesSearch = invoice.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'overdue' ? isOverdue(invoice) : getStatusText(invoice).toLowerCase().includes(statusFilter));
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats calculations
  const overdueCount = receivableInvoices.filter(i => isOverdue(i)).length;
  const totalReceivable = receivableInvoices.reduce((sum, i) => sum + parseFloat(i.amount?.replace(/[$,]/g, '') || 0), 0);
  const paidCount = receivableInvoices.filter(i => getStatusText(i).includes('Fully Received')).length;

  // Handle upload submit
  const handleUploadSubmit = ({ selectedClient, pdfFile, pdfData, invoiceNumber, dueDate, amount }) => {
    const newInvoice = {
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      dueDate: new Date(dueDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      invoiceNumber,
      pdf: 'has-pdf',
      businessName: selectedClient.name,
      zypId: selectedClient.id.toString(),
      recipientUserId: selectedClient.zypUserId || null,
      type: 'Receivable',
      amount: `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      pdfData,
      pdfFileName: pdfFile.name
    };

    onAddInvoice(newInvoice);
    setShowUploadForm(false);
  };

  // Handle invoice creation complete
  const handleInvoiceCreated = (invoice) => {
    onAddInvoice(invoice);
    setShowInvoiceFlow(false);
  };

  // Handle status update
  const handleStatusUpdate = (newStatus) => {
    if (selectedInvoice) {
      onUpdateStatus(selectedInvoice.invoiceNumber, newStatus);
    }
    setShowStatusModal(false);
  };

  // Invoice creation flow
  if (showInvoiceFlow) {
    return (
      <InvoiceCreationFlow
        recipients={recipients}
        userData={userData}
        onComplete={handleInvoiceCreated}
        onCancel={() => setShowInvoiceFlow(false)}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-gray-800 min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-semibold">Invoices</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => filteredInvoices.length > 0 && exportInvoices(filteredInvoices)}
              disabled={filteredInvoices.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 text-sm"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Invoice
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 border-l-4 border-l-gray-400">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Invoices</p>
            <p className="text-xl sm:text-2xl font-semibold">{receivableInvoices.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 border-l-4 border-l-blue-500">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Receivable</p>
            <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">${totalReceivable.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 border-l-4 border-l-red-500">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Overdue</p>
            <p className={`text-xl sm:text-2xl font-semibold${overdueCount > 0 ? 'text-red-700' : 'text-gray-500 dark:text-gray-400'}`}>{overdueCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:outline-none focus:border-gray-200 dark:focus:border-gray-600 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-gray-200 dark:focus:border-gray-600 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="overdue">Overdue</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
            <option value="partially">Partially</option>
            <option value="fully">Fully</option>
          </select>
        </div>

        {/* Invoice List */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No invoices found</p>
              <p className="text-sm mt-1">Create your first invoice to get started</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <table className="w-full hidden md:table">
                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Invoice #</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Client</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Due Date</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 w-32">Status</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedInvoices.map((invoice) => (
                    <tr
                      key={invoice.invoiceNumber}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => { setSelectedInvoice(invoice); setShowPdfViewer(true); }}
                    >
                      <td className="px-5 py-4">
                        <span className="font-medium text-sm text-blue-700 hover:underline">{invoice.invoiceNumber}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{invoice.businessName}</td>
                      <td className="px-5 py-4 font-medium text-sm">{invoice.amount}</td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{invoice.dueDate}</td>
                      <td className="px-5 py-4 w-32">
                        <span className={`inline-block text-center text-xs w-24 py-0.5 rounded-lg font-medium${getStatusColor(invoice)}`}>
                          {isOverdue(invoice) ? 'Overdue' : getStatusText(invoice)}
                        </span>
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setSelectedInvoice(invoice); setShowStatusModal(true); }}
                            className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedInvoices.map((invoice) => (
                  <div
                    key={invoice.invoiceNumber}
                    className="p-4 cursor-pointer"
                    onClick={() => { setSelectedInvoice(invoice); setShowPdfViewer(true); }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm text-blue-700">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.businessName}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium${getStatusColor(invoice)}`}>
                        {isOverdue(invoice) ? 'Overdue' : getStatusText(invoice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Due {invoice.dueDate}</span>
                      </div>
                      <span className="font-medium">{invoice.amount}</span>
                    </div>
                    <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setSelectedInvoice(invoice); setShowPdfViewer(true); }}
                        className="flex-1 text-xs py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => { setSelectedInvoice(invoice); setShowStatusModal(true); }}
                        className="flex-1 text-xs py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm px-3">{currentPage} / {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        <CreateInvoiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={() => { setShowCreateModal(false); setShowInvoiceFlow(true); }}
          onUpload={() => { setShowCreateModal(false); setShowUploadForm(true); }}
        />

        <UploadInvoiceModal
          isOpen={showUploadForm}
          onClose={() => setShowUploadForm(false)}
          recipients={recipients}
          onSubmit={handleUploadSubmit}
        />

        <StatusUpdateModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          invoice={selectedInvoice}
          onUpdateStatus={handleStatusUpdate}
          statusLogs={statusLogs}
        />

        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          invoice={selectedInvoice}
          onPayInvoice={onPayInvoice}
          onDownload={downloadInvoice}
        />
      </div>
    </div>
  );
}

export default InvoicesView;
