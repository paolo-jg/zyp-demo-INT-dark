/**
 * ContactsView - View and manage verified recipients
 * 
 * Recipients are verified through the Zyp platform.
 * Users can view, export, and delete recipients.
 */

import React, { useState } from 'react';
import { 
  Search, ChevronLeft, ChevronRight, 
  ChevronDown, ChevronUp, Users, Building2, User, Download, UserPlus, Trash2, X, AlertTriangle
} from 'lucide-react';
import { exportRecipients } from '../../utils/exportUtils';
import { UserSearchModal } from '../shared/UserSearchModal';
import { supabase } from '../../supabaseClient';

// Configuration for different contact types
const CONFIG = {
  recipients: {
    title: 'Recipients',
    singularTitle: 'Recipient',
    emptyMessage: 'No recipients yet. Find Philippines users on Zyp to send them payments.',
    searchTarget: 'Philippines'
  },
  clients: {
    title: 'Clients',
    singularTitle: 'Client',
    emptyMessage: 'No clients yet. Find US users on Zyp to receive payments from them.',
    searchTarget: 'US'
  }
};

function ContactsView({ 
  type = 'recipients',
  contacts = [],
  setContacts,
  userData,
  onRefresh,
  onDeleteRecipient
}) {
  const config = CONFIG[type] || CONFIG.recipients;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sorting
  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    if (sortConfig.key === 'lastPayment') {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    }
    if (typeof aValue === 'string') { 
      aValue = aValue.toLowerCase(); 
      bValue = bValue.toLowerCase(); 
    }
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredContacts = sortedContacts.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = c.name?.toLowerCase().includes(searchLower) ||
                         c.company?.toLowerCase().includes(searchLower) ||
                         c.email?.toLowerCase().includes(searchLower);
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredContacts.length / rowsPerPage);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * rowsPerPage, 
    currentPage * rowsPerPage
  );

  const exportToCSV = () => {
    if (filteredContacts.length > 0) {
      exportRecipients(filteredContacts);
    }
  };

  const handleDeleteClick = (contact) => {
    setContactToDelete(contact);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete from database
      const { error } = await supabase
        .from('recipients')
        .delete()
        .eq('id', contactToDelete.id);

      if (error) {
        console.error('Delete error:', error);
        alert('Failed to delete. Please try again.');
        return;
      }

      // Update local state
      if (setContacts) {
        setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
      }
      if (onDeleteRecipient) {
        onDeleteRecipient(contactToDelete.id);
      }
      if (onRefresh) {
        onRefresh();
      }

      setShowDeleteModal(false);
      setContactToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronUp className="w-4 h-4 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{config.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Manage your {config.singularTitle.toLowerCase()}s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUserSearch(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-1000 text-white font-semibold rounded-lg hover:bg-emerald-50 dark:bg-emerald-900/300 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Find {config.searchTarget} Users</span>
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredContacts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export to CSV"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="business">Business</option>
            <option value="individual">Individual</option>
          </select>
        </div>

        {/* Empty State */}
        {contacts.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8 md:p-12 text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <Users className="w-8 h-8 md:w-10 md:h-10 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold mb-2">No {config.singularTitle.toLowerCase()}s yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              {config.emptyMessage}
            </p>
            <button
              onClick={() => setShowUserSearch(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-1000 text-white font-semibold rounded-lg hover:bg-emerald-50 dark:bg-emerald-900/300 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Find {config.searchTarget} Users
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th 
                      className="p-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">Name <SortIcon column="name" /></div>
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Country</th>
                    <th className="p-4 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center${
                            contact.type === 'business' ? 'bg-blue-1000/20' : 'bg-purple-1000/20'
                          }`}>
                            {contact.type === 'business' ? (
                              <Building2 className="w-5 h-5 text-blue-700" />
                            ) : (
                              <User className="w-5 h-5 text-purple-700" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            {contact.company && contact.company !== contact.name && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{contact.company}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize${
                          contact.type === 'business' 
                            ? 'bg-blue-1000/20 text-blue-700' 
                            : 'bg-purple-1000/20 text-purple-700'
                        }`}>
                          {contact.type || 'business'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-gray-400">{contact.email || '-'}</td>
                      <td className="p-4 text-gray-500 dark:text-gray-400">{contact.country || '-'}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteClick(contact)}
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
              {paginatedContacts.map((contact) => (
                <div key={contact.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0${
                        contact.type === 'business' ? 'bg-blue-1000/20' : 'bg-purple-1000/20'
                      }`}>
                        {contact.type === 'business' ? (
                          <Building2 className="w-6 h-6 text-blue-700" />
                        ) : (
                          <User className="w-6 h-6 text-purple-700" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{contact.name}</p>
                        {contact.email && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{contact.email}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize${
                            contact.type === 'business' 
                              ? 'bg-blue-1000/20 text-blue-700' 
                              : 'bg-purple-1000/20 text-purple-700'
                          }`}>
                            {contact.type || 'business'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{contact.country}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(contact)}
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
                  Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredContacts.length)} of {filteredContacts.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white dark:bg-gray-900 rounded-lg disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white dark:bg-gray-900 rounded-lg disabled:opacity-50"
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
          onRecipientAdded={(newRecipient) => {
            console.log('New recipient added:', newRecipient);
            if (onRefresh) {
              onRefresh();
            }
          }}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteModal && contactToDelete && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-1000/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Delete {config.singularTitle}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                  </div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <p className="font-medium">{contactToDelete.name}</p>
                  {contactToDelete.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{contactToDelete.email}</p>
                  )}
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Are you sure you want to delete this {config.singularTitle.toLowerCase()}? 
                  This will remove them from your list permanently.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setContactToDelete(null);
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
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

export default ContactsView;
