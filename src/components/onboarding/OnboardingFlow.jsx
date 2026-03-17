import React, { useState, useEffect } from 'react';
import { Users, User, Check, Shield } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { sanitizeForDB, checkRateLimit } from '../../utils/validators';
import { secureLog, secureError } from '../../utils/secureLogging';
import { startUSOnboarding } from '../../utils/cybrid';
import { PersonaVerificationModal } from '../verification/PersonaVerification';
import { PlaidBankLinkModal, resetPlaidLinkingState } from '../verification/PlaidLink';

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: 'US' },
  { code: 'PH', name: 'Philippines', flag: 'PH' }
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const PHILIPPINE_BANKS = [
  'BDO Unibank',
  'BPI (Bank of the Philippine Islands)',
  'Metrobank',
  'Land Bank of the Philippines',
  'PNB (Philippine National Bank)',
  'UnionBank',
  'Security Bank',
  'RCBC',
  'China Bank',
  'EastWest Bank',
  'GCash',
  'Maya (PayMaya)',
  'Other'
];

const PHILIPPINE_PROVINCES = [
  { name: 'Metro Manila (NCR)', code: '00' },
  { name: 'Abra', code: 'ABR' },
  { name: 'Agusan del Norte', code: 'AGN' },
  { name: 'Agusan del Sur', code: 'AGS' },
  { name: 'Aklan', code: 'AKL' },
  { name: 'Albay', code: 'ALB' },
  { name: 'Antique', code: 'ANT' },
  { name: 'Apayao', code: 'APA' },
  { name: 'Aurora', code: 'AUR' },
  { name: 'Basilan', code: 'BAS' },
  { name: 'Bataan', code: 'BAN' },
  { name: 'Batanes', code: 'BTN' },
  { name: 'Batangas', code: 'BTG' },
  { name: 'Benguet', code: 'BEN' },
  { name: 'Biliran', code: 'BIL' },
  { name: 'Bohol', code: 'BOH' },
  { name: 'Bukidnon', code: 'BUK' },
  { name: 'Bulacan', code: 'BUL' },
  { name: 'Cagayan', code: 'CAG' },
  { name: 'Camarines Norte', code: 'CAN' },
  { name: 'Camarines Sur', code: 'CAS' },
  { name: 'Camiguin', code: 'CAM' },
  { name: 'Capiz', code: 'CAP' },
  { name: 'Catanduanes', code: 'CAT' },
  { name: 'Cavite', code: 'CAV' },
  { name: 'Cebu', code: 'CEB' },
  { name: 'Cotabato', code: 'NCO' },
  { name: 'Davao de Oro', code: 'COM' },
  { name: 'Davao del Norte', code: 'DAV' },
  { name: 'Davao del Sur', code: 'DAS' },
  { name: 'Davao Occidental', code: 'DVO' },
  { name: 'Davao Oriental', code: 'DAO' },
  { name: 'Dinagat Islands', code: 'DIN' },
  { name: 'Eastern Samar', code: 'EAS' },
  { name: 'Guimaras', code: 'GUI' },
  { name: 'Ifugao', code: 'IFU' },
  { name: 'Ilocos Norte', code: 'ILN' },
  { name: 'Ilocos Sur', code: 'ILS' },
  { name: 'Iloilo', code: 'ILI' },
  { name: 'Isabela', code: 'ISA' },
  { name: 'Kalinga', code: 'KAL' },
  { name: 'La Union', code: 'LUN' },
  { name: 'Laguna', code: 'LAG' },
  { name: 'Lanao del Norte', code: 'LAN' },
  { name: 'Lanao del Sur', code: 'LAS' },
  { name: 'Leyte', code: 'LEY' },
  { name: 'Maguindanao', code: 'MAG' },
  { name: 'Marinduque', code: 'MAD' },
  { name: 'Masbate', code: 'MAS' },
  { name: 'Misamis Occidental', code: 'MSC' },
  { name: 'Misamis Oriental', code: 'MSR' },
  { name: 'Mountain Province', code: 'MOU' },
  { name: 'Negros Occidental', code: 'NEC' },
  { name: 'Negros Oriental', code: 'NER' },
  { name: 'Northern Samar', code: 'NSA' },
  { name: 'Nueva Ecija', code: 'NUE' },
  { name: 'Nueva Vizcaya', code: 'NUV' },
  { name: 'Occidental Mindoro', code: 'MDC' },
  { name: 'Oriental Mindoro', code: 'MDR' },
  { name: 'Palawan', code: 'PLW' },
  { name: 'Pampanga', code: 'PAM' },
  { name: 'Pangasinan', code: 'PAN' },
  { name: 'Quezon', code: 'QUE' },
  { name: 'Quirino', code: 'QUI' },
  { name: 'Rizal', code: 'RIZ' },
  { name: 'Romblon', code: 'ROM' },
  { name: 'Samar', code: 'WSA' },
  { name: 'Sarangani', code: 'SAR' },
  { name: 'Siquijor', code: 'SIG' },
  { name: 'Sorsogon', code: 'SOR' },
  { name: 'South Cotabato', code: 'SCO' },
  { name: 'Southern Leyte', code: 'SLE' },
  { name: 'Sultan Kudarat', code: 'SUK' },
  { name: 'Sulu', code: 'SLU' },
  { name: 'Surigao del Norte', code: 'SUN' },
  { name: 'Surigao del Sur', code: 'SUR' },
  { name: 'Tarlac', code: 'TAR' },
  { name: 'Tawi-Tawi', code: 'TAW' },
  { name: 'Zambales', code: 'ZMB' },
  { name: 'Zamboanga del Norte', code: 'ZAN' },
  { name: 'Zamboanga del Sur', code: 'ZAS' },
  { name: 'Zamboanga Sibugay', code: 'ZSI' }
];

