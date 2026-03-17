import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Loader, XCircle, Building, Shield, CheckCircle } from 'lucide-react';
import { secureLog, secureError } from '../../utils/secureLogging';

// Global flag to track if we're linking (survives component re-mounts)
let isCurrentlyLinking = false;
let linkingBankName = '';

/**
 * PlaidBankLink Component - Uses Plaid script directly
 * Returns Plaid tokens immediately on success, backend calls handled by parent
 */
const PlaidBankLink = ({ 
  supabase,
  onComplete, 
  onError,
  onSkip
}) => {
  const [status, setStatus] = useState(isCurrentlyLinking ? 'linking' : 'loading');
  const [linkToken, setLinkToken] = useState(null);
  const [error, setError] = useState(null);
  const plaidHandlerRef = useRef(null);

  // Load Plaid script
  useEffect(() => {
    if (document.getElementById('plaid-link-script')) return;
    
    const script = document.createElement('script');
    script.id = 'plaid-link-script';
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Fetch link token on mount (skip if already linking)
  useEffect(() => {
    if (isCurrentlyLinking) {
      setStatus('linking');
      return;
    }
    
    const fetchLinkToken = async () => {
      try {
        console.log('Fetching Plaid link token...');
        const { data, error } = await supabase.functions.invoke('get-plaid-link-token', {
          body: {}
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.success && data.plaid_link_token) {
          setLinkToken(data.plaid_link_token);
          setStatus('ready');
        } else {
          throw new Error(data.error || 'Failed to get link token');
        }
      } catch (err) {
        secureError('Failed to get Plaid link token:', err);
        setError(err.message);
        setStatus('error');
        if (onError) onError(err);
      }
    };

    fetchLinkToken();
  }, [supabase, onError]);

  // Open Plaid Link
  const openPlaid = useCallback(() => {
    if (!linkToken || !window.Plaid) {
      console.error('Plaid not ready');
      return;
    }

    const handler = window.Plaid.create({
      token: linkToken,
      onSuccess: (publicToken, metadata) => {
        console.log('=== PLAID onSuccess ===');
        
        // Set global flag BEFORE calling onComplete
        isCurrentlyLinking = true;
        linkingBankName = metadata.institution?.name || 'your bank';
        setStatus('linking');
        
        // Return tokens to parent
        if (onComplete) {
          onComplete({
            publicToken,
            accountId: metadata.accounts[0]?.id,
            accountName: metadata.accounts[0]?.name || 'Checking',
            institutionName: metadata.institution?.name || 'Bank'
          });
        }
      },
      onExit: (err, metadata) => {
        console.log('=== PLAID onExit ===');
        if (err) secureError('Plaid error:', err);
      },
      onEvent: (eventName, metadata) => {
        console.log('=== PLAID onEvent ===', eventName);
      },
    });

    plaidHandlerRef.current = handler;
    handler.open();
  }, [linkToken, onComplete]);

  // Linking state
  if (status === 'linking') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
            <Loader className="w-4 h-4 text-emerald-500 animate-spin" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Connecting {linkingBankName}</h3>
        <p className="text-gray-400 text-center max-w-md">
          Securely linking your account. This will only take a moment...
        </p>
        <div className="mt-6 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-400">Preparing bank connection...</p>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Connection Issue</h3>
        <p className="text-gray-400 text-center mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setStatus('ready');
          }}
          className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Ready state
  const isReady = linkToken && typeof window !== 'undefined' && window.Plaid;
  
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
        <Building className="w-8 h-8 text-emerald-500" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Connect Your Bank</h3>
      <p className="text-gray-400 text-center mb-6 max-w-md">
        Securely connect your bank account to send payments. We use Plaid to ensure your credentials are never shared with us.
      </p>
      <button
        onClick={openPlaid}
        disabled={!isReady}
        className={`px-8 py-3 font-semibold rounded-xl transition-colors ${
          isReady
            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isReady ? 'Connect Bank Account' : 'Loading...'}
      </button>
      <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
        <Shield className="w-4 h-4" />
        <span>Bank-level security by Plaid</span>
      </div>
    </div>
  );
};

// Reset the global flag (call this when onboarding completes or modal closes)
export const resetPlaidLinkingState = () => {
  isCurrentlyLinking = false;
  linkingBankName = '';
};

/**
 * PlaidBankLinkModal
 */
export const PlaidBankLinkModal = ({ 
  isOpen, 
  supabase,
  onComplete, 
  onSkip
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-lg w-full border border-gray-700 overflow-hidden">
        <PlaidBankLink
          supabase={supabase}
          onComplete={onComplete}
          onSkip={onSkip}
          onError={(error) => {
            secureError('Plaid error:', error);
          }}
        />
      </div>
    </div>
  );
};

export default PlaidBankLink;
