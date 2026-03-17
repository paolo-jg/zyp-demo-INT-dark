import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { secureError } from '../utils/secureLogging';

/**
 * Hook to fetch and monitor system controls from admin dashboard
 * Returns current control values and loading state
 */
export function useSystemControls() {
  const [controls, setControls] = useState({
    transfersEnabled: true,
    signupsEnabled: true,
    maintenanceMode: false,
    maxTransferAmount: 1000000
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchControls = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_controls')
        .select('control_key, control_value');

      if (error) {
        // Table might not exist yet - use defaults
        if (error.code === '42P01') {
          setLoading(false);
          return;
        }
        throw error;
      }

      if (data) {
        const controlMap = {};
        data.forEach(row => {
          let value = row.control_value;
          // Parse JSON string values
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              // Keep as string
            }
          }
          controlMap[row.control_key] = value;
        });

        setControls({
          transfersEnabled: controlMap.transfers_enabled !== false && controlMap.transfers_enabled !== 'false',
          signupsEnabled: controlMap.signups_enabled !== false && controlMap.signups_enabled !== 'false',
          maintenanceMode: controlMap.maintenance_mode === true || controlMap.maintenance_mode === 'true',
          maxTransferAmount: parseFloat(controlMap.max_transfer_amount) || 1000000
        });
      }
    } catch (err) {
      secureError('Failed to fetch system controls:', err);
      setError(err);
      // Use safe defaults on error
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchControls();

    // Subscribe to changes
    const subscription = supabase
      .channel('system_controls_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_controls' },
        () => {
          fetchControls();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchControls]);

  return { controls, loading, error, refetch: fetchControls };
}

/**
 * Hook to check if current user is suspended
 */
export function useUserSuspensionCheck(userId) {
  const [isSuspended, setIsSuspended] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuspension = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_suspended')
          .eq('id', userId)
          .single();

        if (error) {
          // Column might not exist yet
          if (error.code === '42703') {
            setLoading(false);
            return;
          }
          throw error;
        }

        setIsSuspended(data?.is_suspended === true);
      } catch (err) {
        secureError('Failed to check user suspension:', err);
      }
      setLoading(false);
    };

    checkSuspension();

    // Subscribe to changes on this user
    const subscription = supabase
      .channel(`user_suspension_${userId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => {
          if (payload.new?.is_suspended !== undefined) {
            setIsSuspended(payload.new.is_suspended === true);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return { isSuspended, loading };
}

/**
 * Validate transfer amount against system controls
 */
export function validateTransferAmount(amount, maxAllowed) {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }
  if (numAmount > maxAllowed) {
    return { 
      valid: false, 
      error: `Amount exceeds maximum allowed ($${maxAllowed.toLocaleString()})` 
    };
  }
  return { valid: true, error: null };
}

export default useSystemControls;
