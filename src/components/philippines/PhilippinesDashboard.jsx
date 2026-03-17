import React, { useState } from 'react';
import { FileText, ChevronRight, CreditCard, CheckCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import AnalyticsView from './AnalyticsView';
import ProfileSettings from '../dashboard/ProfileSettings';
import InvoicesView from '../invoices/InvoicesView';

const DASHBOARD_VERSION = "2.0";
function PhilippinesDashboard({
  user,
  userData,
  invoices,
  setInvoices,
  transactions,
  statusLogs,
  setStatusLogs,
  recipients,
  setRecipients,
  onAddRecipient,
  onUpdateRecipient,
  onDeleteRecipient,
  onAddInvoice,
  onUpdateStatus,
  onUpdateProfile,
  onDeleteAccount,
  onBackToPortal,
  embedded = false,
  activeView: externalActiveView,
  setActiveView: externalSetActiveView
}) {
  const [internalActiveView, setInternalActiveView] = useState('home');

  // Use external state if provided (from portal sidebar), otherwise internal
  const activeView = externalActiveView || internalActiveView;
  const setActiveView = externalSetActiveView || setInternalActiveView;

  // Calculate totals
  const totalReceived = (transactions || []).reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingPayments = (invoices || []).filter(i => {
    const logs = (statusLogs || {})[i.invoiceNumber] || [];
    const lastStatus = logs.length > 0 ? logs[logs.length - 1].status : 'Sent';
    return lastStatus === 'Sent' || lastStatus === 'Partially Received';
  });
  const pendingAmount = pendingPayments.reduce((sum, i) => sum + parseFloat(i.amount?.replace(/[$,]/g, '') || 0), 0);

  const getStatusText = (invoice) => {
    const logs = (statusLogs || {})[invoice.invoiceNumber] || [];
    return logs.length > 0 ? logs[logs.length - 1].status : 'Pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': case 'Fully Received': case 'Completed': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Partially Paid': case 'Partially Received': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Approved': case 'Sent': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Pending': case 'Draft': return 'bg-gray-50 dark:bg-gray-800 text-gray-600 border border-gray-200';
      case 'Overdue': case 'Disputed': return 'bg-red-50 text-red-700 border border-red-200';
      case 'Viewed': return 'bg-violet-50 text-violet-700 border border-violet-200';
      default: return 'bg-gray-50 dark:bg-gray-800 text-gray-600 border border-gray-200';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Render content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'invoices':
        return (
          <InvoicesView 
            invoices={invoices}
            setInvoices={setInvoices}
            statusLogs={statusLogs}
            setStatusLogs={setStatusLogs}
            recipients={recipients}
            onAddInvoice={onAddInvoice}
            onUpdateStatus={onUpdateStatus}
            userData={userData}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView 
            invoices={invoices}
            transactions={transactions}
            statusLogs={statusLogs}
          />
        );
      case 'payments':
        return renderPaymentsView();
      default:
        return renderHomeView();
    }
  };

  const renderHomeView = () => (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5 border-l-4 border-l-emerald-500">
            <div className="mb-3">
              <span className="text-gray-500 text-sm">Total Received</span>
            </div>
            <p className="text-xl sm:text-2xl font-semibold text-gray-900">{formatCurrency(totalReceived)}</p>
            <p className="text-xs text-gray-500 mt-1">{(transactions || []).length} payments</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5 border-l-4 border-l-amber-500">
            <div className="mb-3">
              <span className="text-gray-500 text-sm">Pending</span>
            </div>
            <p className="text-xl sm:text-2xl font-semibold text-gray-900">{formatCurrency(pendingAmount)}</p>
            <p className="text-xs text-gray-500 mt-1">{pendingPayments.length} invoices</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Recent Payments */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200">
              <h2 className="font-medium">Recent Payments</h2>
              <button
                onClick={() => setActiveView('payments')}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {(transactions || []).length === 0 ? (
              <div className="p-8 text-center">
                <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-900 text-sm">No payments yet</p>
                <p className="text-xs text-gray-500 mt-1">Payments from your clients will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {(transactions || []).slice(0, 5).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-500">{txn.recipient?.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{txn.recipient}</p>
                        <p className="text-xs text-gray-500">{txn.date}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-medium text-gray-900">+{formatCurrency(txn.amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${
                        txn.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {txn.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Invoices */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200">
              <h2 className="font-medium">Pending Invoices</h2>
              <button
                onClick={() => setActiveView('invoices')}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                View all
              </button>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                <p className="font-medium text-gray-900 text-sm">All caught up</p>
                <p className="text-xs text-gray-500 mt-1">No pending invoices right now</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {pendingPayments.slice(0, 5).map((invoice) => (
                  <div key={invoice.invoiceNumber} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{invoice.invoiceNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${getStatusColor(getStatusText(invoice))}`}>
                          {getStatusText(invoice)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{invoice.businessName}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-medium text-sm">{invoice.amount}</p>
                      <p className="text-xs text-gray-500">Due {invoice.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPaymentsView = () => (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Payment History</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {(transactions || []).length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No payments yet</p>
              <p className="text-sm mt-1">When US clients send you payments, they'll appear here</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <table className="w-full hidden md:table">
                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">From</th>
                    <th className="text-right px-5 py-3 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-right px-5 py-3 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(transactions || []).map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-5 py-4 text-sm text-gray-500">{txn.date}</td>
                      <td className="px-5 py-4 text-sm">{txn.recipient}</td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-gray-900 font-medium">+{formatCurrency(txn.amount)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                          txn.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {(transactions || []).map((txn) => (
                  <div key={txn.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">{txn.recipient}</p>
                        <p className="text-xs text-gray-500">{txn.date}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                        txn.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {txn.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-gray-900">+{formatCurrency(txn.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${embedded ? '' : 'min-h-screen bg-gray-50 dark:bg-gray-800'} text-gray-900`} data-v="2">
      <div className="bg-gray-50 dark:bg-gray-800">
        {renderContent()}
      </div>
    </div>
  );
}

export default PhilippinesDashboard;
