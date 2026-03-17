-- Migration: Fix RLS Performance Issues
-- Addresses Supabase Performance Advisor warnings:
-- 1. auth_rls_initplan: Wrap auth.uid() in (select auth.uid()) for single evaluation
-- 2. multiple_permissive_policies: Combine duplicate SELECT policies

-- ==================== AUTOPAY RULES ====================
DROP POLICY IF EXISTS autopay_rules_select ON autopay_rules;
DROP POLICY IF EXISTS autopay_rules_insert ON autopay_rules;
DROP POLICY IF EXISTS autopay_rules_update ON autopay_rules;
DROP POLICY IF EXISTS autopay_rules_delete ON autopay_rules;

CREATE POLICY autopay_rules_select ON autopay_rules 
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY autopay_rules_insert ON autopay_rules 
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY autopay_rules_update ON autopay_rules 
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY autopay_rules_delete ON autopay_rules 
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ==================== AUTOPAY PENDING ====================
DROP POLICY IF EXISTS autopay_pending_select ON autopay_pending;
DROP POLICY IF EXISTS autopay_pending_insert ON autopay_pending;
DROP POLICY IF EXISTS autopay_pending_update ON autopay_pending;
DROP POLICY IF EXISTS autopay_pending_delete ON autopay_pending;

CREATE POLICY autopay_pending_select ON autopay_pending 
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY autopay_pending_insert ON autopay_pending 
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY autopay_pending_update ON autopay_pending 
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY autopay_pending_delete ON autopay_pending 
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ==================== AUTOPAY LOGS ====================
DROP POLICY IF EXISTS autopay_logs_select ON autopay_logs;
DROP POLICY IF EXISTS autopay_logs_insert ON autopay_logs;

CREATE POLICY autopay_logs_select ON autopay_logs 
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY autopay_logs_insert ON autopay_logs 
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- ==================== BULK PAYMENT BATCHES ====================
DROP POLICY IF EXISTS "Users can manage their bulk batches" ON bulk_payment_batches;

CREATE POLICY "Users can manage their bulk batches" ON bulk_payment_batches
  FOR ALL USING (
    user_id = (select auth.uid()) OR
    user_id IN (SELECT team_owner_id FROM users WHERE id = (select auth.uid()))
  );

-- ==================== BULK PAYMENT ITEMS ====================
DROP POLICY IF EXISTS "Users can view batch items" ON bulk_payment_items;
DROP POLICY IF EXISTS "Users can manage batch items" ON bulk_payment_items;

CREATE POLICY "Users can manage batch items" ON bulk_payment_items
  FOR ALL USING (
    batch_id IN (
      SELECT id FROM bulk_payment_batches 
      WHERE user_id = (select auth.uid()) OR 
      user_id IN (SELECT team_owner_id FROM users WHERE id = (select auth.uid()))
    )
  );

-- ==================== TEAM MEMBERS ====================
-- Fix: Combine the two SELECT policies into one, and separate management policy
DROP POLICY IF EXISTS "Users can view their team members" ON team_members;
DROP POLICY IF EXISTS "Owners and admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "Owners can manage invites" ON team_members;
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

-- Single SELECT policy (combines both viewing conditions)
CREATE POLICY "team_members_select" ON team_members
  FOR SELECT USING (
    owner_id = (select auth.uid()) OR 
    member_id = (select auth.uid()) OR
    owner_id IN (SELECT team_owner_id FROM users WHERE id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.owner_id = team_members.owner_id 
      AND tm.member_id = (select auth.uid()) 
      AND tm.role = 'admin'
    )
  );

-- Separate policy for INSERT
CREATE POLICY "team_members_insert" ON team_members
  FOR INSERT WITH CHECK (
    owner_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.owner_id = team_members.owner_id 
      AND tm.member_id = (select auth.uid()) 
      AND tm.role = 'admin'
    )
  );

-- Separate policy for UPDATE
CREATE POLICY "team_members_update" ON team_members
  FOR UPDATE USING (
    owner_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.owner_id = team_members.owner_id 
      AND tm.member_id = (select auth.uid()) 
      AND tm.role = 'admin'
    )
  );

-- Separate policy for DELETE
CREATE POLICY "team_members_delete" ON team_members
  FOR DELETE USING (
    owner_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.owner_id = team_members.owner_id 
      AND tm.member_id = (select auth.uid()) 
      AND tm.role = 'admin'
    )
  );

-- ==================== TEAM INVITES ====================
-- Fix: Combine the two SELECT policies into one, and separate management policy
DROP POLICY IF EXISTS "Users can view their team invites" ON team_invites;
DROP POLICY IF EXISTS "Owners and admins can manage invites" ON team_invites;
DROP POLICY IF EXISTS "Owners can manage invites" ON team_invites;
DROP POLICY IF EXISTS "team_invites_select" ON team_invites;
DROP POLICY IF EXISTS "team_invites_insert" ON team_invites;
DROP POLICY IF EXISTS "team_invites_update" ON team_invites;
DROP POLICY IF EXISTS "team_invites_delete" ON team_invites;

-- Single SELECT policy (combines both viewing conditions)
CREATE POLICY "team_invites_select" ON team_invites
  FOR SELECT USING (
    owner_id = (select auth.uid()) OR 
    email = (SELECT email FROM auth.users WHERE id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.owner_id = team_invites.owner_id 
      AND tm.member_id = (select auth.uid()) 
      AND tm.role = 'admin'
    )
  );

