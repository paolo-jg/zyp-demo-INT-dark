import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { secureError } from '../../utils/secureLogging';
import {
  FileCheck,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Calendar,
  DollarSign,
  ArrowLeftRight,
  Filter,
  Check,
  X
} from 'lucide-react';

function AdminReconciliation({ logAction, adminRole }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({
    matched: 0,
    mismatch: 0,
    pending: 0,
    totalZyp: 0,
    totalCybrid: 0
  });

  const fetchReconciliation = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reconciliation_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        query = query.eq('reconciliation_date', dateFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('match_status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRecords(data || []);

      // Calculate summary
      const matched = data?.filter(r => r.match_status === 'matched').length || 0;
      const mismatch = data?.filter(r => r.match_status === 'mismatch').length || 0;
      const pending = data?.filter(r => r.match_status === 'pending').length || 0;
      const totalZyp = data?.reduce((sum, r) => sum + (parseFloat(r.zyp_amount) || 0), 0) || 0;
      const totalCybrid = data?.reduce((sum, r) => sum + (parseFloat(r.cybrid_amount) || 0), 0) || 0;

      setSummary({ matched, mismatch, pending, totalZyp, totalCybrid });

    } catch (err) {
      secureError('Failed to fetch reconciliation records:', err);
    }
    setLoading(false);
  }, [dateFilter, statusFilter]);

  useEffect(() => {
    fetchReconciliation();
  }, [fetchReconciliation]);

  // Run reconciliation for a specific date
  const runReconciliation = async () => {
    setLoading(true);
    try {
      // Fetch all transactions for the date
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', `${dateFilter}T00:00:00`)
        .lte('created_at', `${dateFilter}T23:59:59`);

      if (!transactions || transactions.length === 0) {
        alert('No transactions found for this date');
        setLoading(false);
        return;
      }

      // Create reconciliation records
      const records = transactions.map(txn => ({
        reconciliation_date: dateFilter,
        zyp_transaction_id: txn.id,
        cybrid_transfer_guid: txn.cybrid_transfer_guid,
        zyp_amount: txn.amount_sent,
        zyp_status: txn.status,
        // For now, we'll mark as pending - in production, you'd fetch from Cybrid
        match_status: txn.cybrid_transfer_guid ? 'pending' : 'mismatch',
        discrepancy_reason: !txn.cybrid_transfer_guid ? 'No Cybrid transfer ID' : null
      }));

      // Upsert records
      const { error } = await supabase
        .from('reconciliation_records')
        .upsert(records, { onConflict: 'zyp_transaction_id,reconciliation_date' });

      if (error) throw error;

      await logAction('run_reconciliation', 'reconciliation', dateFilter);
      fetchReconciliation();

    } catch (err) {
      secureError('Failed to run reconciliation:', err);
      alert('Failed to run reconciliation');
    }
    setLoading(false);
  };

  const markAsReconciled = async (recordId, status = 'matched') => {
    try {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .single();

      const { error } = await supabase
        .from('reconciliation_records')
        .update({
          match_status: status,
          reconciled_by: adminUser?.id,
          reconciled_at: new Date().toISOString()
        })
        .eq('id', recordId);

      if (error) throw error;

      await logAction('mark_reconciled', 'reconciliation', recordId, { status });
      fetchReconciliation();
    } catch (err) {
      secureError('Failed to update reconciliation status:', err);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'matched':
        return { color: 'bg-emerald-400/20 text-emerald-400', icon: CheckCircle };
      case 'mismatch':
        return { color: 'bg-red-400/20 text-red-400', icon: XCircle };
      case 'manual_override':
        return { color: 'bg-blue-400/20 text-blue-400', icon: FileCheck };
      default:
        return { color: 'bg-yellow-400/20 text-yellow-400', icon: AlertTriangle };
    }
  };

  const exportReport = () => {
    const headers = ['Date', 'Zyp Transaction', 'Cybrid Transfer', 'Zyp Amount', 'Cybrid Amount', 'Discrepancy', 'Status'];
    const rows = records.map(r => [
      r.reconciliation_date,
      r.zyp_transaction_id?.slice(0, 8),
      r.cybrid_transfer_guid || 'N/A',
      r.zyp_amount,
      r.cybrid_amount || 'N/A',
      r.discrepancy_amount || '0',
      r.match_status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-${dateFilter}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Matched
          </div>
          <p className="text-2xl font-bold text-emerald-400">{summary.matched}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <XCircle className="w-4 h-4 text-red-400" />
            Mismatch
          </div>
          <p className={`text-2xl font-bold ${summary.mismatch > 0 ? 'text-red-400' : 'text-white'}`}>
            {summary.mismatch}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Pending
          </div>
          <p className={`text-2xl font-bold ${summary.pending > 0 ? 'text-yellow-400' : 'text-white'}`}>
            {summary.pending}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <DollarSign className="w-4 h-4" />
            Zyp Total
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalZyp)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <ArrowLeftRight className="w-4 h-4" />
            Difference
          </div>
          <p className={`text-2xl font-bold ${
            Math.abs(summary.totalZyp - summary.totalCybrid) > 0.01 ? 'text-red-400' : 'text-emerald-400'
          }`}>
            {formatCurrency(Math.abs(summary.totalZyp - summary.totalCybrid))}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Statuses</option>
          <option value="matched">Matched</option>
          <option value="mismatch">Mismatch</option>
          <option value="pending">Pending</option>
          <option value="manual_override">Manual Override</option>
        </select>

        <button
          onClick={runReconciliation}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Run Reconciliation
        </button>

        <button
          onClick={exportReport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors ml-auto"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Records Table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-sm font-medium text-gray-400">Zyp Transaction</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Cybrid Transfer</th>
                <th className="text-right p-4 text-sm font-medium text-gray-400">Zyp Amount</th>
                <th className="text-right p-4 text-sm font-medium text-gray-400">Cybrid Amount</th>
                <th className="text-right p-4 text-sm font-medium text-gray-400">Discrepancy</th>
                <th className="text-center p-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-center p-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No reconciliation records for this date. Click "Run Reconciliation" to generate.
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const badge = getStatusBadge(record.match_status);
                  const BadgeIcon = badge.icon;
                  const discrepancy = Math.abs((record.zyp_amount || 0) - (record.cybrid_amount || 0));
                  
                  return (
                    <tr key={record.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 text-sm font-mono text-white">
                        {record.zyp_transaction_id?.slice(0, 12)}...
                      </td>
                      <td className="p-4 text-sm font-mono text-gray-400">
                        {record.cybrid_transfer_guid?.slice(0, 12) || 'N/A'}...
                      </td>
                      <td className="p-4 text-sm text-right text-white">
                        {formatCurrency(record.zyp_amount)}
                      </td>
                      <td className="p-4 text-sm text-right text-gray-400">
                        {record.cybrid_amount ? formatCurrency(record.cybrid_amount) : 'N/A'}
                      </td>
                      <td className={`p-4 text-sm text-right ${discrepancy > 0.01 ? 'text-red-400' : 'text-gray-400'}`}>
                        {formatCurrency(discrepancy)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {record.match_status}
                        </span>
                      </td>
                      <td className="p-4">
                        {record.match_status !== 'matched' && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => markAsReconciled(record.id, 'matched')}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/20 rounded-lg transition-colors"
                              title="Mark as matched"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => markAsReconciled(record.id, 'manual_override')}
                              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-400/20 rounded-lg transition-colors"
                              title="Manual override"
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discrepancy Notes */}
      {records.some(r => r.discrepancy_reason) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <h4 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Discrepancy Notes
          </h4>
          <ul className="space-y-1 text-sm text-yellow-400/80">
            {records.filter(r => r.discrepancy_reason).map(r => (
              <li key={r.id}>
                • {r.zyp_transaction_id?.slice(0, 8)}: {r.discrepancy_reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AdminReconciliation;
