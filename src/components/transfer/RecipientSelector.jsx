/**
 * RecipientSelector - Step 1 of Transfer Flow
 * 
 * For US users: Only shows verified PH recipients, no manual add
 * For PH users: Can add new recipients (if allowAdd=true)
 */

import React, { useState } from 'react';
import { Search, Plus, Building, User, Check, X, Shield } from 'lucide-react';

export function RecipientSelector({ 
  recipients, 
  selectedRecipient, 
  onSelect, 
  onAddRecipient,
  searchQuery,
  setSearchQuery,
  allowAdd = true // Default true for backward compatibility
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    type: 'business',
    company: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bank: '',
    accountNumber: '',
    accountName: '',
    swiftCode: '',
    saveToList: true
  });

  const filteredRecipients = recipients.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleQuickAdd = async () => {
    if (!allowAdd || !onAddRecipient) return;
    if (!newRecipient.company && !newRecipient.firstName) return;
    
    const name = newRecipient.type === 'business' 
      ? newRecipient.company 
      : `${newRecipient.firstName} ${newRecipient.lastName}`.trim();

    const result = await onAddRecipient({
      ...newRecipient,
      name,
      bankName: newRecipient.bank,
      country: 'Philippines',
      receivingCurrency: 'PHP',
      verificationStatus: 'pending'
    });

    if (result) {
      onSelect(result);
      setShowAddModal(false);
      setNewRecipient({
        type: 'business', company: '', firstName: '', lastName: '',
        email: '', phone: '', bank: '', accountNumber: '', accountName: '', swiftCode: '', saveToList: true
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search verified recipients..."
          className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Add New Button - Only shown if allowAdd is true */}
      {allowAdd && onAddRecipient && (
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Recipient
        </button>
      )}

      {/* Recipients List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredRecipients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No recipients found' : (
              allowAdd ? 'No recipients yet' : 'No verified recipients available'
            )}
          </div>
        ) : (
          filteredRecipients.map((recipient) => (
            <button
              key={recipient.id}
              onClick={() => onSelect(recipient)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                selectedRecipient?.id === recipient.id
                  ? 'bg-emerald-500/20 border-emerald-500'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                recipient.type === 'business' ? 'bg-blue-500/20' : 'bg-purple-500/20'
              }`}>
                {recipient.type === 'business' ? (
                  <Building className="w-6 h-6 text-blue-400" />
                ) : (
                  <User className="w-6 h-6 text-purple-400" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{recipient.name}</p>
                  {recipient.verificationStatus === 'verified' && (
                    <Shield className="w-4 h-4 text-emerald-400" title="Verified" />
                  )}
                </div>
                <p className="text-sm text-gray-400">{recipient.email || recipient.bankName}</p>
              </div>
              {selectedRecipient?.id === recipient.id && (
                <Check className="w-5 h-5 text-emerald-400" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Quick Add Modal - Only shown if allowAdd is true */}
      {allowAdd && showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold">Quick Add Recipient</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Type Selection */}
              <div className="flex gap-4">
                <button
                  onClick={() => setNewRecipient({ ...newRecipient, type: 'business' })}
                  className={`flex-1 p-4 rounded-xl border ${
                    newRecipient.type === 'business'
                      ? 'bg-emerald-500/20 border-emerald-500'
                      : 'bg-gray-700 border-gray-600'
                  }`}
                >
                  <Building className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">Business</p>
                </button>
                <button
                  onClick={() => setNewRecipient({ ...newRecipient, type: 'individual' })}
                  className={`flex-1 p-4 rounded-xl border ${
                    newRecipient.type === 'individual'
                      ? 'bg-emerald-500/20 border-emerald-500'
                      : 'bg-gray-700 border-gray-600'
                  }`}
                >
                  <User className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">Individual</p>
                </button>
              </div>

              {/* Name Fields */}
              {newRecipient.type === 'business' ? (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Business Name *</label>
                  <input
                    type="text"
                    value={newRecipient.company}
                    onChange={(e) => setNewRecipient({ ...newRecipient, company: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl"
                    placeholder="Acme Corp"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={newRecipient.firstName}
                      onChange={(e) => setNewRecipient({ ...newRecipient, firstName: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={newRecipient.lastName}
                      onChange={(e) => setNewRecipient({ ...newRecipient, lastName: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl"
                  placeholder="recipient@example.com"
                />
              </div>

              {/* Bank Details */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={newRecipient.bank}
                  onChange={(e) => setNewRecipient({ ...newRecipient, bank: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl"
                  placeholder="BDO, BPI, etc."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Account Number</label>
                <input
                  type="text"
                  value={newRecipient.accountNumber}
                  onChange={(e) => setNewRecipient({ ...newRecipient, accountNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Account Name</label>
                <input
                  type="text"
                  value={newRecipient.accountName}
                  onChange={(e) => setNewRecipient({ ...newRecipient, accountName: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl"
                  placeholder="Name on account"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-600 rounded-xl hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAdd}
                disabled={!newRecipient.company && !newRecipient.firstName}
                className="flex-1 px-4 py-2 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50"
              >
                Add & Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipientSelector;
