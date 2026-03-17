/**
 * UserSearchModal - Search for other Zyp platform users
 * US users find PH users, PH users find US users
 */

import React, { useState, useEffect } from 'react';
import { X, Search, User, Building2, Mail, MapPin, Loader2, CheckCircle, UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';

// Confirmation Modal Component
function ConfirmAddRecipientModal({ isOpen, onClose, onConfirm, user, isLoading, error }) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-7 h-7 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Recipient</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add this user to your recipients list</p>
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="p-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-200 rounded-lg flex items-center justify-center flex-shrink-0">
                {user.account_type === 'business' ? (
                  <Building2 className="w-6 h-6 text-emerald-700" />
                ) : (
                  <User className="w-6 h-6 text-emerald-700" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                  {user.display_name || user.business_name || 'Unknown'}
                </div>
                {user.business_name && user.display_name !== user.business_name && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user.business_name}
                  </div>
                )}
                {user.email && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </div>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {user.country}
                </div>
              </div>
            </div>
          </div>

          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Once added, you'll be able to send payments to this recipient directly through Zyp.
          </p>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-200 border border-red-300 rounded-lg text-red-700 text-sm mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(user)}
              disabled={isLoading}
              className="flex-1 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Add Recipient
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Success Modal Component
function SuccessModal({ isOpen, onClose, user }) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-700" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Recipient Added!</h2>
          <p className="text-gray-500 mb-6">
            <span className="text-gray-900 dark:text-white font-medium">{user.display_name || user.business_name}</span> has been added to your recipients. You can now send them payments through Zyp.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function UserSearchModal({ isOpen, onClose, onSelectUser, userData, onRecipientAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Confirmation flow state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  // Determine target country based on user's country
  const getTargetCountry = () => {
    const userCountry = userData?.country || '';
    if (userCountry === 'United States' || userCountry === 'USA' || userCountry === 'US') {
      return 'Philippines';
    } else if (userCountry === 'Philippines' || userCountry === 'PH') {
      return 'United States';
    }
    return null;
  };

  const targetCountry = getTargetCountry();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Try cross-border search first
      let { data, error: rpcError } = await supabase.rpc('search_cross_border_users', {
        search_query: searchQuery.trim(),
        result_limit: 20
      });

      // Fallback to regular search with country filter
      if (rpcError) {
        console.log('Falling back to search_verified_users');
        const fallbackResult = await supabase.rpc('search_verified_users', {
          search_query: searchQuery.trim(),
          search_country: targetCountry,
          result_limit: 20
        });
        data = fallbackResult.data;
        rpcError = fallbackResult.error;
      }

      if (rpcError) {
        console.error('Search error:', rpcError);
        setError(rpcError.message || 'Search failed');
        setResults([]);
      } else {
        setResults(data || []);
        if (data?.length === 0) {
          setError('No users found matching your search');
        }
      }
    } catch (err) {
      console.error('Search exception:', err);
      setError('Failed to search. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle user selection - show confirmation modal
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setAddError(null);
    setShowConfirmModal(true);
  };

  // Handle confirm add recipient
  const handleConfirmAdd = async (user) => {
    setIsAdding(true);
    setAddError(null);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('Not authenticated');
      }

      // Check if recipient already exists (don't use .single() as it throws on no match)
      const { data: existingRecipients, error: checkError } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', authUser.id.toString())
        .eq('zyp_user_id', user.id);

      if (checkError) {
        console.error('Check error:', checkError);
        // Continue anyway - might just be an RLS issue
      }

      if (existingRecipients && existingRecipients.length > 0) {
        setAddError('This user is already in your recipients list');
        setIsAdding(false);
        return;
      }

      // Add the recipient
      const { data: newRecipient, error: insertError } = await supabase
        .from('recipients')
        .insert({
          user_id: authUser.id.toString(),
          zyp_user_id: user.id,  // The actual Zyp platform user ID for cross-user invoice visibility
          name: user.display_name || user.business_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
          email: user.email || '',
          company: user.business_name || '',
          country: user.country || 'Unknown',
          type: user.account_type || 'business',
          platform_verified: true,
          verification_date: new Date().toISOString(),
          verification_status: 'verified'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(insertError.message || 'Failed to add recipient');
      }

      console.log('Recipient added successfully:', newRecipient);

      // Success!
      setShowConfirmModal(false);
      setShowSuccessModal(true);

      // Notify parent component to refresh
      if (onRecipientAdded) {
        onRecipientAdded(newRecipient);
      }

    } catch (err) {
      console.error('Add recipient error:', err);
      setAddError(err.message || 'Failed to add recipient. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  // Handle success modal close
  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setSelectedUser(null);
    // Trigger refresh again on close
    if (onRecipientAdded) {
      onRecipientAdded(null);
    }
    onClose();
  };

  // Search on Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear results when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      setError(null);
      setHasSearched(false);
      setSelectedUser(null);
      setShowConfirmModal(false);
      setShowSuccessModal(false);
      setAddError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Find Zyp Users</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Search for businesses to use Zyp
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name, business name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-gray-300 dark:focus:border-gray-500"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto p-4">
            {error && !showConfirmModal && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>{error}</p>
              </div>
            )}

            {!hasSearched && !error && (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-gray-500 dark:text-gray-400">Enter a name, business name, or email to search</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-3">
                {results.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-emerald-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        {user.account_type === 'business' ? (
                          <Building2 className="w-6 h-6 text-emerald-700" />
                        ) : (
                          <User className="w-6 h-6 text-emerald-700" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                          {user.display_name || user.business_name || 'Unknown'}
                        </div>
                        {user.business_name && user.display_name !== user.business_name && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {user.business_name}
                          </div>
                        )}
                        {user.email && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        )}
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {user.country}
                        </div>
                      </div>
                      <div className="text-emerald-700 text-sm flex items-center gap-1">
                        <UserPlus className="w-4 h-4" />
                        Add
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasSearched && !loading && results.length === 0 && !error && (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-gray-500 dark:text-gray-400">No users found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmAddRecipientModal
        isOpen={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setAddError(null); }}
        onConfirm={handleConfirmAdd}
        user={selectedUser}
        isLoading={isAdding}
        error={addError}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        user={selectedUser}
      />
    </>
  );
}

export default UserSearchModal;