const VOLUME_OPTIONS = [
  { value: 'under_10k', label: 'Under $10,000' },
  { value: '10k_50k', label: '$10,000 - $50,000' },
  { value: '50k_100k', label: '$50,000 - $100,000' },
  { value: '100k_500k', label: '$100,000 - $500,000' },
  { value: '500k_1m', label: '$500,000 - $1,000,000' },
  { value: 'over_1m', label: 'Over $1,000,000' }
];

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [personaInquiryId, setPersonaInquiryId] = useState(null);
  const [showPlaidModal, setShowPlaidModal] = useState(false);
  const [isLinkingBank, setIsLinkingBank] = useState(false);
  const [formData, setFormData] = useState({
    accountType: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    businessName: '',
    country: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    dateOfBirth: '', // Required for Philippines individual counterparties
    receivingCurrency: '', // PHP or USD for Philippine users
    bankName: '',
    accountName: '',
    accountNumber: '',
    swiftCode: '',
    monthlyVolume: ''
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check user's verification status on mount
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setIsCheckingStatus(false);
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('country, kyc_status, kyc_inquiry_id, plaid_linked, onboarding_completed')
          .eq('id', authUser.id)
          .single();

        if (!userData) {
          setIsCheckingStatus(false);
          return;
        }

        // If US user with incomplete KYC, show Persona
        if (userData.country === 'United States' && 
            userData.kyc_status !== 'completed' && 
            userData.kyc_inquiry_id) {
          setPersonaInquiryId(userData.kyc_inquiry_id);
          setShowPersonaModal(true);
          setFormData(prev => ({ ...prev, country: 'United States' }));
        }
        // If US user with completed KYC but no Plaid, show Plaid
        else if (userData.country === 'United States' && 
                 userData.kyc_status === 'completed' && 
                 !userData.plaid_linked) {
          setShowPlaidModal(true);
          setFormData(prev => ({ ...prev, country: 'United States' }));
        }
        
        setIsCheckingStatus(false);
      } catch (error) {
        secureError('Error checking user status:', error);
        setIsCheckingStatus(false);
      }
    };

    checkUserStatus();
  }, []);

  const needsBanking = formData.country === 'Philippines';
  const needsAddress = formData.country === 'United States' || formData.country === 'Philippines';
  const totalSteps = formData.country === 'Philippines' ? 6 : 5;

  const getStepContent = () => {
    if (step === 1) return 'accountType';
    if (step === 2) return 'name';
    if (step === 3) return 'country';
    
    // Philippines flow: country → address → banking → volume
    if (formData.country === 'Philippines') {
      if (step === 4) return 'address';
      if (step === 5) return 'banking';
      if (step === 6) return 'volume';
    }
    
    // US flow: country → address → volume (no PIN)
    if (formData.country === 'United States') {
      if (step === 4) return 'address';
      if (step === 5) return 'volume';
    }
    
    return 'volume';
  };

  const currentContent = getStepContent();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!checkRateLimit('onboarding')) {
        alert('Too many attempts. Please wait a few minutes and try again.');
        setIsSubmitting(false);
        return;
      }
      
      secureLog('Submitting onboarding for user');
      
      const { data, error } = await supabase
        .from('users')
        .update({
          account_type: sanitizeForDB(formData.accountType),
          first_name: sanitizeForDB(formData.firstName),
          last_name: sanitizeForDB(formData.lastName),
          business_name: formData.businessName ? sanitizeForDB(formData.businessName) : null,
          country: sanitizeForDB(formData.country),
          address: formData.address ? sanitizeForDB(formData.address) : null,
          city: formData.city ? sanitizeForDB(formData.city) : null,
          state: formData.state ? sanitizeForDB(formData.state) : null,
          zip: formData.zip ? sanitizeForDB(formData.zip) : null,
          date_of_birth: formData.dateOfBirth ? formData.dateOfBirth : null,
          receiving_currency: formData.receivingCurrency ? sanitizeForDB(formData.receivingCurrency) : null,
          bank_name: formData.bankName ? sanitizeForDB(formData.bankName) : null,
          account_name: formData.accountName ? sanitizeForDB(formData.accountName) : null,
          account_number: formData.accountNumber ? sanitizeForDB(formData.accountNumber) : null,
          swift_code: formData.swiftCode ? sanitizeForDB(formData.swiftCode) : null,
          monthly_volume: sanitizeForDB(formData.monthlyVolume),
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();
      
      secureLog('Update completed', { success: !error });
      
      if (error) {
        secureError('Error updating user during onboarding:', error);
        alert('Failed to save your information. Please try again or contact support.');
        setIsSubmitting(false);
        return;
      }
      
      const { data: verifyUser } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();
      
      secureLog('Verification check completed');
      
      if (!verifyUser?.onboarding_completed) {
        secureError('Update did not persist - possible RLS issue');
        alert('Your changes were not saved. Please contact support.');
        setIsSubmitting(false);
        return;
      }

      if (formData.country === 'United States') {
        secureLog('Creating Cybrid customer for US user');
        const cybridResult = await startUSOnboarding(supabase);
        if (!cybridResult.success) {
          secureError('Cybrid onboarding failed:', { error: cybridResult.error });
          setIsSubmitting(false);
          alert('Unable to set up your account. Please try again or contact support.');
          return;
        }
        
        secureLog('US Cybrid onboarding started');
        if (cybridResult.inquiry_id) {
          setPersonaInquiryId(cybridResult.inquiry_id);
          setShowPersonaModal(true);
          setIsSubmitting(false);
          return;
        } else {
          setIsSubmitting(false);
          alert('Unable to start identity verification. Please try again or contact support.');
          return;
        }
      } else {
        // Philippines user - create counterparty in Cybrid
        secureLog('Creating Cybrid counterparty for Philippines user');
        
        const { data: counterpartyData, error: counterpartyError } = await supabase.functions.invoke('create-counterparty', {
          body: {
            type: formData.accountType === 'business' ? 'business' : 'individual',
            firstName: formData.firstName,
            lastName: formData.lastName,
            businessName: formData.businessName || null,
            dateOfBirth: formData.dateOfBirth || null,
            address: {
              street: formData.address,
              city: formData.city,
              subdivision: formData.state,
              postalCode: formData.zip,
              countryCode: 'PH'
            }
          }
        });

        if (counterpartyError || !counterpartyData?.success) {
          secureError('Counterparty creation failed:', counterpartyError || counterpartyData?.error);
          // Don't block onboarding - counterparty can be created later
          secureLog('Continuing with onboarding despite counterparty error');
        } else {
          secureLog('Counterparty created successfully', { guid: counterpartyData.counterparty_guid });
        }

        onComplete();
      }
    } catch (error) {
      secureError('Error saving onboarding:', error);
      alert('An error occurred. Please try again or contact support.');
    }
    setIsSubmitting(false);
  };

  const canProceed = () => {
    switch (currentContent) {
      case 'accountType': return formData.accountType !== '';
      case 'name': return formData.firstName && formData.lastName && (formData.accountType === 'individual' || formData.businessName);
      case 'country': return formData.country !== '';
      case 'banking': return formData.receivingCurrency && formData.bankName && formData.accountName && formData.accountNumber;
      case 'address': {
        const baseValid = formData.address && formData.city && formData.state && formData.zip;
        // Philippines individuals also need date of birth
        if (formData.country === 'Philippines' && formData.accountType === 'individual') {
          return baseValid && formData.dateOfBirth;
        }
        return baseValid;
      }
      case 'volume': return formData.monthlyVolume !== '';
      default: return false;
    }
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handlePersonaComplete = async ({ inquiryId, status }) => {
    secureLog('Persona verification complete', { status });
    setShowPersonaModal(false);
    
    try {
      await supabase
        .from('users')
        .update({ kyc_status: 'completed' })
        .eq('id', user.id);
    } catch (err) {
      secureError('Failed to update KYC status:', err);
    }
    
    setShowPlaidModal(true);
  };

  const handlePersonaCancel = () => {
    secureLog('User cancelled Persona verification');
    setShowPersonaModal(false);
    alert('Identity verification is required to send payments. Please complete verification to continue.');
    setTimeout(() => setShowPersonaModal(true), 100);
  };

  const handlePlaidComplete = async ({ publicToken, accountId, accountName, institutionName }) => {
    secureLog('Plaid completed, processing...');
    
    // Close modal immediately, show full-screen loading
    setShowPlaidModal(false);
    setIsLinkingBank(true);
    
    try {
      // Step 1: Link the bank account to Cybrid
      console.log('Linking bank account...');
      const { data: linkData, error: linkError } = await supabase.functions.invoke('link-bank-account', {
        body: {
          plaid_public_token: publicToken,
          plaid_account_id: accountId,
          account_name: `${institutionName} - ${accountName}`
        }
      });
      
      if (linkError || !linkData?.success) {
        secureError('Failed to link bank account:', linkError || linkData?.error);
        setIsLinkingBank(false);
        alert('Unable to link bank account. Please try again or contact support.');
        setShowPlaidModal(true);
        return;
      }
      
      secureLog('Bank account linked');
      
      // Step 2: Create fiat account
      console.log('Creating fiat account...');
      const { data, error } = await supabase.functions.invoke('create-fiat-account-us', {
        body: {}
      });
      
      if (error || !data?.success) {
        secureError('Failed to create fiat account:', error || data?.error);
        setIsLinkingBank(false);
        alert('Unable to complete account setup. Please try again or contact support.');
        return;
      }
      
      secureLog('Fiat account created');
      setIsLinkingBank(false);
      resetPlaidLinkingState();
      onComplete();
      
    } catch (err) {
      secureError('Failed during account setup:', err);
      setIsLinkingBank(false);
      alert('Unable to complete account setup. Please try again or contact support.');
    }
  };

  const handlePlaidSkip = () => {
    secureLog('User cancelled Plaid bank linking');
    alert('Linking a bank account is required to send payments. Please connect a bank account to continue.');
  };

  const isLastStep = step === totalSteps;

  // Show loading while checking user status
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <PersonaVerificationModal
        isOpen={showPersonaModal}
        inquiryId={personaInquiryId}
        onComplete={handlePersonaComplete}
        onCancel={handlePersonaCancel}
        environmentId="env_sandbox"
      />
      
      <PlaidBankLinkModal
        isOpen={showPlaidModal}
        supabase={supabase}
        onComplete={handlePlaidComplete}
        onSkip={handlePlaidSkip}
      />
      
      {/* Loading overlay for bank linking */}
      {isLinkingBank && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold text-lg">Connecting your bank...</p>
            <p className="text-gray-400 text-sm mt-2">Securely linking your account. This will only take a moment.</p>
          </div>
        </div>
      )}
      
      {/* Loading overlay for final account setup */}
      {isSubmitting && !showPlaidModal && !showPersonaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Setting up your account...</p>
            <p className="text-gray-400 text-sm mt-2">This will only take a moment</p>
          </div>
        </div>
      )}
      
      <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-gray-800">
        <img src="/zyp-logo.svg" alt="Zyp" className="h-8 md:h-10" />
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
          <span className="hidden sm:inline">Step {step} of {totalSteps}</span>
          <span className="sm:hidden">{step}/{totalSteps}</span>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`w-6 md:w-8 h-1 rounded-full ${s <= step ? 'bg-emerald-500' : 'bg-gray-700'}`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-6 md:py-12">
        <div className="w-full max-w-lg">
          
          {/* Step 1: Account Type */}
          {currentContent === 'accountType' && (
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Welcome to Zyp!</h1>
              <p className="text-gray-400 mb-6 md:mb-8 text-sm md:text-base">Let's get your account set up. Are you a business or individual?</p>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button
                  onClick={() => setFormData({ ...formData, accountType: 'business' })}
                  className={`p-4 md:p-6 rounded-2xl border-2 transition-all ${
                    formData.accountType === 'business'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <Users className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-white mb-1">Business</h3>
                  <p className="text-xs md:text-sm text-gray-400">Company or organization</p>
                </button>
                
                <button
                  onClick={() => setFormData({ ...formData, accountType: 'individual' })}
                  className={`p-4 md:p-6 rounded-2xl border-2 transition-all ${
                    formData.accountType === 'individual'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <User className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-white mb-1">Individual</h3>
                  <p className="text-sm text-gray-400">Personal account</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Name & Business Name */}
          {currentContent === 'name' && (
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">Tell us about yourself</h1>
              <p className="text-gray-400 mb-6 md:mb-8 text-center text-sm md:text-base">
                {formData.accountType === 'business' ? 'Your name and business details' : 'Your personal information'}
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">First Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`w-full px-4 py-3 bg-gray-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        !formData.firstName && formData.lastName ? 'border-red-500' : 'border-gray-700'
                      }`}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Last Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className={`w-full px-4 py-3 bg-gray-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        !formData.lastName && formData.firstName ? 'border-red-500' : 'border-gray-700'
                      }`}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                
                {formData.accountType === 'business' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Business Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Business name"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Country */}
          {currentContent === 'country' && (
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">Where are you located?</h1>
              <p className="text-gray-400 mb-6 md:mb-8 text-center text-sm md:text-base">Select your primary country of operation</p>
              
              <div className="space-y-4">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => setFormData({ ...formData, country: country.name })}
                    className={`w-full p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                      formData.country === country.name
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-2xl font-bold text-gray-400">{country.flag}</span>
                    <div>
                      <span className="text-white font-semibold text-lg">{country.name}</span>
                      {country.code === 'PH' && (
                        <p className="text-sm text-gray-400">Receive payments from US businesses</p>
                      )}
                      {country.code === 'US' && (
                        <p className="text-sm text-gray-400">Send payments to the Philippines</p>
                      )}
                    </div>
                    {formData.country === country.name && (
                      <Check className="w-6 h-6 text-emerald-400 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Address (for both US and Philippines) */}
          {currentContent === 'address' && (
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">
                {formData.accountType === 'business' ? 'Business Address' : 'Home Address'}
              </h1>
              <p className="text-gray-400 mb-6 md:mb-8 text-center text-sm md:text-base">
                {formData.accountType === 'business' ? 'Your registered business address' : 'Your residential address'}
              </p>
              
              <div className="space-y-4">
                {/* Street Address - same for both */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {formData.country === 'Philippines' ? 'Street Address / Barangay' : 'Street Address'}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={formData.country === 'Philippines' ? '123 Rizal St, Brgy. San Antonio' : '123 Main St, Suite 100'}
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {formData.country === 'Philippines' ? 'City / Municipality' : 'City'}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={formData.country === 'Philippines' ? 'Makati City' : 'New York'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* State/Province */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {formData.country === 'Philippines' ? 'Province' : 'State'}
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select {formData.country === 'Philippines' ? 'province' : 'state'}</option>
                      {formData.country === 'Philippines' 
                        ? PHILIPPINE_PROVINCES.map((province) => (
                            <option key={province.code} value={province.code}>{province.name}</option>
                          ))
                        : US_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))
                      }
                    </select>
                  </div>
                  
                  {/* ZIP/Postal Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {formData.country === 'Philippines' ? 'Postal Code' : 'ZIP Code'}
                    </label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={formData.country === 'Philippines' ? '1200' : '10001'}
                    />
                  </div>
                </div>

                {/* Date of Birth - Required for Philippines individual users for counterparty compliance */}
                {formData.country === 'Philippines' && formData.accountType === 'individual' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Date of Birth <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">Required for compliance verification</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5 (Philippines): Banking Details */}
          {currentContent === 'banking' && (
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">Banking Details</h1>
              <p className="text-gray-400 mb-6 md:mb-8 text-center text-sm md:text-base">Where should we send your payments?</p>
              
              <div className="space-y-4">
                {/* Receiving Currency Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Receiving Currency <span className="text-red-400">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">Will you receive funds in a USD or PHP bank account?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, receivingCurrency: 'PHP' })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        formData.receivingCurrency === 'PHP'
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">₱</span>
                        <div>
                          <div className="font-semibold text-white">PHP Account</div>
                          <div className="text-xs text-gray-400">Philippine Peso</div>
                        </div>
                      </div>
                      {formData.receivingCurrency === 'PHP' && (
                        <div className="mt-2 text-xs text-emerald-400">✓ No additional fees</div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, receivingCurrency: 'USD' })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        formData.receivingCurrency === 'USD'
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">$</span>
                        <div>
                          <div className="font-semibold text-white">USD Account</div>
                          <div className="text-xs text-gray-400">US Dollar</div>
                        </div>
                      </div>
                      {formData.receivingCurrency === 'USD' && (
                        <div className="mt-2 text-xs text-yellow-400">$10 receiver fee per transfer</div>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Bank</label>
                  <select
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select your bank</option>
                    {PHILIPPINE_BANKS.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Account Name</label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="As shown on your bank account"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Your bank account number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">SWIFT Code <span className="text-gray-500">(optional)</span></label>
                  <input
                    type="text"
                    value={formData.swiftCode}
                    onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., BNORPHMM"
                  />
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <p className="text-sm text-blue-400">
                    Your banking information is encrypted and stored securely. We'll use these details to send your payments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Last Step: Monthly Volume */}
          {currentContent === 'volume' && (
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">Expected monthly volume</h1>
              <p className="text-gray-400 mb-6 md:mb-8 text-center text-sm md:text-base">How much do you expect to transfer each month?</p>
              
              <div className="space-y-3">
                {VOLUME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, monthlyVolume: option.value })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      formData.monthlyVolume === option.value
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-white font-medium">{option.label}</span>
                    {formData.monthlyVolume === option.value && (
                      <Check className="w-5 h-5 text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            
            {!isLastStep ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`px-6 md:px-8 py-3 rounded-xl font-semibold transition-colors ${
                  canProceed()
                    ? 'bg-emerald-500 text-gray-900 hover:bg-emerald-400'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className={`px-6 md:px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                  canProceed() && !isSubmitting
                    ? 'bg-emerald-500 text-gray-900 hover:bg-emerald-400'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Get Started'
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
