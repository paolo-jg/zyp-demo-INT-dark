import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { secureError } from '../../utils/secureLogging';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pause,
  Play,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  X,
  MoreVertical
} from 'lucide-react';

function AdminTransactions({ logAction, adminRole }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const pageSize = 20;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*, users!transactions_user_id_fkey(email, first_name, last_name, business_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        query = query.or(`recipient_name.ilike.%${searchQuery}%,transaction_number.ilike.%${searchQuery}%`);
      }

      if (dateRange.start) {
        query = query.gte('created_at', `${dateRange.start}T00:00:00`);
      }

      if (dateRange.end) {
        query = query.lte('created_at', `${dateRange.end}T23:59:59`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setTransactions(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      secureError('Failed to fetch transactions:', err);
    }
    setLoading(false);
  }, [page, statusFilter, searchQuery, dateRange]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFlagTransaction = async (txn, reason) => {
    try {
      const { error } = await supabase
        .from('flagged_transactions')
        .insert({
          transaction_id: txn.id,
          flag_reason: reason,
          flag_details: { original_status: txn.status }
        });

      if (error) throw error;

      await logAction('flag_transaction', 'transaction', txn.id, { reason });
      
      // Create alert
      await supabase.rpc('create_system_alert', {
        p_alert_type: 'warning',
        p_category: 'transfer',
        p_title: `Transaction flagged: ${txn.transaction_number}`,
        p_message: `Flagged for: ${reason}`,
        p_target_type: 'transaction',
        p_target_id: txn.id
      });

      fetchTransactions();
    } catch (err) {
      secureError('Failed to flag transaction:', err);
    }
  };

  const handlePauseTransaction = async (txn) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'paused' })
        .eq('id', txn.id);

      if (error) throw error;

      await logAction('pause_transaction', 'transaction', txn.id);
      fetchTransactions();
    } catch (err) {
      secureError('Failed to pause transaction:', err);
    }
  };

  const handleResumeTransaction = async (txn) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'pending' })
        .eq('id', txn.id);

      if (error) throw error;

      await logAction('resume_transaction', 'transaction', txn.id);
      fetchTransactions();
    } catch (err) {
      secureError('Failed to resume transaction:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-emerald-400/20 text-emerald-400',
      pending: 'bg-yellow-400/20 text-yellow-400',
      processing: 'bg-blue-400/20 text-blue-400',
      failed: 'bg-red-400/20 text-red-400',
      paused: 'bg-orange-400/20 text-orange-400',
      cancelled: 'bg-gray-400/20 text-gray-400'
    };
    return styles[status?.toLowerCase()] || styles.pending;
  };

  const exportCSV = () => {
    const headers = ['Date', 'Transaction #', 'Sender', 'Recipient', 'Amount', 'Fee', 'Status'];
    const rows = transactions.map(t => [
      formatDate(t.created_at),
      t.transaction_number,
      t.users?.email || t.user_id,
      t.recipient_name,
      t.amount_sent,
      t.fee,
      t.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by recipient or transaction #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
          <option value="paused">Paused</option>
        </select>

        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <span className="text-gray-500">to</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>

        <button
          onClick={fetchTransactions}
          className="p-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-sm font-medium text-gray-400">Date</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Transaction #</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Sender</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Recipient</th>
                <th className="text-right p-4 text-sm font-medium text-gray-400">Amount</th>
                <th className="text-right p-4 text-sm font-medium text-gray-400">Fee</th>
                <th className="text-center p-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-center p-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 text-sm text-gray-300">{formatDate(txn.created_at)}</td>
                    <td className="p-4 text-sm font-mono text-white">{txn.transaction_number || txn.id.slice(0, 8)}</td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm text-white">{txn.users?.business_name || txn.users?.first_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{txn.users?.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm text-white">{txn.recipient_name}</p>
                        <p className="text-xs text-gray-500">{txn.recipient_email}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-right font-medium text-white">
                      {formatCurrency(txn.amount_sent)}
                    </td>
                    <td className="p-4 text-sm text-right text-gray-400">
                      {formatCurrency(txn.fee)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(txn.status)}`}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedTxn(txn);
                            setShowDetails(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {txn.status === 'pending' && (
                          <button
                            onClick={() => handlePauseTransaction(txn)}
                            className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/20 rounded-lg transition-colors"
                            title="Pause"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {txn.status === 'paused' && (
                          <button
                            onClick={() => handleResumeTransaction(txn)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/20 rounded-lg transition-colors"
                            title="Resume"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleFlagTransaction(txn, 'manual')}
                          className="p-1.5 text-orange-400 hover:text-orange-300 hover:bg-orange-400/20 rounded-lg transition-colors"
                          title="Flag for review"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showDetails && selectedTxn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Transaction Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Transaction Number</p>
                  <p className="text-white font-mono">{selectedTxn.transaction_number || selectedTxn.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(selectedTxn.status)}`}>
                    {selectedTxn.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Amount Sent</p>
                  <p className="text-white font-medium">{formatCurrency(selectedTxn.amount_sent)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Amount Received</p>
                  <p className="text-white font-medium">
                    ₱{parseFloat(selectedTxn.amount_received || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Fee</p>
                  <p className="text-white">{formatCurrency(selectedTxn.fee)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Exchange Rate</p>
                  <p className="text-white">₱{selectedTxn.exchange_rate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Sender</p>
                  <p className="text-white">{selectedTxn.users?.email || selectedTxn.user_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Recipient</p>
                  <p className="text-white">{selectedTxn.recipient_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Created</p>
                  <p className="text-white">{formatDate(selectedTxn.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Cybrid Transfer ID</p>
                  <p className="text-white font-mono text-sm">{selectedTxn.cybrid_transfer_guid || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-700">
              {selectedTxn.status === 'pending' && (
                <button
                  onClick={() => {
                    handlePauseTransaction(selectedTxn);
                    setShowDetails(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl hover:bg-yellow-500/30 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Pause Transaction
                </button>
              )}
              <button
                onClick={() => {
                  handleFlagTransaction(selectedTxn, 'manual');
                  setShowDetails(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-xl hover:bg-orange-500/30 transition-colors"
              >
                <Flag className="w-4 h-4" />
                Flag for Review
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTransactions;
