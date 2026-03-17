import React, { useState } from 'react';
import { Building, Plus, Check, Trash2, ChevronLeft, CreditCard, Shield, AlertTriangle, MoreVertical, Link } from 'lucide-react';
import { PlaidBankLinkModal } from '../verification/PlaidLink';

function BankAccountsView({ userData, linkedBanks, setLinkedBanks, onNavigate }) {
  const [isLinking, setIsLinking] = useState(false);
  const [showPlaidModal, setShowPlaidModal] = useState(false);

  const handleLinkBank = async () => {
    setShowPlaidModal(true);
    // TODO: Initialize Plaid Link
    // const linkToken = await fetch('/api/plaid/create-link-token').then(r => r.json());
    // Open Plaid Link modal
  };

  const handlePlaidSuccess = async (publicToken, metadata) => {
    setIsLinking(true);
    
    // TODO: Exchange public token and create external bank account in Cybrid
    // const response = await fetch('/api/plaid/exchange-token', {
    //   method: 'POST',
    //   body: JSON.stringify({ publicToken, metadata })
    // });

    // Simulate adding a bank
    const newBank = {
      id: Date.now().toString(),
      institution_name: 'Chase',
      account_name: 'Business Checking',
      account_mask: '4567',
      account_type: 'checking',
      status: 'verified',
      is_primary: linkedBanks.length === 0,
      verified_at: new Date().toISOString()
    };

    setLinkedBanks([...linkedBanks, newBank]);
    setShowPlaidModal(false);
    setIsLinking(false);
  };

  const handleSetPrimary = async (bankId) => {
    setLinkedBanks(linkedBanks.map(bank => ({
      ...bank,
      is_primary: bank.id === bankId
    })));
    
    // TODO: Update in Supabase
  };

  const handleRemoveBank = async (bankId) => {
    if (!confirm('Are you sure you want to remove this bank account?')) return;
    
    setLinkedBanks(linkedBanks.filter(b => b.id !== bankId));
    
    // TODO: Delete from Supabase and Cybrid
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Feature integration notice */}
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Bank Linking Coming Soon</p>
            <p className="text-yellow-400/70 text-sm mt-1">
              Bank account linking via Plaid is currently being integrated. For now, transfers use our managed settlement accounts.
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Bank Accounts</h1>
            <p className="text-gray-400 dark:text-gray-500 mt-1">Manage your linked bank accounts for transfers</p>
          </div>
          <button
            onClick={handleLinkBank}
            disabled={true}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-gray-400 dark:text-gray-500 font-semibold rounded-xl cursor-not-allowed transition-colors"
            title="Coming soon"
          >
            <Plus className="w-5 h-5" />
            Link Bank Account
          </button>
        </div>

        {linkedBanks.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-12 text-center">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building className="w-10 h-10 text-gray-500 dark:text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Bank Accounts Linked</h2>
            <p className="text-gray-400 dark:text-gray-500 mb-6 max-w-md mx-auto">
              Link a US bank account to fund your transfers. We use Plaid for secure, instant bank verification.
            </p>
            <button
              onClick={handleLinkBank}
              className="px-6 py-3 bg-emerald-500 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
            >
              Link Your First Bank Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {linkedBanks.map((bank) => (
              <div
                key={bank.id}
                className={`bg-gray-800 rounded-2xl border ${bank.is_primary ? 'border-emerald-500' : 'border-gray-700'} p-6`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
                      <Building className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{bank.institution_name}</h3>
                        {bank.is_primary && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 dark:text-gray-500">
                        {bank.account_name} •••• {bank.account_mask}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      bank.status === 'verified' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {bank.status === 'verified' ? 'Verified' : 'Pending'}
                    </span>
                    {!bank.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(bank.id)}
                        className="text-sm text-gray-400 dark:text-gray-500 hover:text-white transition-colors"
                      >
                        Set as Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveBank(bank.id)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-400">Bank-level Security</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Your bank credentials are never stored. We use Plaid's secure connection to verify your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plaid Link Modal Placeholder */}
        {showPlaidModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Link className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Connect Your Bank</h2>
                <p className="text-gray-400 dark:text-gray-500 mb-6">
                  You'll be redirected to Plaid to securely link your bank account.
                </p>
                
                {/* Simulate Plaid banks */}
                <div className="space-y-2 mb-6">
                  {['Chase', 'Bank of America', 'Wells Fargo', 'Citi'].map((bank) => (
                    <button
                      key={bank}
                      onClick={() => handlePlaidSuccess('test_token', { institution: { name: bank } })}
                      className="w-full p-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors text-left flex items-center gap-3"
                    >
                      <Building className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      {bank}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowPlaidModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export default BankAccountsView;
