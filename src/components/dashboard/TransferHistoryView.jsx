import React, { useState } from 'react';
import { Send, Search, Clock, Check, TrendingDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { exportTransactions, exportTransactionsPDF } from '../../utils/exportUtils';
import { ExportModal } from '../shared/UIComponents';

function TransferHistoryView({ transactions, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const itemsPerPage = 10;

  const getStatusColor = (status) => {
    if (status === 'completed') return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 border border-emerald-200 dark:border-emerald-800';
    if (status === 'pending') return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 border border-amber-200 dark:border-amber-800';
    if (status === 'failed') return 'bg-red-50 dark:bg-red-900/30 text-red-700 border border-red-200 dark:border-red-800';
    return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 border border-blue-200 dark:border-blue-800';
  };

  const handleExport = (format) => {
    if (format === 'csv') {
      exportTransactions(filteredTransactions);
    } else {
      exportTransactionsPDF(filteredTransactions);
    }
  };

  // Filter transactions
  const filteredTransactions = (transactions || []).filter(txn => {
    const matchesSearch = txn.recipient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         txn.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalSent = (transactions || []).reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalFees = (transactions || []).reduce((sum, t) => sum + (t.fee || 0), 0);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Transfer History</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-600 rounded-none transition-colors text-sm md:text-base"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => onNavigate('transfer')}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-emerald-500 text-white font-semibold rounded-none hover:bg-emerald-400 transition-colors text-sm md:text-base"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">New Transfer</span>
              <span className="sm:hidden">Send</span>
            </button>
          </div>
        </div>

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          title="Export Transfers"
          count={filteredTransactions.length}
        />

        {/* Summary Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-none p-4 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Send className="w-4 h-4 md:w-5 md:h-5 text-emerald-700" />
              <span className="text-gray-600 dark:text-gray-300 text-sm md:text-base">Total Sent</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">${totalSent.toLocaleString()}</div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{(transactions || []).length} transfers</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-none p-4 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-purple-700" />
              <span className="text-gray-600 dark:text-gray-300 text-sm md:text-base">Total Fees</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">${totalFees.toLocaleString()}</div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Avg ${(transactions || []).length > 0 ? ((totalFees / (transactions || []).length).toFixed(2)) : '0'}/transfer</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-none p-4 md:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-700" />
              <span className="text-gray-600 dark:text-gray-300 text-sm md:text-base">Completed</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{(transactions || []).filter(t => t.status === 'completed').length}</div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">of {(transactions || []).length} transfers</div>
          </div>
        </div>

        {/* Filters - Responsive */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search transfers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 md:pl-12 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-none text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm md:text-base"
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 md:px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-none text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm md:text-base"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 md:px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-none text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm md:text-base"
            >
              <option value="all">All Time</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Transfer Table / Cards */}
        <div className="bg-white dark:bg-gray-900 rounded-none border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 md:p-12 text-center text-gray-500 dark:text-gray-400">
              <Clock className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium text-sm md:text-base">No transfers yet</p>
              <p className="text-xs md:text-sm">Your transfer history will appear here</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">Transaction ID</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">Recipient</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">Date</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">Status</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">Amount (USD)</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">Amount (PHP)</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTransactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-100/30">
                        <td className="px-6 py-4">
                          <div className="font-medium text-sm">{txn.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-emerald-700 text-sm font-semibold">{txn.recipient?.charAt(0)}</span>
                            </div>
                            <span className="truncate">{txn.recipient}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{txn.date}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-0.5 rounded-lg capitalize font-medium ${getStatusColor(txn.status)}`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">${txn.amount?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-gray-900 dark:text-white">₱{txn.phpAmount?.toLocaleString() || txn.amountReceived?.toLocaleString() || '—'}</td>
                        <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">${txn.fee?.toFixed(2) || '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {currentTransactions.map((txn) => (
                  <div key={txn.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-emerald-700 font-semibold">{txn.recipient?.charAt(0)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{txn.recipient}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{txn.date}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-lg capitalize font-medium flex-shrink-0 ${getStatusColor(txn.status)}`}>
                        {txn.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Sent</p>
                        <p className="font-semibold">${txn.amount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Received</p>
                        <p className="text-gray-900 dark:text-white">₱{txn.phpAmount?.toLocaleString() || txn.amountReceived?.toLocaleString() || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Fee</p>
                        <p className="text-gray-600 dark:text-gray-300">${txn.fee?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate">ID: {txn.id}</p>
                  </div>
                ))}
              </div>

              {/* Pagination - Responsive */}
              {totalPages > 1 && (
                <div className="px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                    <span className="hidden sm:inline">Showing </span>
                    {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
                    <span className="hidden sm:inline"> of</span>
                    <span className="sm:hidden">/</span> {filteredTransactions.length}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-none bg-gray-100 disabled:opacity-50 hover:bg-gray-600 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-300">
                      {currentPage}/{totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-none bg-gray-100 disabled:opacity-50 hover:bg-gray-600 transition-colors"
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

export default TransferHistoryView;
