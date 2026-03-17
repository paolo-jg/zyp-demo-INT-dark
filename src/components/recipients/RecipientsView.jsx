import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Check, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Users, Building, User, MoreVertical, Download, Upload } from 'lucide-react';
import { ExportModal } from '../shared/UIComponents';
import { exportRecipients, exportRecipientsPDF } from '../../utils/exportUtils';
import { supabase } from '../../supabaseClient';
import { StyledCheckbox } from '../shared/StyledInputs';

function RecipientsView({ recipients, setRecipients, onAddRecipient, onUpdateRecipient, onDeleteRecipient }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryResults, setDirectoryResults] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [recipientToDelete, setRecipientToDelete] = useState(null);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [editingRecipient, setEditingRecipient] = useState(null);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    type: 'business', name: '', accountName: '', accountNumber: '', routingNumber: '',
    bankName: '', swiftCode: '', email: '', phone: '', country: 'Philippines',
    receivingCurrency: 'PHP', // PHP or USD - USD incurs $10 receiver fee
    verificationStatus: 'unverified', notes: '', tags: []
  });

  // Search PH directory using secure RPC function (limited fields for privacy)
  const searchDirectory = async (query) => {
    if (!query.trim()) {
      setDirectoryResults([]);
      return;
    }
    setDirectoryLoading(true);
    
    const { data, error } = await supabase
      .rpc('search_ph_directory', { search_query: query.trim() });
    
    if (error) {
      console.error('Directory search error:', error);
      setDirectoryResults([]);
    } else if (data) {
      // Filter out users already in recipient list by id
      const existingIds = recipients.map(r => r.zypUserId);
      const filtered = data.filter(d => !existingIds.includes(d.id));
      setDirectoryResults(filtered);
    }
    setDirectoryLoading(false);
  };

  // Add user from directory to recipient list
  const addFromDirectory = async (user) => {
    
    const displayName = user.account_type === 'business' 
      ? (user.business_name || `${user.first_name} ${user.last_name}`.trim())
      : `${user.first_name} ${user.last_name}`.trim();
    
    const result = await onAddRecipient({
      type: user.account_type || 'business',
      name: displayName,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      company: user.business_name || '',
      accountName: displayName,
      accountNumber: '',
      bankName: '',
      bank: '',
      swiftCode: '',
      email: '',
      phone: '',
      country: user.country || 'Philippines',
      receivingCurrency: 'PHP',
      verificationStatus: 'pending',
      notes: 'Added from Zyp directory',
      tags: [],
      zypUserId: user.id  // Store the actual Zyp user ID for transfers
    });
    
    
    if (result) {
      setShowDirectoryModal(false);
      setDirectorySearch('');
      setDirectoryResults([]);
    }
  };

  // Debounce directory search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showDirectoryModal) {
        searchDirectory(directorySearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [directorySearch, showDirectoryModal]);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const sortedRecipients = [...recipients].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    if (sortConfig.key === 'lastPayment') {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    }
    if (typeof aValue === 'string') { aValue = aValue.toLowerCase(); bValue = bValue.toLowerCase(); }
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredRecipients = sortedRecipients.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = r.name?.toLowerCase().includes(searchLower) ||
                         r.company?.toLowerCase().includes(searchLower) ||
                         r.email?.toLowerCase().includes(searchLower) ||
                         r.firstName?.toLowerCase().includes(searchLower) ||
                         r.lastName?.toLowerCase().includes(searchLower);
    const matchesType = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredRecipients.length / rowsPerPage);
  const paginatedRecipients = filteredRecipients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSelectAll = (e) => {
    setSelectedRecipients(e.target.checked ? paginatedRecipients.map(r => r.id) : []);
  };

  const handleSelectRecipient = (id) => {
    setSelectedRecipients(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedRecipients.length === 0) return;
    if (confirm(`Delete ${selectedRecipients.length} selected recipients?`)) {
      for (const id of selectedRecipients) {
        await onDeleteRecipient(id);
      }
      setSelectedRecipients([]);
    }
  };

  const exportToCSV = () => {
    const recipientsToExport = selectedRecipients.length > 0
      ? recipients.filter(r => selectedRecipients.includes(r.id))
      : filteredRecipients;

    const headers = 'type,name,accountName,accountNumber,routingNumber,bankName,swiftCode,email,country,lastPayment,verificationStatus,notes\n';
    const rows = recipientsToExport.map(r =>
      `${r.type},${r.name},${r.accountName},${r.accountNumber},${r.routingNumber || ''},${r.bankName || r.bank},${r.swiftCode || ''},${r.email},${r.country || ''},${r.lastPayment || ''},${r.verificationStatus},"${r.notes || ''}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const downloadCSVTemplate = () => {
    const template = 'type,name,accountName,accountNumber,routingNumber,bankName,swiftCode,email,country,lastPayment,verificationStatus,notes\nbusiness,Example Corp,Example Corp,1234567890,021000021,BDO,BNORPHMM,contact@example.com,Philippines,2025-11-15,verified,"Priority client"';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipient_template.csv';
    a.click();
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          await onAddRecipient({
            type: values[0] || 'business',
            name: values[1] || '',
            company: values[1] || '',
            accountName: values[2] || '',
            accountNumber: values[3] || '',
            routingNumber: values[4] || '',
            bankName: values[5] || '',
            bank: values[5] || '',
            swiftCode: values[6] || '',
            email: values[7] || '',
            phone: '',
            country: values[8] || 'Philippines',
            lastPayment: values[9] || null,
            verificationStatus: values[10] || 'unverified',
            notes: values[11] || '',
            tags: [],
            paymentHistory: []
          });
        }
      }
      setShowUploadModal(false);
    };
    reader.readAsText(file);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Required';
    if (!formData.accountName.trim()) errors.accountName = 'Required';
    if (!formData.accountNumber.trim()) errors.accountNumber = 'Required';
    if (formData.accountNumber && !/^\d{9,17}$/.test(formData.accountNumber)) errors.accountNumber = 'Must be 9-17 digits';
    if (!formData.bankName.trim()) errors.bankName = 'Required';
    if (!formData.email.trim()) errors.email = 'Required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddRecipient = async () => {
    if (!validateForm()) return;

    if (editingRecipient) {
      await onUpdateRecipient(editingRecipient.id, { ...formData, paymentHistory: editingRecipient.paymentHistory || [] });
    } else {
      await onAddRecipient({
        ...formData,
        company: formData.name,
        bank: formData.bankName,
        lastPayment: null,
        paymentHistory: []
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      type: 'business', name: '', accountName: '', accountNumber: '', routingNumber: '',
      bankName: '', swiftCode: '', email: '', phone: '', country: 'Philippines',
      receivingCurrency: 'PHP', verificationStatus: 'unverified', notes: '', tags: []
    });
    setValidationErrors({});
    setShowAddModal(false);
    setEditingRecipient(null);
  };

  const handleEdit = (recipient) => {
    setEditingRecipient(recipient);
    setFormData({ 
      ...recipient, 
      bankName: recipient.bankName || recipient.bank,
      receivingCurrency: recipient.receivingCurrency || recipient.receiving_currency || 'PHP'
    });
    setShowAddModal(true);
  };

  const handleDelete = (id) => {
    setRecipientToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    await onDeleteRecipient(recipientToDelete);
    setShowDeleteModal(false);
    setRecipientToDelete(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'bg-emerald-1000/20 text-emerald-700';
      case 'pending': return 'bg-yellow-1000/20 text-yellow-700';
      default: return 'bg-gray-50 dark:bg-gray-8000/20 text-gray-500 dark:text-gray-400';
    }
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronUp className="w-4 h-4 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Recipients</h1>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={exportToCSV}
              disabled={filteredRecipients.length === 0}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export to CSV"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-md hover:bg-white text-sm sm:text-base">
              <Upload className="w-5 h-5" /> <span className="hidden sm:inline">Bulk</span> Upload
            </button>
            <button onClick={() => setShowDirectoryModal(true)} className="hidden sm:flex items-center gap-2 px-4 py-2 border border-emerald-500 text-emerald-700 rounded-md hover:bg-emerald-200">
              <Search className="w-5 h-5" /> Search Directory
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-1000 text-white font-semibold rounded-lg hover:bg-emerald-50 dark:bg-emerald-900/300 text-sm sm:text-base">
              <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Add</span> Recipient
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, account, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="business">Business</option>
              <option value="individual">Individual</option>
            </select>
            {selectedRecipients.length > 0 && (
              <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-1000/20 text-red-700 rounded-lg hover:bg-red-1000/30 text-sm">
                <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete</span> ({selectedRecipients.length})
              </button>
            )}
          </div>
        </div>

        {/* Recipients Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-4 text-left">
                    <StyledCheckbox
                      checked={selectedRecipients.length === paginatedRecipients.length && paginatedRecipients.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Recipient <SortIcon column="name" /></div>
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer" onClick={() => handleSort('bankName')}>
                    <div className="flex items-center gap-1">Bank <SortIcon column="bankName" /></div>
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Account</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer" onClick={() => handleSort('lastPayment')}>
                    <div className="flex items-center gap-1">Last Payment <SortIcon column="lastPayment" /></div>
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecipients.map((recipient) => (
                  <tr key={recipient.id} className="border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-50/30">
                    <td className="px-6 py-4">
                      <StyledCheckbox
                        checked={selectedRecipients.includes(recipient.id)}
                        onChange={() => handleSelectRecipient(recipient.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-1000/20 flex items-center justify-center">
                          <span className="text-emerald-700 font-semibold">{recipient.name.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium">{recipient.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{recipient.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{recipient.bank || recipient.bankName}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">•••• {recipient.accountNumber.slice(-4)}</td>
                    <td className="px-6 py-4">
                      {recipient.lastPayment ? (
                        <button
                          onClick={() => { setSelectedRecipient(recipient); setShowPaymentHistoryModal(true); }}
                          className="text-gray-500 dark:text-gray-400 hover:text-emerald-700"
                        >
                          {recipient.lastPayment}
                        </button>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(recipient)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(recipient.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination - Desktop */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredRecipients.length)} of {filteredRecipients.length}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 p-4">
            {paginatedRecipients.map((recipient) => (
              <div key={recipient.id} className="bg-gray-50/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-1000/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 font-semibold">{recipient.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{recipient.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{recipient.email}</div>
                    </div>
                  </div>
                  <StyledCheckbox
                    checked={selectedRecipients.includes(recipient.id)}
                    onChange={() => handleSelectRecipient(recipient.id)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Bank</span>
                    <p className="text-gray-500 dark:text-gray-400 truncate">{recipient.bank || recipient.bankName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Account</span>
                    <p className="text-gray-500 dark:text-gray-400">•••• {recipient.accountNumber.slice(-4)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Last payment: </span>
                    {recipient.lastPayment ? (
                      <button
                        onClick={() => { setSelectedRecipient(recipient); setShowPaymentHistoryModal(true); }}
                        className="text-emerald-700"
                      >
                        {recipient.lastPayment}
                      </button>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Never</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(recipient)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-600 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(recipient.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-gray-600 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination - Mobile */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 disabled:opacity-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg sm:mx-4 border border-gray-200 dark:border-gray-700 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold">{editingRecipient ? 'Edit Recipient' : 'Add New Recipient'}</h2>
                <button onClick={resetForm} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="business">Business</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>

                {/* Receiving Currency Selection */}
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Receiving Currency *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, receivingCurrency: 'PHP'})}
                      className={`p-3 rounded-lg border-2 transition-all text-left${
                        formData.receivingCurrency === 'PHP'
                          ? 'border-emerald-500 bg-emerald-200'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 hover:border-gray-500 dark:hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">₱</span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">PHP</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">No extra fee</div>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, receivingCurrency: 'USD'})}
                      className={`p-3 rounded-lg border-2 transition-all text-left${
                        formData.receivingCurrency === 'USD'
                          ? 'border-emerald-500 bg-emerald-200'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 hover:border-gray-500 dark:hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">$</span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">USD</div>
                          <div className="text-xs text-yellow-700">+$10 fee</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">{formData.type === 'business' ? 'Company Name' : 'Full Name'} *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white${validationErrors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                  />
                  {validationErrors.name && <p className="text-red-700 text-xs mt-1">{validationErrors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Bank Name *</label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                      className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white${validationErrors.bankName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                    />
                    {validationErrors.bankName && <p className="text-red-700 text-xs mt-1">{validationErrors.bankName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">SWIFT Code</label>
                    <input
                      type="text"
                      value={formData.swiftCode}
                      onChange={(e) => setFormData({...formData, swiftCode: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Account Name *</label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                    className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white${validationErrors.accountName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                  />
                  {validationErrors.accountName && <p className="text-red-700 text-xs mt-1">{validationErrors.accountName}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Account Number *</label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                      className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white${validationErrors.accountNumber ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                    />
                    {validationErrors.accountNumber && <p className="text-red-700 text-xs mt-1">{validationErrors.accountNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Routing Number</label>
                    <input
                      type="text"
                      value={formData.routingNumber}
                      onChange={(e) => setFormData({...formData, routingNumber: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className={`w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white${validationErrors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                    />
                    {validationErrors.email && <p className="text-red-700 text-xs mt-1">{validationErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                <button onClick={resetForm} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-sm sm:text-base">Cancel</button>
                <button onClick={handleAddRecipient} className="px-4 py-2.5 bg-emerald-1000 text-white font-semibold rounded-lg hover:bg-emerald-50 dark:bg-emerald-900/300 text-sm sm:text-base">
                  {editingRecipient ? 'Update' : 'Add'} Recipient
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Directory Search Modal */}
        {showDirectoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 w-full max-w-2xl mx-2 border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
              <div className="flex items-start justify-between mb-4 sm:mb-6 gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold">Find Philippines Recipients</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Search for verified businesses and individuals</p>
                </div>
                <button onClick={() => { setShowDirectoryModal(false); setDirectorySearch(''); setDirectoryResults([]); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or business name..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  autoFocus
                  className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-[150px] sm:min-h-[200px]">
                {directoryLoading ? (
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : directoryResults.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {directoryResults.map((user) => {
                      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                      const displayName = user.account_type === 'business' && user.business_name
                        ? user.business_name
                        : fullName;
                      return (
                        <div key={user.id} className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-500/50 transition-colors">
                          <div className="flex items-start sm:items-center justify-between gap-3">
                            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0${user.account_type === 'individual' ? 'bg-purple-1000/20' : 'bg-emerald-1000/20'}`}>
                                <span className={`font-bold text-base sm:text-lg${user.account_type === 'individual' ? 'text-purple-700' : 'text-emerald-700'}`}>{displayName.charAt(0)}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{displayName}</h3>
                                  <span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs rounded-full capitalize flex-shrink-0${user.account_type === 'individual' ? 'bg-purple-1000/20 text-purple-700' : 'bg-blue-1000/20 text-blue-700'}`}>
                                    {user.account_type || 'business'}
                                  </span>
                                </div>
                                {/* Show full name if business has a different display name */}
                                {user.account_type === 'business' && user.business_name && fullName && (
                                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{fullName}</p>
                                )}
                                {/* Location */}
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  <span className="flex items-center gap-1"><span className="text-[10px] sm:text-xs font-medium bg-gray-600 px-1 sm:px-1.5 py-0.5 rounded">PH</span> Philippines</span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => addFromDirectory(user)}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-1000 text-white font-semibold rounded-lg hover:bg-emerald-50 dark:bg-emerald-900/300 flex items-center gap-1 sm:gap-2 text-sm flex-shrink-0"
                            >
                              <Plus className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Add</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : directorySearch ? (
                  <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
                    <Search className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm sm:text-base">No results found matching "{directorySearch}"</p>
                    <p className="text-xs sm:text-sm mt-1">Try a different search term or add manually</p>
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
                    <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm sm:text-base">Search for Philippines recipients</p>
                    <p className="text-xs sm:text-sm mt-1">Type a name or business name</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Bulk Upload Recipients</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><X className="w-6 h-6" /></button>
              </div>

              <div className="bg-blue-200 border border-blue-500/30 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-700 mb-2">Instructions</h3>
                <ol className="text-sm text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Download the CSV template below</li>
                  <li>Fill in your recipient information</li>
                  <li>Upload the completed CSV file</li>
                </ol>
              </div>

              <button onClick={downloadCSVTemplate} className="w-full p-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400 hover:border-emerald-500 hover:text-emerald-700 mb-4 flex items-center justify-center gap-2">
                <Download className="w-5 h-5" /> Download CSV Template
              </button>

              <label className="block w-full p-4 bg-emerald-1000 text-white font-semibold rounded-lg text-center cursor-pointer hover:bg-emerald-50 dark:bg-emerald-900/300">
                <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                <Upload className="w-5 h-5 inline mr-2" /> Upload CSV File
              </label>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-2">Delete Recipient</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Are you sure? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                <button onClick={confirmDelete} className="px-4 py-2 bg-red-1000 text-white font-semibold rounded-lg hover:bg-red-600">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Payment History Modal */}
        {showPaymentHistoryModal && selectedRecipient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">{selectedRecipient.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Payment History</p>
                </div>
                <button onClick={() => { setShowPaymentHistoryModal(false); setSelectedRecipient(null); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                {selectedRecipient.paymentHistory?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedRecipient.paymentHistory.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div>
                          <div className="font-medium">{new Date(payment.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{payment.status}</div>
                        </div>
                        <div className="text-lg font-bold">${payment.amount.toLocaleString()} {payment.currency}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">No payment history available</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export default RecipientsView;
