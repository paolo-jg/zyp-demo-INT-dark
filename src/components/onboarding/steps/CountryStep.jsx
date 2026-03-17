/**
 * CountryStep - Step 1 of Onboarding
 * Select country (US or Philippines)
 */

import React from 'react';
import { Check } from 'lucide-react';

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' }
];

export function CountryStep({ selectedCountry, onSelect, onNext }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Zyp</h1>
        <p className="text-gray-400">Let's get your account set up</p>
      </div>

      <div className="mb-8">
        <label className="block text-sm text-gray-400 mb-3">Where are you located?</label>
        <div className="space-y-3">
          {COUNTRIES.map((country) => (
            <button
              key={country.code}
              onClick={() => onSelect(country.name)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                selectedCountry === country.name
                  ? 'bg-emerald-500/20 border-emerald-500'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <span className="text-3xl">{country.flag}</span>
              <span className="flex-1 text-left font-medium">{country.name}</span>
              {selectedCountry === country.name && (
                <Check className="w-5 h-5 text-emerald-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Country-specific info */}
      {selectedCountry === 'United States' && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <p className="text-blue-400 text-sm">
            <strong>US Users:</strong> You'll need to verify your identity and link a bank account to send payments.
          </p>
        </div>
      )}

      {selectedCountry === 'Philippines' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
          <p className="text-emerald-400 text-sm">
            <strong>PH Users:</strong> You'll receive payments from US businesses directly to your bank account.
          </p>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!selectedCountry}
        className="w-full py-3 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}

export default CountryStep;
