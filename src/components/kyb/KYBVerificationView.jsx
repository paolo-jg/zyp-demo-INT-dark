import React, { useState } from 'react';
import { Shield, Building, Check, Upload, Loader, AlertTriangle, ChevronLeft, ChevronRight, FileText, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../../supabaseClient';

function KYBVerificationView({ userData, onVerificationComplete, onNavigate }) {
  const [step, setStep] = useState('intro'); // intro, collecting, verifying, complete, failed
  const [isLoading, setIsLoading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    legalName: userData?.business_name || '',
    dba: '',
    ein: '',
    businessType: 'llc',
    incorporationState: '',
    incorporationDate: '',
    website: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  });

  const businessTypes = [
    { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
    { value: 'llc', label: 'LLC' },
    { value: 'corporation', label: 'Corporation' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'nonprofit', label: 'Non-Profit' }
  ];

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];

  const handleStartVerification = async () => {
    setIsLoading(true);
    
    // TODO: Call Cybrid API to create customer and start Persona KYB
    // const response = await fetch('/api/cybrid/create-customer', {
    //   method: 'POST',
    //   body: JSON.stringify(businessInfo)
    // });
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 2000));
    
    setStep('verifying');
    setIsLoading(false);
    
    // In production, this will open Persona's verification flow
    // For now, simulate completion after a delay
    setTimeout(() => {
      setStep('complete');
      onVerificationComplete?.();
    }, 3000);
  };

  if (step === 'intro') {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Business Verification Required</h1>
            <p className="text-gray-400 text-lg">
              To send payments, we need to verify your business identity. This helps us comply with financial regulations and keep your transactions secure.
            </p>
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-6">
            <h2 className="text-lg font-semibold mb-4">What you'll need:</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-medium">Business Information</p>
                  <p className="text-sm text-gray-400">Legal name, EIN, address, and business type</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-medium">Owner/Officer Information</p>
                  <p className="text-sm text-gray-400">Name, date of birth, and SSN for beneficial owners</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-medium">Government-Issued ID</p>
                  <p className="text-sm text-gray-400">Driver's license or passport for identity verification</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-400">Takes about 5-10 minutes</p>
                <p className="text-sm text-gray-400">Most businesses are verified instantly. Some may require additional review.</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('collecting')}
            className="w-full py-4 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
          >
            Start Verification
          </button>
        </div>
      </div>
    );
  }

  if (step === 'collecting') {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setStep('intro')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <h1 className="text-3xl font-bold mb-2">Business Information</h1>
          <p className="text-gray-400 mb-8">Please provide your business details for verification.</p>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Legal Business Name</label>
                <input
                  type="text"
                  value={businessInfo.legalName}
                  onChange={(e) => setBusinessInfo({...businessInfo, legalName: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">DBA (Doing Business As) - Optional</label>
                <input
                  type="text"
                  value={businessInfo.dba}
                  onChange={(e) => setBusinessInfo({...businessInfo, dba: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                  placeholder="Acme Co"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">EIN (Tax ID)</label>
                <input
                  type="text"
                  value={businessInfo.ein}
                  onChange={(e) => setBusinessInfo({...businessInfo, ein: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                  placeholder="XX-XXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Type</label>
                <select
                  value={businessInfo.businessType}
                  onChange={(e) => setBusinessInfo({...businessInfo, businessType: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                >
                  {businessTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">State of Incorporation</label>
                <select
                  value={businessInfo.incorporationState}
                  onChange={(e) => setBusinessInfo({...businessInfo, incorporationState: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                >
                  <option value="">Select state</option>
                  {usStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date of Incorporation</label>
                <input
                  type="date"
                  value={businessInfo.incorporationDate}
                  onChange={(e) => setBusinessInfo({...businessInfo, incorporationDate: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Website - Optional</label>
                <input
                  type="url"
                  value={businessInfo.website}
                  onChange={(e) => setBusinessInfo({...businessInfo, website: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                  placeholder="https://example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Description</label>
                <textarea
                  value={businessInfo.description}
                  onChange={(e) => setBusinessInfo({...businessInfo, description: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white resize-none"
                  rows={3}
                  placeholder="Briefly describe what your business does..."
                />
              </div>
              
              <div className="col-span-2 border-t border-gray-700 pt-6 mt-2">
                <h3 className="text-lg font-semibold mb-4">Business Address</h3>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={businessInfo.address}
                  onChange={(e) => setBusinessInfo({...businessInfo, address: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={businessInfo.city}
                  onChange={(e) => setBusinessInfo({...businessInfo, city: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                  placeholder="New York"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                  <select
                    value={businessInfo.state}
                    onChange={(e) => setBusinessInfo({...businessInfo, state: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                  >
                    <option value="">Select</option>
                    {usStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={businessInfo.zip}
                    onChange={(e) => setBusinessInfo({...businessInfo, zip: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleStartVerification}
              disabled={isLoading || !businessInfo.legalName || !businessInfo.ein}
              className="w-full py-4 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Continue to Identity Verification
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verifying') {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader className="w-10 h-10 text-emerald-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Verifying Your Business</h1>
          <p className="text-gray-400 mb-8">
            Please complete the identity verification in the popup window. This usually takes just a few minutes.
          </p>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <p className="text-sm text-gray-400">
              Don't see the verification window? <button className="text-emerald-400 hover:underline">Click here to open it</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Verification Complete!</h1>
          <p className="text-gray-400 mb-8">
            Your business has been verified. You can now link a bank account and start sending payments.
          </p>
          <button
            onClick={() => onNavigate('bank-accounts')}
            className="w-full py-4 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 transition-colors"
          >
            Link Bank Account
          </button>
        </div>
      </div>
    );
  }

  if (step === 'failed') {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Verification Failed</h1>
          <p className="text-gray-400 mb-8">
            We couldn't verify your business at this time. Please contact support for assistance.
          </p>
          <button
            onClick={() => setStep('intro')}
            className="w-full py-4 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
}


export default KYBVerificationView;
