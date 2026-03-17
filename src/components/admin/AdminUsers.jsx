import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { secureError } from '../../utils/secureLogging';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserX,
  UserCheck,
  Shield,
  Mail,
  Building2,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  X,
  Download
} from 'lucide-react';

function AdminUsers({ logAction, adminRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const pageSize = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,business_name.ilike.%${searchQuery}%`);
      }

      if (statusFilter === 'verified') {
        query = query.eq('is_verified', true);
      } else if (statusFilter === 'unverified') {
        query = query.eq('is_verified', false);
      } else if (statusFilter === 'suspended') {
        query = query.eq('is_suspended', true);
      } else if (statusFilter === 'onboarded') {
        query = query.eq('onboarding_completed', true);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      secureError('Failed to fetch users:', err);
    }
    setLoading(false);
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSuspendUser = async (userId) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: true })
        .eq('id', userId);

      if (error) throw error;

      await logAction('suspend_user', 'user', userId);
      
      await supabase.rpc('create_system_alert', {
        p_alert_type: 'info',
        p_category: 'security',
        p_title: 'User suspended',
        p_message: `User ${userId} has been suspended`,
        p_target_type: 'user',
        p_target_id: userId
      });

      fetchUsers();
    } catch (err) {
      secureError('Failed to suspend user:', err);
    }
  };

  const handleUnsuspendUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: false })
        .eq('id', userId);

      if (error) throw error;

      await logAction('unsuspend_user', 'user', userId);
      fetchUsers();
    } catch (err) {
      secureError('Failed to unsuspend user:', err);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getVerificationBadge = (user) => {
    if (user.is_suspended) return { color: 'bg-red-400/20 text-red-400', label: 'Suspended' };
    if (user.is_verified) return { color: 'bg-emerald-400/20 text-emerald-400', label: 'Verified' };
    if (user.onboarding_completed) return { color: 'bg-yellow-400/20 text-yellow-400', label: 'Pending KYC' };
    return { color: 'bg-gray-400/20 text-gray-400', label: 'Incomplete' };
  };

  const exportCSV = () => {
    const headers = ['Email', 'Name', 'Business', 'Country', 'Verified', 'Created'];
    const rows = users.map(u => [
      u.email,
      `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      u.business_name || '',
      u.country || '',
      u.is_verified ? 'Yes' : 'No',
      formatDate(u.created_at)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
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
            placeholder="Search by email, name, or business..."
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
          <option value="all">All Users</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
          <option value="onboarded">Onboarded</option>
          <option value="suspended">Suspended</option>
        </select>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>

        <button
          onClick={fetchUsers}
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
                <th className="text-left p-4 text-sm font-medium text-gray-400">User</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Business</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Country</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Type</th>
                <th className="text-center p-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Joined</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const badge = getVerificationBadge(user);
                  return (
                    <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {user.first_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-300">{user.business_name || '-'}</td>
                      <td className="p-4 text-sm text-gray-300">{user.country || '-'}</td>
                      <td className="p-4 text-sm text-gray-300 capitalize">{user.account_type || 'business'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-400">{formatDate(user.created_at)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDetails(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {user.is_suspended ? (
                            <button
                              onClick={() => handleUnsuspendUser(user.id)}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/20 rounded-lg transition-colors"
                              title="Unsuspend"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspendUser(user.id)}
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded-lg transition-colors"
                              title="Suspend"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* User Details Modal */}
      {showDetails && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">User Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-white font-medium">
                    {selectedUser.first_name?.charAt(0) || selectedUser.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h4>
                  <p className="text-gray-400">{selectedUser.email}</p>
                  {selectedUser.business_name && (
                    <p className="text-sm text-emerald-400">{selectedUser.business_name}</p>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Shield className="w-4 h-4" />
                    Account Type
                  </div>
                  <p className="text-white capitalize">{selectedUser.account_type || 'Business'}</p>
                </div>
                <div className="p-4 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <MapPin className="w-4 h-4" />
                    Country
                  </div>
                  <p className="text-white">{selectedUser.country || 'Not set'}</p>
                </div>
                <div className="p-4 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Joined
                  </div>
                  <p className="text-white">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div className="p-4 bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <CheckCircle className="w-4 h-4" />
                    Verification
                  </div>
                  <p className={selectedUser.is_verified ? 'text-emerald-400' : 'text-yellow-400'}>
                    {selectedUser.is_verified ? 'Verified' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {selectedUser.onboarding_completed && (
                  <span className="px-3 py-1 bg-emerald-400/20 text-emerald-400 text-sm rounded-full">
                    Onboarding Complete
                  </span>
                )}
                {selectedUser.kyc_completed && (
                  <span className="px-3 py-1 bg-blue-400/20 text-blue-400 text-sm rounded-full">
                    KYC Complete
                  </span>
                )}
                {selectedUser.bank_linked && (
                  <span className="px-3 py-1 bg-purple-400/20 text-purple-400 text-sm rounded-full">
                    Bank Linked
                  </span>
                )}
                {selectedUser.is_suspended && (
                  <span className="px-3 py-1 bg-red-400/20 text-red-400 text-sm rounded-full">
                    Suspended
                  </span>
                )}
              </div>

              {/* IDs */}
              <div className="p-4 bg-gray-700/50 rounded-xl">
                <p className="text-sm text-gray-400 mb-2">User ID</p>
                <p className="text-white font-mono text-sm">{selectedUser.id}</p>
                {selectedUser.cybrid_customer_guid && (
                  <>
                    <p className="text-sm text-gray-400 mt-3 mb-2">Cybrid Customer ID</p>
                    <p className="text-white font-mono text-sm">{selectedUser.cybrid_customer_guid}</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-700">
              {selectedUser.is_suspended ? (
                <button
                  onClick={() => {
                    handleUnsuspendUser(selectedUser.id);
                    setShowDetails(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  Unsuspend User
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleSuspendUser(selectedUser.id);
                    setShowDetails(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                >
                  <UserX className="w-4 h-4" />
                  Suspend User
                </button>
              )}
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

export default AdminUsers;
