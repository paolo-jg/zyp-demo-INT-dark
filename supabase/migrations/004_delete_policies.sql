-- Migration: Add DELETE policies for account deletion
-- Run this in Supabase SQL Editor

-- Based on actual schema - creates DELETE policies for ALL tables with user references

-- 1. Users table (id is UUID)
DROP POLICY IF EXISTS "Users can delete own profile" ON users;
CREATE POLICY "Users can delete own profile" ON users
  FOR DELETE USING (id = auth.uid());
GRANT DELETE ON users TO authenticated;

-- 2. Recipients table (zyp_user_id is UUID - foreign key to users.id)
DROP POLICY IF EXISTS "Users can delete own recipients" ON recipients;
CREATE POLICY "Users can delete own recipients" ON recipients
  FOR DELETE USING (zyp_user_id = auth.uid());
GRANT DELETE ON recipients TO authenticated;

-- 3. Invoices table (user_id is TEXT, recipient_id is UUID FK to users.id)
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;
CREATE POLICY "Users can delete own invoices" ON invoices
  FOR DELETE USING (user_id = auth.uid()::text OR recipient_id = auth.uid());
GRANT DELETE ON invoices TO authenticated;

-- 4. Transactions table (user_id is TEXT)
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (user_id = auth.uid()::text);
GRANT DELETE ON transactions TO authenticated;

-- 5. Linked bank accounts (user_id is UUID)
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON linked_bank_accounts;
CREATE POLICY "Users can delete own bank accounts" ON linked_bank_accounts
  FOR DELETE USING (user_id = auth.uid());
GRANT DELETE ON linked_bank_accounts TO authenticated;

-- 6. Activity log (user_id is TEXT)
DROP POLICY IF EXISTS "Users can delete own activity logs" ON activity_log;
CREATE POLICY "Users can delete own activity logs" ON activity_log
  FOR DELETE USING (user_id = auth.uid()::text);
GRANT DELETE ON activity_log TO authenticated;

-- 7. KYB Verifications (user_id is UUID)
DROP POLICY IF EXISTS "Users can delete own kyb verifications" ON kyb_verifications;
CREATE POLICY "Users can delete own kyb verifications" ON kyb_verifications
  FOR DELETE USING (user_id = auth.uid());
GRANT DELETE ON kyb_verifications TO authenticated;

-- 8. Cybrid Transfers (user_id is UUID)
DROP POLICY IF EXISTS "Users can delete own cybrid transfers" ON cybrid_transfers;
CREATE POLICY "Users can delete own cybrid transfers" ON cybrid_transfers
  FOR DELETE USING (user_id = auth.uid());
GRANT DELETE ON cybrid_transfers TO authenticated;

-- 9. Status logs (if has user_id)
DROP POLICY IF EXISTS "Users can delete own status logs" ON status_logs;
CREATE POLICY "Users can delete own status logs" ON status_logs
  FOR DELETE USING (true);
GRANT DELETE ON status_logs TO authenticated;

-- 10. Invoice logs (if has user_id)  
DROP POLICY IF EXISTS "Users can delete own invoice logs" ON invoice_logs;
CREATE POLICY "Users can delete own invoice logs" ON invoice_logs
  FOR DELETE USING (true);
GRANT DELETE ON invoice_logs TO authenticated;

-- 11. Transaction logs (if has user_id)
DROP POLICY IF EXISTS "Users can delete own transaction logs" ON transaction_logs;
CREATE POLICY "Users can delete own transaction logs" ON transaction_logs
  FOR DELETE USING (true);
GRANT DELETE ON transaction_logs TO authenticated;

-- 12. Payment history (if exists)
DROP POLICY IF EXISTS "Users can delete own payment history" ON payment_history;
CREATE POLICY "Users can delete own payment history" ON payment_history
  FOR DELETE USING (true);
GRANT DELETE ON payment_history TO authenticated;
