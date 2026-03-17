import React, { useState, useEffect } from 'react';
import { Loader, CheckCircle, XCircle, Shield, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { secureLog, secureError } from '../../utils/secureLogging';

const PersonaVerification = ({ inquiryId: initialInquiryId, onComplete, onError, onCancel, environmentId }) => {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [verificationStarted, setVerificationStarted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [inquiryId, setInquiryId] = useState(initialInquiryId);
  const [isGeneratingNew, setIsGeneratingNew] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollingRef = React.useRef(null);

  useEffect(() => {
    if (!inquiryId) {
      setError('No inquiry ID provided');
      setStatus('error');
      return;
    }
    
    // Check if user already has KYC in progress (returning user)
    const checkExistingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('kyc_status, kyc_inquiry_id')
            .eq('id', user.id)
            .single();
          
          // If they have an inquiry ID and status is in_progress, they've already started
          if (userData?.kyc_inquiry_id && userData?.kyc_status === 'in_progress') {
            setVerificationStarted(true);
          }
        }
      } catch (err) {
        secureError('Error checking KYC status:', err);
      }
      setStatus('ready');
    };
    
    checkExistingStatus();
  }, [inquiryId]);

  // Update local inquiry ID if prop changes
  useEffect(() => {
    if (initialInquiryId && initialInquiryId !== inquiryId) {
      setInquiryId(initialInquiryId);
    }
  }, [initialInquiryId]);

  const generateNewLink = async () => {
    setIsGeneratingNew(true);
    setError(null);
    
    try {
      secureLog('Generating new Persona verification link');
      
      const { data, error: fnError } = await supabase.functions.invoke('create-identity-verification', {
        body: {}
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success || !data.inquiry_id) {
        throw new Error(data.error || 'Failed to create new verification');
      }

      secureLog('New inquiry created', { inquiry_id: data.inquiry_id });
      setInquiryId(data.inquiry_id);
      setError(null);
    } catch (err) {
      secureError('Failed to generate new link:', err);
      setError('Failed to generate new verification link. You may need to start fresh.');
    } finally {
      setIsGeneratingNew(false);
    }
  };

  const startFresh = async () => {
    if (!confirm('This will reset your entire account setup. You will need to complete onboarding from the beginning. Continue?')) {
      return;
    }
    
    stopPolling();
    setIsGeneratingNew(true);
    setError(null);
    
    try {
      secureLog('Starting fresh - resetting all user onboarding data');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Reset ALL onboarding and Cybrid related fields
      const { error: updateError } = await supabase
        .from('users')
        .update({
          // Cybrid fields
          cybrid_customer_guid: null,
          cybrid_customer_state: null,
          cybrid_account_guid: null,
          cybrid_external_bank_account_guid: null,
          // KYC fields
          kyc_inquiry_id: null,
          kyc_status: null,
          // Plaid fields
          plaid_linked: false,
          // Onboarding fields
          onboarding_completed: false,
          account_type: null,
          country: null,
          address: null,
          city: null,
          state: null,
          zip: null,
          business_name: null,
          monthly_volume: null,
          transaction_pin: null
        })
        .eq('id', user.id);
      
      if (updateError) {
        throw new Error(updateError.message);
      }
      
      secureLog('User data fully reset, redirecting to start...');
      window.location.href = '/';
    } catch (err) {
      secureError('Failed to start fresh:', err);
      setError('Failed to reset account. Please try again or contact support.');
      setIsGeneratingNew(false);
    }
  };

  const checkKycStatus = async (isPollingCheck = false) => {
    if (!isPollingCheck) {
      setChecking(true);
    }
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-kyc-status', {
        body: {}
      });

      if (error) {
        secureError('Error checking KYC status:', error);
        if (!isPollingCheck) {
          setError('Failed to check verification status. Please try again.');
          setChecking(false);
        }
        return false;
      }

      if (data.kyc_status === 'completed') {
        setStatus('complete');
        stopPolling();
        if (onComplete) {
          onComplete({ inquiryId, status: 'completed' });
        }
        return true;
      } else if (data.kyc_status === 'failed') {
        setError('Verification failed. Please try again or contact support.');
        setStatus('error');
        stopPolling();
        return false;
      } else {
        // Still in progress, keep polling
        setChecking(false);
        return false;
      }
    } catch (err) {
      secureError('Failed to check KYC status:', err);
      if (!isPollingCheck) {
        setError('Failed to check verification status. Please try again.');
        setChecking(false);
      }
      return false;
    }
  };

  const startPolling = () => {
    if (pollingRef.current) return; // Already polling
    
    setIsPolling(true);
    setPollCount(0);
    setError(null);
    
    // Check immediately
    checkKycStatus(true);
    
    // Then check every 10 seconds
    pollingRef.current = setInterval(async () => {
      setPollCount(prev => prev + 1);
      const completed = await checkKycStatus(true);
      
      if (completed) {
        stopPolling();
      }
    }, 10000); // 10 seconds
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  };

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-400">Loading verification...</p>
      </div>
    );
  }

  if (status === 'error' && !verificationStarted) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Verification Error</h3>
        <p className="text-gray-400 text-center mb-4">{error}</p>
        <button
          onClick={startFresh}
          disabled={isGeneratingNew}
          className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isGeneratingNew ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Reset & Start Over
            </>
          )}
        </button>
      </div>
    );
  }

  if (status === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Verification Complete</h3>
        <p className="text-gray-400 text-center mb-4">Your identity has been verified successfully.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  const verifyUrl = 'https://withpersona.com/verify?inquiry-id=' + inquiryId;

  if (verificationStarted) {
    const openVerificationPage = () => {
      window.open('https://withpersona.com/verify?inquiry-id=' + inquiryId, '_blank');
    };

    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
          <ExternalLink className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Complete Verification</h3>
        <p className="text-gray-400 text-center mb-6 max-w-md">
          Click below to open the verification page. Once done, click "I've Completed Verification".
        </p>
        
        {error && !isPolling && <p className="text-red-400 text-center mb-4 text-sm">{error}</p>}
        
        {isPolling && (
          <p className="text-yellow-400 text-center mb-4 text-sm">
            Verifying your identity... This usually takes 1-3 minutes.
          </p>
        )}
        
        {/* Open Verification Page - TOP (green, primary action) */}
        <button
          onClick={openVerificationPage}
          disabled={isPolling}
          className="px-8 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors mb-4 flex items-center gap-2 disabled:opacity-50"
        >
          <ExternalLink className="w-5 h-5" />
          Open Verification Page
        </button>
        
        {/* I've Completed Verification - MIDDLE */}
        {isPolling ? (
          <div className="px-6 py-3 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-xl flex items-center gap-3 mb-4">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Checking status{pollCount > 0 ? ` (${pollCount})` : ''}...</span>
          </div>
        ) : (
          <button
            onClick={startPolling}
            disabled={checking}
            className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mb-4"
          >
            {checking ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Checking...
              </>
            ) : (
              "I've Completed Verification"
            )}
          </button>
        )}
        
        {/* Reset & Start Over - BOTTOM (small text link) */}
        <button
          onClick={startFresh}
          disabled={isGeneratingNew || isPolling}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isGeneratingNew ? (
            <>
              <Loader className="w-3 h-3 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              Link expired? Reset & start over
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
        <Shield className="w-8 h-8 text-emerald-500" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Identity Verification Required</h3>
      <p className="text-gray-400 text-center mb-6 max-w-md">
        To comply with regulations, we need to verify your identity. This takes about 2 minutes and requires a valid government ID.
      </p>
      <a
        href={verifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setVerificationStarted(true)}
        className="px-8 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
      >
        Start Verification
      </a>
      <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
        <Shield className="w-4 h-4" />
        <span>Secured by Persona</span>
      </div>
    </div>
  );
};

export const PersonaVerificationModal = ({ isOpen, inquiryId, onComplete, onCancel, environmentId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-lg w-full border border-gray-700 overflow-hidden">
        <PersonaVerification
          inquiryId={inquiryId}
          environmentId={environmentId}
          onComplete={onComplete}
          onCancel={onCancel}
          onError={(error) => {
            secureError('Persona error:', error);
          }}
        />
      </div>
    </div>
  );
};

export default PersonaVerification;
