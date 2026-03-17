/**
 * useZypSearch Hook
 * Handles internal search functionality for the Zyp platform
 * - Search verified users (directory)
 * - Search verified recipients
 * - Lookup invoices by Zyp ID
 * - Check EarlyPay eligibility
 */

import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { secureError } from '../utils/secureLogging';

export function useZypSearch(userData) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  /**
   * Get the target country for cross-border search
   * US users search for Philippines users, Philippines users search for US users
   */
  const getTargetCountry = useCallback(() => {
    const userCountry = userData?.country || '';
    if (userCountry === 'United States' || userCountry === 'USA' || userCountry === 'US') {
      return 'Philippines';
    } else if (userCountry === 'Philippines' || userCountry === 'PH') {
      return 'United States';
    }
    return null; // Unknown country
  }, [userData]);

  /**
   * Search for cross-border partners (main search function)
   * US users find Philippines users, Philippines users find US users
   * Uses the database function that auto-detects caller's country
   */
  const searchCrossBorderUsers = useCallback(async (query, limit = 20) => {
    setLoading(true);
    setError(null);

    try {
      // Try the auto cross-border function first
      const { data, error: rpcError } = await supabase.rpc('search_cross_border_users', {
        search_query: query || '',
        result_limit: limit
      });

      if (rpcError) {
        // Fall back to manual country detection
        const targetCountry = getTargetCountry();
        if (!targetCountry) {
          setError('Unable to determine your country for search');
          setLoading(false);
          return [];
        }

        const { data: fallbackData, error: fallbackError } = await supabase.rpc('search_verified_users', {
          search_query: query || '',
          search_country: targetCountry,
          result_limit: limit
        });

        if (fallbackError) {
          secureError('Search users error:', fallbackError);
          setError(fallbackError.message);
          return [];
        }

        setSearchResults(fallbackData || []);
        return fallbackData || [];
      }

      setSearchResults(data || []);
      return data || [];
    } catch (err) {
      secureError('Search users exception:', err);
      setError('Failed to search users');
      return [];
    } finally {
      setLoading(false);
    }
  }, [getTargetCountry]);

  /**
   * Search verified users in the platform directory
   * @param {string} query - Search query (name, business name, email)
   * @param {string|null} country - Optional country filter
   * @param {number} limit - Maximum results (default 20)
   */
  const searchVerifiedUsers = useCallback(async (query, country = null, limit = 20) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('search_verified_users', {
        search_query: query || '',
        search_country: country,
        result_limit: limit
      });

      if (rpcError) {
        secureError('Search users error:', rpcError);
        setError(rpcError.message);
        return [];
      }

      return data || [];
    } catch (err) {
      secureError('Search users exception:', err);
      setError('Failed to search users');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Search verified recipients for the current user
   * @param {string} userId - Current user's ID
   * @param {string} query - Search query
   * @param {string} country - Target country (default Philippines)
   */
  const searchVerifiedRecipients = useCallback(async (userId, query = '', country = 'Philippines') => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('search_verified_recipients', {
        p_user_id: userId,
        search_query: query,
        target_country: country
      });

      if (rpcError) {
        secureError('Search recipients error:', rpcError);
        setError(rpcError.message);
        return [];
      }

      return data || [];
    } catch (err) {
      secureError('Search recipients exception:', err);
      setError('Failed to search recipients');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Lookup an invoice by its Zyp ID
   * @param {string} zypId - The Zyp ID (e.g., ZYP-202601-000001)
   */
  const lookupByZypId = useCallback(async (zypId) => {
    if (!zypId || !zypId.startsWith('ZYP-')) {
      setError('Invalid Zyp ID format');
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('lookup_invoice_by_zyp_id', {
        p_zyp_id: zypId
      });

      if (rpcError) {
        secureError('Zyp ID lookup error:', rpcError);
        setError(rpcError.message);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      secureError('Zyp ID lookup exception:', err);
      setError('Failed to lookup Zyp ID');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if an invoice is eligible for EarlyPay
   * @param {string} zypId - The Zyp ID
   */
  const checkEarlyPayEligibility = useCallback(async (zypId) => {
    if (!zypId) {
      return { eligible: false, reason: 'No Zyp ID provided' };
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('check_earlypay_eligibility', {
        p_zyp_id: zypId
      });

      if (rpcError) {
        secureError('EarlyPay check error:', rpcError);
        setError(rpcError.message);
        return { eligible: false, reason: 'Error checking eligibility' };
      }

      return data || { eligible: false, reason: 'Unknown error' };
    } catch (err) {
      secureError('EarlyPay check exception:', err);
      setError('Failed to check eligibility');
      return { eligible: false, reason: 'System error' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Admin lookup - requires admin role
   * @param {string} zypId - The Zyp ID
   */
  const adminLookup = useCallback(async (zypId) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_lookup_zyp_id', {
        p_zyp_id: zypId
      });

      if (rpcError) {
        secureError('Admin lookup error:', rpcError);
        setError(rpcError.message);
        return null;
      }

      return data;
    } catch (err) {
      secureError('Admin lookup exception:', err);
      setError('Failed to perform admin lookup');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    searchResults,
    searchCrossBorderUsers,
    searchVerifiedUsers,
    searchVerifiedRecipients,
    lookupByZypId,
    checkEarlyPayEligibility,
    adminLookup,
    getTargetCountry,
    clearError: () => setError(null),
    clearResults: () => setSearchResults([])
  };
}

export default useZypSearch;
