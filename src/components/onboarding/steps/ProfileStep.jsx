/**
 * ProfileStep - Step 3 of Onboarding
 * Collects user profile information
 */

import React, { useState } from 'react';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const PHILIPPINE_BANKS = [
  'BDO Unibank', 'BPI (Bank of the Philippine Islands)', 'Metrobank',
  'Land Bank of the Philippines', 'PNB (Philippine National Bank)', 'UnionBank',
  'Security Bank', 'RCBC', 'China Bank', 'EastWest Bank', 'GCash', 'Maya (PayMaya)', 'Other'
];

export function ProfileStep({ 
  country, 
  accountType, 
  formData, 
  onChange,
  setFormData,
  errors, 
  onNext, 
  onBack,
  isLoading,
  showBanking
}) {
  // Support both onChange and setFormData props
  const updateFormData = (newData) => {
    if (typeof onChange === 'function') {
      onChange(newData);
    } else if (typeof setFormData === 'function') {
      setFormData(newData);
    }
  };

  // Get country from formData if not passed directly
  const effectiveCountry = country || formData?.country;
  const effectiveAccountType = accountType || formData?.accountType;
  
  const isUS = effectiveCountry === 'United States';
  const isBusiness = effectiveAccountType === 'business';

  const handleChange = (field, value) => {
    updateFormData({ ...formData, [field]: value });
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {isBusiness ? 'Business Details' : 'Personal Details'}
        </h1>
        <p className="text-gray-400">Tell us about {isBusiness ? 'your business' : 'yourself'}</p>
      </div>

      <div className="space-y-4">
        {/* Business Name (Business only) */}
        {isBusiness && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Business Name *</label>
            <input
              type="text"
              value={formData.businessName || ''}
              onChange={(e) => handleChange('businessName', e.target.value)}
              className={`w-full px-4 py-3 bg-gray-800 border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                errors?.businessName ? 'border-red-500' : 'border-gray-700'
              }`}
              placeholder="Acme BPO Services"
            />
            {errors?.businessName && (
              <p className="text-red-400 text-sm mt-1">{errors.businessName}</p>
            )}
          </div>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">First Name *</label>
            <input
              type="text"
              value={formData.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className={`w-full px-4 py-3 bg-gray-800 border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                errors?.firstName ? 'border-red-500' : 'border-gray-700'
              }`}
              placeholder="John"
            />
            {errors?.firstName && (
              <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
            <input
              type="text"
              value={formData.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className={`w-full px-4 py-3 bg-gray-800 border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                errors?.lastName ? 'border-red-500' : 'border-gray-700'
              }`}
              placeholder="Doe"
            />
            {errors?.lastName && (
              <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
            placeholder={isUS ? '+1 (555) 123-4567' : '+63 912 345 6789'}
          />
        </div>

        {/* Address (US only) */}
        {isUS && (
          <>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Street Address *</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-800 border rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                  errors?.address ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">City *</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-xl ${
                    errors?.city ? 'border-red-500' : 'border-gray-700'
                  }`}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">State *</label>
                <select
                  value={formData.state || ''}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-xl ${
                    errors?.state ? 'border-red-500' : 'border-gray-700'
                  }`}
                >
                  <option value="">Select</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">ZIP *</label>
                <input
                  type="text"
                  value={formData.zip || ''}
                  onChange={(e) => handleChange('zip', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-xl ${
                    errors?.zip ? 'border-red-500' : 'border-gray-700'
                  }`}
                  placeholder="12345"
                  maxLength={5}
                />
              </div>
            </div>
          </>
        )}

        {/* Bank Details (Philippines only) */}
        {!isUS && (
          <>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bank *</label>
              <select
                value={formData.bankName || ''}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-800 border rounded-xl ${
                  errors?.bankName ? 'border-red-500' : 'border-gray-700'
                }`}
              >
                <option value="">Select your bank</option>
                {PHILIPPINE_BANKS.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Account Name *</label>
              <input
                type="text"
                value={formData.accountName || ''}
                onChange={(e) => handleChange('accountName', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-800 border rounded-xl ${
                  errors?.accountName ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="Name on bank account"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Account Number *</label>
              <input
                type="text"
                value={formData.accountNumber || ''}
                onChange={(e) => handleChange('accountNumber', e.target.value)}
                className={`w-full px-4 py-3 bg-gray-800 border rounded-xl ${
                  errors?.accountNumber ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="1234567890"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-4 mt-8">
        {onBack && (
          <button
            onClick={onBack}
            disabled={isLoading}
            className="flex-1 py-3 border border-gray-600 rounded-xl hover:bg-gray-800 disabled:opacity-50"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={isLoading}
          className={`${onBack ? 'flex-1' : 'w-full'} py-3 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
}

export default ProfileStep;