-- Separate policy for INSERT
CREATE POLICY "team_invites_insert" ON team_invites
  FOR INSERT WITH CHECK (
    owner_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.owner_id = team_invites.owner_id 
      AND tm.member_id = (select auth.uid()) 
      AND tm.role = 'admin'
    )
  );

-- Separate policy for UPDATE
CREATE POLICY "team_invites_update" ON team_invites
  FOR UPDATE USING (
    owner_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.owner_id = team_invites.owner_id 
      AND tm.member_id = (select auth.uid()) 
      AND tm.role = 'admin'
    )
  );

-- Separate policy for DELETE
CREATE POLICY "team_invites_delete" ON team_invites
  FOR DELETE USING (
    owner_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.owner_id = team_invites.owner_id 
      AND tm.member_id = (select auth.uid()) 
      AND tm.role = 'admin'
    )
  );

-- ==================== DELETE POLICIES (from 004) ====================
-- Fix auth.uid() calls in delete policies

DROP POLICY IF EXISTS "Users can delete own profile" ON users;
CREATE POLICY "Users can delete own profile" ON users
  FOR DELETE USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own recipients" ON recipients;
CREATE POLICY "Users can delete own recipients" ON recipients
  FOR DELETE USING (zyp_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;
CREATE POLICY "Users can delete own invoices" ON invoices
  FOR DELETE USING (user_id = (select auth.uid())::text OR recipient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete own bank accounts" ON linked_bank_accounts;
CREATE POLICY "Users can delete own bank accounts" ON linked_bank_accounts
  FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own activity logs" ON activity_log;
CREATE POLICY "Users can delete own activity logs" ON activity_log
  FOR DELETE USING (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete own kyb verifications" ON kyb_verifications;
CREATE POLICY "Users can delete own kyb verifications" ON kyb_verifications
  FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own cybrid transfers" ON cybrid_transfers;
CREATE POLICY "Users can delete own cybrid transfers" ON cybrid_transfers
  FOR DELETE USING (user_id = (select auth.uid()));

-- ==================== SECURE RLS POLICIES (from 006) ====================
-- Fix auth.uid() calls in status/invoice/transaction logs

DROP POLICY IF EXISTS "Users can delete own status logs" ON status_logs;
CREATE POLICY "Users can delete own status logs" ON status_logs
  FOR DELETE USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = (select auth.uid())::text OR recipient_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own invoice logs" ON invoice_logs;
CREATE POLICY "Users can delete own invoice logs" ON invoice_logs
  FOR DELETE USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = (select auth.uid())::text OR recipient_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own transaction logs" ON transaction_logs;
CREATE POLICY "Users can delete own transaction logs" ON transaction_logs
  FOR DELETE USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Users can delete own payment history" ON payment_history;
CREATE POLICY "Users can delete own payment history" ON payment_history
  FOR DELETE USING (
    user_id = (select auth.uid())::text OR recipient_id = (select auth.uid())::text
  );

-- Fix SELECT policies for logs
DROP POLICY IF EXISTS "Users can view own status logs" ON status_logs;
CREATE POLICY "Users can view own status logs" ON status_logs
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = (select auth.uid())::text OR recipient_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own invoice logs" ON invoice_logs;
CREATE POLICY "Users can view own invoice logs" ON invoice_logs
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = (select auth.uid())::text OR recipient_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own transaction logs" ON transaction_logs;
CREATE POLICY "Users can view own transaction logs" ON transaction_logs
  FOR SELECT USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Users can view own payment history" ON payment_history;
CREATE POLICY "Users can view own payment history" ON payment_history
  FOR SELECT USING (
    user_id = (select auth.uid())::text OR recipient_id = (select auth.uid())::text
  );

-- Fix users directory policy
DROP POLICY IF EXISTS "Users can view directory" ON users;
CREATE POLICY "Users can view directory" ON users
  FOR SELECT USING (
    id = (select auth.uid())
    OR
    (onboarding_completed = true)
  );

-- Fix rate_limits policies
DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limits;
CREATE POLICY "Users can view own rate limits" ON rate_limits
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own rate limits" ON rate_limits;
CREATE POLICY "Users can update own rate limits" ON rate_limits
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own rate limits" ON rate_limits;
CREATE POLICY "Users can insert own rate limits" ON rate_limits
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- Fix security_audit_log policy
DROP POLICY IF EXISTS "Users can insert audit logs" ON security_audit_log;
CREATE POLICY "Users can insert audit logs" ON security_audit_log
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- ==================== RECURRING PAYMENTS ====================
DROP POLICY IF EXISTS "Users can manage their recurring payments" ON recurring_payments;
CREATE POLICY "Users can manage their recurring payments" ON recurring_payments
  FOR ALL USING (
    user_id = (select auth.uid()) OR
    user_id IN (SELECT team_owner_id FROM users WHERE id = (select auth.uid()))
  );

-- ==================== NOTIFICATION PREFERENCES ====================
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- ==================== NOTIFICATION LOG ====================
DROP POLICY IF EXISTS "Users can view own notification log" ON notification_log;
CREATE POLICY "Users can view own notification log" ON notification_log
  FOR SELECT USING (user_id = (select auth.uid()));
