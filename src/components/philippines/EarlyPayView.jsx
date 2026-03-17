import React, { useState } from 'react';
import {
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Shield,
  AlertCircle,
  Clock
} from 'lucide-react';

function EarlyPayView({ invoices, statusLogs }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Request flow state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showRequest, setShowRequest] = useState(false);
  const [requestStep, setRequestStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Track EarlyPay status per invoice: { [invoiceNumber]: 'pending' | 'approved' }
  const [earlyPayStatuses, setEarlyPayStatuses] = useState({});

  const EARLYPAY_FEE_PERCENT = 2.5;

  const getStatusText = (invoice) => {
    const logs = (statusLogs || {})[invoice?.invoiceNumber];
    const latestLog = logs?.[logs.length - 1];
    return latestLog?.status || 'Sent';
  };

  // Eligible: receivable, sent or partially received, amount >= $500
  const eligibleInvoices = (invoices || []).filter(invoice => {
    if (invoice?.type !== 'Receivable') return false;
    const status = getStatusText(invoice);
    const amount = parseFloat(invoice?.amount?.replace(/[$,]/g, '') || 0);
    return (status === 'Sent' || status === 'Partially Received') && amount >= 500;
  });

  // Filter by search
  const filteredInvoices = eligibleInvoices.filter(invoice => {
    const q = searchQuery.toLowerCase();
    return invoice.businessName.toLowerCase().includes(q) ||
           invoice.invoiceNumber.toLowerCase().includes(q);
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const notSubmitted = eligibleInvoices.filter(i => !earlyPayStatuses[i.invoiceNumber]);
  const totalEligible = notSubmitted.reduce(
    (sum, inv) => sum + parseFloat(inv.amount?.replace(/[$,]/g, '') || 0), 0
  );
  const pendingCount = Object.values(earlyPayStatuses).filter(s => s === 'pending').length;
  const approvedCount = Object.values(earlyPayStatuses).filter(s => s === 'approved').length;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

  const calculateFee = (amount) => amount * (EARLYPAY_FEE_PERCENT / 100);
  const calculateNet = (amount) => amount - calculateFee(amount);

  const handleRequestEarlyPay = (invoice) => {
    setSelectedInvoice(invoice);
    setShowRequest(true);
    setRequestStep(1);
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Set to pending
    setEarlyPayStatuses(prev => ({
      ...prev,
      [selectedInvoice.invoiceNumber]: 'pending'
    }));

    // Simulate approval after 8 seconds
    const invNum = selectedInvoice.invoiceNumber;
    setTimeout(() => {
      setEarlyPayStatuses(prev => ({
        ...prev,
        [invNum]: 'approved'
      }));
    }, 8000);

    setIsProcessing(false);
    setRequestStep(3);
  };

  const closeModal = () => {
    setShowRequest(false);
    setSelectedInvoice(null);
    setRequestStep(1);
  };

  const getEarlyPayBadge = (invoiceNumber) => {
    const status = earlyPayStatuses[invoiceNumber];
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-medium">
          Approved
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-medium">
          Pending
        </span>
      );
    }
    return null;
  };

  // Request flow
  if (showRequest && selectedInvoice) {
    const amount = parseFloat(selectedInvoice.amount?.replace(/[$,]/g, '') || 0);
    const fee = calculateFee(amount);
    const net = calculateNet(amount);

    return (
      <div className="p-4 md:p-8 bg-gray-50 dark:bg-gray-800 min-h-full">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">EarlyPay Request</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedInvoice.invoiceNumber}</p>
            </div>
          </div>

          {/* Step 1: Review */}
          {requestStep === 1 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-medium">Review Details</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Client</p>
                    <p className="text-sm font-medium">{selectedInvoice.businessName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
                    <p className="text-sm font-medium">{selectedInvoice.dueDate}</p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Invoice Amount</span>
                      <span className="font-medium">{selectedInvoice.amount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-amber-700">
                      <span>EarlyPay Fee ({EARLYPAY_FEE_PERCENT}%)</span>
                      <span>-{formatCurrency(fee)}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center justify-between">
                      <span className="text-sm font-medium">You Receive</span>
                      <span className="text-lg font-semibold text-emerald-700">{formatCurrency(net)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-6">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    When {selectedInvoice.businessName} pays this invoice, Zyp will collect the full amount. No additional action needed from you.
                  </p>
                </div>

                <button
                  onClick={() => setRequestStep(2)}
                  className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Submit for Approval */}
          {requestStep === 2 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-medium">Submit for Approval</h2>
              </div>
              <div className="p-5">
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      I understand that Zyp will collect the full invoice amount ({selectedInvoice.amount}) when {selectedInvoice.businessName} pays.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      I agree to the {EARLYPAY_FEE_PERCENT}% EarlyPay fee ({formatCurrency(fee)}).
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Once approved, funds will be deposited to my linked bank account.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-700 font-medium">Amount to receive</span>
                    <span className="text-xl font-semibold text-emerald-700">{formatCurrency(net)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setRequestStep(1)}
                    className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Submitted */}
          {requestStep === 3 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-7 h-7 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Request Submitted</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Your EarlyPay request for {formatCurrency(net)} is awaiting approval. You'll be notified once it's been reviewed.
                </p>

                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 text-left">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Invoice</span>
                    <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      Awaiting Approval
                    </span>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-gray-800 min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-xl md:text-2xl font-semibold">EarlyPay</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 border-l-4 border-l-amber-500">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Eligible Invoices</p>
            <p className="text-xl sm:text-2xl font-semibold">{eligibleInvoices.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 border-l-4 border-l-emerald-500">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Available to Advance</p>
            <p className="text-xl sm:text-2xl font-semibold">{formatCurrency(totalEligible)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 border-l-4 border-l-blue-500">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Requests</p>
            <p className="text-xl sm:text-2xl font-semibold">{pendingCount + approvedCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {pendingCount > 0 && <span>{pendingCount} pending</span>}
              {pendingCount > 0 && approvedCount > 0 && <span> · </span>}
              {approvedCount > 0 && <span>{approvedCount} approved</span>}
              {pendingCount === 0 && approvedCount === 0 && <span>No requests yet</span>}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search eligible invoices..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:outline-none focus:border-gray-200 dark:focus:border-gray-600 text-sm"
            />
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No eligible invoices</p>
              <p className="text-sm mt-1">Invoices that are sent and $500+ qualify for EarlyPay</p>
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
                    <th className="text-right px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedInvoices.map((invoice) => {
                    const amount = parseFloat(invoice.amount?.replace(/[$,]/g, '') || 0);
                    const net = calculateNet(amount);
                    const epStatus = earlyPayStatuses[invoice.invoiceNumber];
                    return (
                      <tr key={invoice.invoiceNumber} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-medium text-sm">{invoice.invoiceNumber}</span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{invoice.businessName}</td>
                        <td className="px-5 py-4 font-medium text-sm">{invoice.amount}</td>
                        <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{invoice.dueDate}</td>
                        <td className="px-5 py-4 w-32">
                          {getEarlyPayBadge(invoice.invoiceNumber)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {!epStatus && (
                            <button
                              onClick={() => handleRequestEarlyPay(invoice)}
                              className="inline-flex items-center px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm"
                            >
                              Get Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedInvoices.map((invoice) => {
                  const amount = parseFloat(invoice.amount?.replace(/[$,]/g, '') || 0);
                  const net = calculateNet(amount);
                  const epStatus = earlyPayStatuses[invoice.invoiceNumber];
                  return (
                    <div key={invoice.invoiceNumber} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.businessName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getEarlyPayBadge(invoice.invoiceNumber)}
                          <span className="font-medium text-sm">{invoice.amount}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Due {invoice.dueDate}</span>
                      </div>
                      {!epStatus && (
                        <button
                          onClick={() => handleRequestEarlyPay(invoice)}
                          className="w-full flex items-center justify-center py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm"
                        >
                          Get Paid
                        </button>
                      )}
                    </div>
                  );
                })}
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
      </div>
    </div>
  );
}

export default EarlyPayView;
