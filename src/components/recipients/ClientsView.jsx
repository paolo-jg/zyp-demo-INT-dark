/**
 * ClientsView - View and manage US clients (for Philippines users)
 * Uses UserSearchModal to search for and add verified US users
 */

import React, { useState } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, 
  Users, Building2, User, Download, UserPlus, Trash2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { exportRecipients } from '../../utils/exportUtils';
import { UserSearchModal } from '../shared/UserSearchModal';
import { supabase } from '../../supabaseClient';

function ClientsView({ 
  recipients = [],
  setRecipients,
  userData,
  onRefresh,
  onDeleteRecipient
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter to US clients only
  const usClients = recipients.filter(r => 
    r.country === 'United States' || r.country === 'USA' || r.country === 'US'
  );

  // Sorting
  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const sortedClients = [...usClients].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    if (typeof aValue === 'string') { 
      aValue = aValue.toLowerCase(); 
      bValue = bValue.toLowerCase(); 
    }
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredClients = sortedClients.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = c.name?.toLowerCase().includes(searchLower) ||
                         c.company?.toLowerCase().includes(searchLower) ||
                         c.email?.toLowerCase().includes(searchLower);
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * rowsPerPage, 
    currentPage * rowsPerPage
  );

  const exportToCSV = () => {
    if (filteredClients.length > 0) {
      exportRecipients(filteredClients);
    }
  };

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete from database
      const { error } = await supabase
        .from('recipients')
        .delete()
        .eq('id', clientToDelete.id);

      if (error) {
        console.error('Delete error:', error);
        alert('Failed to delete. Please try again.');
        return;
      }

      // Update local state
      if (setRecipients) {
        setRecipients(prev => prev.filter(c => c.id !== clientToDelete.id));
      }
      if (onDeleteRecipient) {
        onDeleteRecipient(clientToDelete.id);
      }
      if (onRefresh) {
        onRefresh();
      }

      setShowDeleteModal(false);
      setClientToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecipientAdded = async (newRecipient) => {
    console.log('New client added:', newRecipient);
    setIsRefreshing(true);
    
    // Refresh recipients list from database
    if (onRefresh) {
      await onRefresh();
    } else if (setRecipients) {
      // Fallback: fetch directly
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('recipients')
            .select('*')
            .eq('user_id', user.id.toString());
          
          if (!error && data) {
            setRecipients(data.map(r => ({
              id: r.id,
              name: r.name,
              email: r.email,
              company: r.company,
              country: r.country,
              type: r.type,
              bank: r.bank_name,
              bankName: r.bank_name,
              accountNumber: r.account_number,
              zypUserId: r.zyp_user_id,
              platform_verified: r.platform_verified,
              verificationStatus: r.verification_status || 'verified'
            })));
          }
        }
      } catch (err) {
        console.error('Error refreshing recipients:', err);
      }
    }
    
    setIsRefreshing(false);
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronUp className="w-4 h-4 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-gray-800 min-h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Clients</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Find and manage your business clients
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUserSearch(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              <span>Find Clients</span>
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredClients.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export to CSV"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:outline-none focus:border-gray-200 dark:focus:border-gray-600"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:border-gray-200 dark:focus:border-gray-600"
          >
            <option value="all">All Types</option>
            <option value="business">Business</option>
            <option value="individual">Individual</option>
          </select>
        </div>

        {/* Loading State */}
        {isRefreshing && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-500 dark:text-gray-400" />
            <span className="ml-2 text-gray-500 dark:text-gray-400">Refreshing...</span>
          </div>
        )}

        {/* Empty State */}
        {!isRefreshing && usClients.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8 md:p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              Find businesses on the Zyp platform to send them invoices and receive payments.
            </p>
            <button
              onClick={() => setShowUserSearch(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              Find Clients
            </button>
          </div>
        ) : !isRefreshing && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th 
                      className="p-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">Name <SortIcon column="name" /></div>
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Bank</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="p-4 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          {client.company && client.company !== client.name && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{client.company}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-gray-400">{client.email || '-'}</td>
                      <td className="p-4">
                        <span className="text-gray-900 dark:text-white">{client.bankName || client.bank || '-'}</span>
                      </td>
                      <td className="p-4">
                        {client.platform_verified || client.zypUserId ? (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 border border-emerald-200">
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteClick(client)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginatedClients.map((client) => (
                <div key={client.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.name}</p>
                        {client.email && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{client.email}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {(client.bankName || client.bank) && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-200 text-blue-700">
                              {client.bankName || client.bank}
                            </span>
                          )}
                          {client.platform_verified || client.zypUserId ? (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 border border-emerald-200">
                              Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(client)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-200 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredClients.length)} of {filteredClients.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* User Search Modal */}
        <UserSearchModal
          isOpen={showUserSearch}
          onClose={() => setShowUserSearch(false)}
          userData={userData}
          onRecipientAdded={handleRecipientAdded}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteModal && clientToDelete && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Delete Client</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                  </div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
                  <p className="font-medium">{clientToDelete.name}</p>
                  {clientToDelete.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{clientToDelete.email}</p>
                  )}
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Are you sure you want to delete this client? 
                  This will remove them from your list permanently.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setClientToDelete(null);
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 bg-red-1000 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientsView;
