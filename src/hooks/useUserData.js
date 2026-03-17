/**
 * useUserData Hook
 * Handles user data syncing, profile updates, and onboarding state
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { sanitizeForDB } from '../utils/validators';
import { secureError } from '../utils/secureLogging';

export function useUserData(userId, userEmail) {
  const [userData, setUserData] = useState(null);
  const [userCountry, setUserCountry] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [linkedBanks, setLinkedBanks] = useState([]);

  const syncUserAndFetchData = useCallback(async () => {
    if (!userId) return { needsOnboarding: false };
    
    setIsLoading(true);
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!existingUser) {
        // New user - create record and show onboarding
        await supabase.from('users').insert({
          id: userId,
          email: userEmail || '',
          first_name: '',
          last_name: '',
          last_login: new Date().toISOString(),
          onboarding_completed: false
        });
        setNeedsOnboarding(true);
        setIsLoading(false);
        return { needsOnboarding: true };
      }

      // Check if onboarding completed
      if (!existingUser.onboarding_completed) {
        setNeedsOnboarding(true);
        setIsLoading(false);
        return { needsOnboarding: true };
      }

      // For US users, check if KYC is completed
      if (existingUser.country === 'United States' && existingUser.kyc_status !== 'completed') {
        setNeedsOnboarding(true);
        setIsLoading(false);
        return { needsOnboarding: true };
      }

      // For US users, check if Plaid bank is linked
      if (existingUser.country === 'United States' && !existingUser.plaid_linked) {
        setNeedsOnboarding(true);
        setIsLoading(false);
        return { needsOnboarding: true };
      }

      // Store user data including country
      setUserCountry(existingUser.country);
      setUserData(existingUser);
      setNeedsOnboarding(false);

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      // Fetch linked banks
      const { data: banks } = await supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (banks) {
        setLinkedBanks(banks.map(bank => ({
          id: bank.id,
          cybrid_account_id: bank.cybrid_account_id,
          plaid_account_id: bank.plaid_account_id,
          institution_name: bank.institution_name,
          account_name: bank.account_name,
          account_mask: bank.account_mask,
          account_type: bank.account_type,
          status: bank.status,
          is_primary: bank.is_primary,
          verified_at: bank.verified_at
        })));
      }

      setIsLoading(false);
      return { userData: existingUser, userCountry: existingUser.country, needsOnboarding: false };
    } catch (error) {
      secureError('Error syncing user data:', error);
      setIsLoading(false);
      return { error };
    }
  }, [userId, userEmail]);

  useEffect(() => {
    if (userId) {
      syncUserAndFetchData();
    }
  }, [userId, syncUserAndFetchData]);

  const updateUserProfile = useCallback(async (profileData) => {
    const { error } = await supabase
      .from('users')
      .update({
        first_name: profileData.first_name ? sanitizeForDB(profileData.first_name) : null,
        last_name: profileData.last_name ? sanitizeForDB(profileData.last_name) : null,
        business_name: profileData.business_name ? sanitizeForDB(profileData.business_name) : null,
        phone: profileData.phone ? sanitizeForDB(profileData.phone) : null,
        address: profileData.address ? sanitizeForDB(profileData.address) : null,
        city: profileData.city ? sanitizeForDB(profileData.city) : null,
        state: profileData.state ? sanitizeForDB(profileData.state) : null,
        zip: profileData.zip ? sanitizeForDB(profileData.zip) : null,
        bank_name: profileData.bank_name ? sanitizeForDB(profileData.bank_name) : null,
        account_name: profileData.account_name ? sanitizeForDB(profileData.account_name) : null,
        account_number: profileData.account_number ? sanitizeForDB(profileData.account_number) : null,
        swift_code: profileData.swift_code ? sanitizeForDB(profileData.swift_code) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (!error) {
      setUserData(prev => ({ ...prev, ...profileData }));
    }
    return { error };
  }, [userId]);

  const deleteUserAccount = useCallback(async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('No session');

      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete account');
      }

      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      secureError('Error deleting account:', error);
      throw error;
    }
  }, [userId]);

  const removeBankAccount = useCallback(async (bankId) => {
    try {
      await supabase.from('linked_bank_accounts').delete().eq('id', bankId);
      setLinkedBanks(prev => prev.filter(b => b.id !== bankId));
    } catch (error) {
      secureError('Error removing bank:', error);
    }
  }, []);

  const setPrimaryBank = useCallback(async (bankId) => {
    try {
      await supabase.from('linked_bank_accounts').update({ is_primary: false }).eq('user_id', userId);
      await supabase.from('linked_bank_accounts').update({ is_primary: true }).eq('id', bankId);
      setLinkedBanks(prev => prev.map(b => ({ ...b, is_primary: b.id === bankId })));
    } catch (error) {
      secureError('Error setting primary bank:', error);
    }
  }, [userId]);

  return {
    userData,
    setUserData,
    userCountry,
    needsOnboarding,
    setNeedsOnboarding,
    isLoading,
    linkedBanks,
    setLinkedBanks,
    syncUserAndFetchData,
    updateUserProfile,
    deleteUserAccount,
    removeBankAccount,
    setPrimaryBank,
  };
}

export default useUserData;
