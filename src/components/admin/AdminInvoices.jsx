import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { secureError } from '../../utils/secureLogging';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Building2,
  User,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Zap
} from 'lucide-react';

function AdminInvoices({ logAction, adminRole }) {
  const [invoices, setInvoices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch invoices and users
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch all users (Philippines businesses primarily)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, business_name, country, account_type')
        .order('business_name', { ascending: true });

      if (usersError) throw usersError;

      setInvoices(invoicesData || []);
      setUsers(usersData || []);
      
      logAction('view_invoices', 'invoices', null, { count: invoicesData?.length });
    } catch (err) {
      secureError('Failed to fetch invoices:', err);
    }
    setLoading(false);
  };

  // Get user display name
  const getUserDisplayName = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return 'Unknown User';
    return user.business_name || `${user.first_name} ${user.last_name}` || user.email;
  };

  // Get status from status_logs (if available) or default
  const getInvoiceStatus = (invoice) => {
    // If invoice has a status field, use it
    if (invoice.status) return invoice.status;
    // Default to 'Sent' for invoices without status
    return 'Sent';
  };

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Filter by user
    if (selectedUser !== 'all') {
      result = result.filter(inv => inv.user_id === selectedUser);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(inv => getInvoiceStatus(inv) === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(query) ||
        inv.business_name?.toLowerCase().includes(query) ||
        inv.client_name?.toLowerCase().includes(query) ||
        getUserDisplayName(inv.user_id).toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle amount sorting (remove $ and commas)
      if (sortField === 'amount') {
        aVal = parseFloat(String(aVal).replace(/[$,]/g, '')) || 0;
        bVal = parseFloat(String(bVal).replace(/[$,]/g, '')) || 0;
      }

      // Handle date sorting
      if (sortField === 'created_at' || sortField === 'due_date') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [invoices, selectedUser, statusFilter, searchQuery, sortField, sortDirection, users]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredInvoices.length;
    const totalAmount = filteredInvoices.reduce((sum, inv) => {
      const amount = parseFloat(String(inv.amount).replace(/[$,]/g, '')) || 0;
      return sum + amount;
    }, 0);
    const paid = filteredInvoices.filter(inv => getInvoiceStatus(inv) === 'Fully Received').length;
    const pending = filteredInvoices.filter(inv => ['Sent', 'Pending'].includes(getInvoiceStatus(inv))).length;
    const partial = filteredInvoices.filter(inv => getInvoiceStatus(inv) === 'Partially Received').length;

    return { total, totalAmount, paid, pending, partial };
  }, [filteredInvoices]);

  // Toggle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Invoice #', 'User', 'Client', 'Amount', 'Due Date', 'Status', 'Created'];
    const rows = filteredInvoices.map(inv => [
      inv.invoice_number,
      getUserDisplayName(inv.user_id),
      inv.business_name || inv.client_name,
      inv.amount,
      inv.due_date,
      getInvoiceStatus(inv),
      new Date(inv.created_at).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    logAction('export_invoices', 'invoices', null, { count: filteredInvoices.length });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Fully Received':
      case 'Paid':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'Partially Received':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'Sent':
      case 'Pending':
        return 'bg-blue-500/20 text-blue-400';
      case 'Overdue':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Invoices</h2>
          <p className="text-gray-400 text-sm">View and manage all user invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <FileText className="w-4 h-4" />
            Total Invoices
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Total Amount
          </div>
          <p className="text-2xl font-bold">${stats.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Paid
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats.paid}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            Pending
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            Partial
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.partial}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoices..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* User Filter */}
          <div className="min-w-[200px]">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Users</option>
              {users.filter(u => u.country === 'Philippines').map(user => (
                <option key={user.id} value={user.id}>
                  {user.business_name || `${user.first_name} ${user.last_name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="Sent">Sent</option>
              <option value="Pending">Pending</option>
              <option value="Partially Received">Partially Received</option>
              <option value="Fully Received">Fully Received</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || selectedUser !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedUser('all');
                setStatusFilter('all');
              }}
              className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No invoices found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th 
                  className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('invoice_number')}
                >
                  <div className="flex items-center gap-1">
                    Invoice # <SortIcon field="invoice_number" />
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">
                  User
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">
                  Client
                </th>
                <th 
                  className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    Amount <SortIcon field="amount" />
                  </div>
                </th>
                <th 
                  className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('due_date')}
                >
                  <div className="flex items-center gap-1">
                    Due Date <SortIcon field="due_date" />
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">
                  Status
                </th>
                <th 
                  className="text-left px-6 py-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Created <SortIcon field="created_at" />
                  </div>
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredInvoices.map((invoice) => {
                const status = getInvoiceStatus(invoice);
                return (
                  <tr key={invoice.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4">
                      <span className="font-medium text-white">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-gray-300 text-sm">
                          {getUserDisplayName(invoice.user_id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {invoice.business_name || invoice.client_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-white">{invoice.amount}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {invoice.due_date || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Results count */}
      <div className="mt-4 text-sm text-gray-400">
        Showing {filteredInvoices.length} of {invoices.length} invoices
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Invoice Details</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Invoice Info */}
              <div className="bg-gray-700/50 rounded-xl p-4">
                <h4 className="font-medium text-gray-400 mb-3">Invoice Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Invoice Number</p>
                    <p className="font-medium">{selectedInvoice.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Amount</p>
                    <p className="font-medium text-lg">{selectedInvoice.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Due Date</p>
                    <p className="font-medium">{selectedInvoice.due_date || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(getInvoiceStatus(selectedInvoice))}`}>
                      {getInvoiceStatus(selectedInvoice)}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-gray-700/50 rounded-xl p-4">
                <h4 className="font-medium text-gray-400 mb-3">Created By</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium">{getUserDisplayName(selectedInvoice.user_id)}</p>
                    <p className="text-sm text-gray-400">
                      {users.find(u => u.id === selectedInvoice.user_id)?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="bg-gray-700/50 rounded-xl p-4">
                <h4 className="font-medium text-gray-400 mb-3">Client</h4>
                <p className="font-medium">{selectedInvoice.business_name || selectedInvoice.client_name || 'Not specified'}</p>
                {selectedInvoice.client_email && (
                  <p className="text-sm text-gray-400">{selectedInvoice.client_email}</p>
                )}
              </div>

              {/* Description */}
              {selectedInvoice.description && (
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-400 mb-3">Description</h4>
                  <p className="text-gray-300">{selectedInvoice.description}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-gray-700/50 rounded-xl p-4">
                <h4 className="font-medium text-gray-400 mb-3">Metadata</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Created</p>
                    <p>{new Date(selectedInvoice.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Last Updated</p>
                    <p>{new Date(selectedInvoice.updated_at || selectedInvoice.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Invoice ID</p>
                    <p className="font-mono text-xs">{selectedInvoice.id}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
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

export default AdminInvoices;
