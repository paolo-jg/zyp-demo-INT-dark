-- Migration: Fix overly permissive DELETE policies
-- Run this in Supabase SQL Editor
-- This replaces the insecure policies from 004_delete_policies.sql

-- ==================== FIX OVERLY PERMISSIVE POLICIES ====================

-- Status logs - require user ownership via invoice relationship
DROP POLICY IF EXISTS "Users can delete own status logs" ON status_logs;
CREATE POLICY "Users can delete own status logs" ON status_logs
  FOR DELETE USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()::text OR recipient_id = auth.uid()
    )
  );

-- Invoice logs - require user ownership
DROP POLICY IF EXISTS "Users can delete own invoice logs" ON invoice_logs;
CREATE POLICY "Users can delete own invoice logs" ON invoice_logs
  FOR DELETE USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()::text OR recipient_id = auth.uid()
    )
  );

-- Transaction logs - require user ownership
DROP POLICY IF EXISTS "Users can delete own transaction logs" ON transaction_logs;
CREATE POLICY "Users can delete own transaction logs" ON transaction_logs
  FOR DELETE USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()::text
    )
  );

-- Payment history - require user ownership
DROP POLICY IF EXISTS "Users can delete own payment history" ON payment_history;
CREATE POLICY "Users can delete own payment history" ON payment_history
  FOR DELETE USING (
    user_id = auth.uid()::text OR recipient_id = auth.uid()::text
  );

-- ==================== ADD SELECT POLICIES (READ PROTECTION) ====================

-- Ensure users can only read their own data
DROP POLICY IF EXISTS "Users can view own status logs" ON status_logs;
CREATE POLICY "Users can view own status logs" ON status_logs
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()::text OR recipient_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own invoice logs" ON invoice_logs;
CREATE POLICY "Users can view own invoice logs" ON invoice_logs
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()::text OR recipient_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own transaction logs" ON transaction_logs;
CREATE POLICY "Users can view own transaction logs" ON transaction_logs
  FOR SELECT USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can view own payment history" ON payment_history;
CREATE POLICY "Users can view own payment history" ON payment_history
  FOR SELECT USING (
    user_id = auth.uid()::text OR recipient_id = auth.uid()::text
  );

-- ==================== RESTRICT USER DIRECTORY ACCESS ====================

-- Users should only see limited public info of other users in directory
DROP POLICY IF EXISTS "Users can view directory" ON users;
CREATE POLICY "Users can view directory" ON users
  FOR SELECT USING (
    -- Can always see own full profile
    id = auth.uid()
    OR
    -- Can see limited info of onboarded users for directory
    (onboarding_completed = true)
  );

-- Create a view for directory that only exposes safe fields
CREATE OR REPLACE VIEW public.user_directory AS
SELECT 
  id,
  first_name,
  last_name,
  business_name,
  email,
  account_type,
  category,
  is_verified,
  country,
  created_at
FROM users
WHERE onboarding_completed = true;

-- Grant access to the view
GRANT SELECT ON public.user_directory TO authenticated;

-- ==================== ADD AUDIT LOGGING ====================

-- Create audit log table if not exists
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow inserts, no reads/updates/deletes by users
CREATE POLICY "Users can insert audit logs" ON security_audit_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can read audit logs (you'd grant this to specific roles)
-- CREATE POLICY "Admins can view audit logs" ON security_audit_log
--   FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== RATE LIMITING TABLE ====================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, action)
);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit records
CREATE POLICY "Users can view own rate limits" ON rate_limits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own rate limits" ON rate_limits
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own rate limits" ON rate_limits
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action);
