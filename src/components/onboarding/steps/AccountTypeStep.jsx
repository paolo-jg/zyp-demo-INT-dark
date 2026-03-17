/**
 * AccountTypeStep - Step 2 of Onboarding
 * Select account type (Business or Individual)
 */

import React from 'react';
import { Building, User, Check } from 'lucide-react';

export function AccountTypeStep({ accountType, onSelect, onNext, onBack }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Account Type</h1>
        <p className="text-gray-400">What type of account are you creating?</p>
      </div>

      <div className="space-y-4 mb-8">
        <button
          onClick={() => onSelect('business')}
          className={`w-full flex items-center gap-4 p-6 rounded-xl border transition-all ${
            accountType === 'business'
              ? 'bg-emerald-500/20 border-emerald-500'
              : 'bg-gray-800 border-gray-700 hover:border-gray-600'
          }`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            accountType === 'business' ? 'bg-emerald-500/30' : 'bg-gray-700'
          }`}>
            <Building className={`w-7 h-7 ${accountType === 'business' ? 'text-emerald-400' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-lg">Business</p>
            <p className="text-sm text-gray-400">BPO firms, agencies, and companies</p>
          </div>
          {accountType === 'business' && (
            <Check className="w-6 h-6 text-emerald-400" />
          )}
        </button>

        <button
          onClick={() => onSelect('individual')}
          className={`w-full flex items-center gap-4 p-6 rounded-xl border transition-all ${
            accountType === 'individual'
              ? 'bg-emerald-500/20 border-emerald-500'
              : 'bg-gray-800 border-gray-700 hover:border-gray-600'
          }`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            accountType === 'individual' ? 'bg-emerald-500/30' : 'bg-gray-700'
          }`}>
            <User className={`w-7 h-7 ${accountType === 'individual' ? 'text-emerald-400' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-lg">Individual</p>
            <p className="text-sm text-gray-400">Freelancers and contractors</p>
          </div>
          {accountType === 'individual' && (
            <Check className="w-6 h-6 text-emerald-400" />
          )}
        </button>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-600 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!accountType}
          className="flex-1 py-3 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default AccountTypeStep;
