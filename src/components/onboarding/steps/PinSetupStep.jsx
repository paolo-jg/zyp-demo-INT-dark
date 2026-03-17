/**
 * PinSetupStep - Step 4 of Onboarding
 * Set up transaction PIN for security
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';

export function PinSetupStep({ 
  onComplete, 
  onBack, 
  onNext,
  formData,
  setFormData,
  isLoading 
}) {
  const [pin, setPin] = useState(formData?.transactionPin || '');
  const [confirmPin, setConfirmPin] = useState(formData?.confirmPin || '');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [error, setError] = useState('');

  const handlePinChange = (value, isConfirm = false) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (isConfirm) {
      setConfirmPin(cleaned);
      if (setFormData) {
        setFormData(prev => ({ ...prev, confirmPin: cleaned }));
      }
    } else {
      setPin(cleaned);
      if (setFormData) {
        setFormData(prev => ({ ...prev, transactionPin: cleaned }));
      }
    }
    setError('');
  };

  const handleSubmit = () => {
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    // Check for weak PINs
    if (/^(\d)\1{3}$/.test(pin) || pin === '1234' || pin === '0000') {
      setError('Please choose a stronger PIN');
      return;
    }
    
    // Support both callback styles
    if (typeof onComplete === 'function') {
      onComplete(pin);
    } else if (typeof onNext === 'function') {
      // Store PIN in formData before proceeding
      if (setFormData) {
        setFormData(prev => ({ ...prev, transactionPin: pin, confirmPin: confirmPin }));
      }
      onNext();
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Set Transaction PIN</h1>
        <p className="text-gray-400">Create a 4-digit PIN for high-value transfers</p>
      </div>

      {/* Security Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
        <p className="text-blue-400 text-sm">
          Your PIN will be required for transfers over $1,000. Keep it secure and don't share it.
        </p>
      </div>

      <div className="space-y-4">
        {/* PIN Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Enter PIN</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="••••"
              maxLength={4}
              className="w-full pl-12 pr-12 py-4 text-center text-2xl tracking-[1em] bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Confirm PIN Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Confirm PIN</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type={showConfirmPin ? 'text' : 'password'}
              value={confirmPin}
              onChange={(e) => handlePinChange(e.target.value, true)}
              placeholder="••••"
              maxLength={4}
              className="w-full pl-12 pr-12 py-4 text-center text-2xl tracking-[1em] bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPin(!showConfirmPin)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* PIN Match Indicator */}
        {pin.length === 4 && confirmPin.length === 4 && !error && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <Shield className="w-4 h-4" />
            PINs match
          </div>
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
          onClick={handleSubmit}
          disabled={pin.length !== 4 || confirmPin.length !== 4 || isLoading}
          className={`${onBack ? 'flex-1' : 'w-full'} py-3 bg-emerald-500 text-gray-900 font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              Setting PIN...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
}

export default PinSetupStep;
