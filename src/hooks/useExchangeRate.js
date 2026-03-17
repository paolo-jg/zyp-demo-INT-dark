/**
 * useExchangeRate Hook
 * Fetches real-time exchange rates from the API
 * 
 * CRITICAL: No hardcoded fallback rates. If we can't get a rate,
 * we block the transaction to prevent users from losing money.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { secureError } from '../utils/secureLogging';

const REFRESH_INTERVAL = 60000; // Refresh every 60 seconds
const RATE_EXPIRY = 120000; // Consider rate stale after 2 minutes

export function useExchangeRate(fromCurrency = 'USD', toCurrency = 'PHP') {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [source, setSource] = useState(null);
  const mountedRef = useRef(true);

  const fetchRate = useCallback(async () => {
    try {
      if (!mountedRef.current) return;
      
      setLoading(true);
      setError(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Try edge function first
      if (supabaseUrl) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/get-exchange-rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_currency: fromCurrency, to_currency: toCurrency }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.rate && typeof data.rate === 'number' && data.rate > 0) {
              if (mountedRef.current) {
                setRate(data.rate);
                setSource(data.source || 'api');
                setLastUpdated(Date.now());
                setError(null);
                setLoading(false);
              }
              return;
            }
          }
        } catch (e) {
          // Edge function failed, try fallback
        }
      }

      // Fallback: Direct Coins.ph API
      try {
        const coinsResponse = await fetch('https://api.pro.coins.ph/openapi/quote/v1/ticker/price?symbol=USDCPHP');
        const coinsData = await coinsResponse.json();
        if (coinsData.price && parseFloat(coinsData.price) > 0) {
          if (mountedRef.current) {
            setRate(parseFloat(coinsData.price));
            setSource('coins.ph');
            setLastUpdated(Date.now());
            setError(null);
            setLoading(false);
          }
          return;
        }
      } catch (e) {
        // Coins.ph also failed
      }

      // CRITICAL: If we get here, no rate was available
      // DO NOT set a hardcoded fallback - this is intentional
      if (mountedRef.current) {
        setError('Unable to fetch exchange rate. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      secureError('Exchange rate fetch failed:', err);
      if (mountedRef.current) {
        setError('Unable to fetch exchange rate. Please try again.');
        setLoading(false);
      }
    }
  }, [fromCurrency, toCurrency]);

  useEffect(() => {
    mountedRef.current = true;
    fetchRate();
    
    const interval = setInterval(fetchRate, REFRESH_INTERVAL);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchRate]);

  // Check if rate is stale
  const isStale = lastUpdated && (Date.now() - lastUpdated > RATE_EXPIRY);

  // Helper to check if we can proceed with a transaction
  const canProceed = rate !== null && !isStale && !error;

  return {
    rate,
    loading,
    error,
    source,
    lastUpdated,
    isStale,
    canProceed,
    refresh: fetchRate,
  };
}

/**
 * Calculate transfer amounts with proper fee handling
 * Returns null if exchange rate is not available - NEVER uses fallback
 */
export function calculateTransferAmounts(sendAmount, exchangeRate, feePercentage = 0.5) {
  if (!exchangeRate || exchangeRate <= 0) {
    return null; // Cannot calculate without valid rate
  }

  const amount = parseFloat(sendAmount);
  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  const fee = amount * (feePercentage / 100);
  const amountAfterFee = amount - fee;
  const receiveAmount = amountAfterFee * exchangeRate;

  return {
    sendAmount: amount,
    fee: Math.round(fee * 100) / 100,
    feePercentage,
    amountAfterFee: Math.round(amountAfterFee * 100) / 100,
    exchangeRate,
    receiveAmount: Math.round(receiveAmount * 100) / 100,
  };
}

export default useExchangeRate;
