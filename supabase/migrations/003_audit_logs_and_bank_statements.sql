-- Migration: Add audit_logs table and bank_statements_uploaded column
-- Run this in Supabase SQL Editor

-- 1. Create audit_logs table for compliance tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: System can insert audit logs (service role only)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Add bank statements tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_statements_uploaded boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_statements_uploaded_at timestamptz;

-- 3. Add transaction_pin column for high-value transfer verification (US users only)
-- The PIN is stored as a SHA-256 hash for security
ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_pin text;
COMMENT ON COLUMN users.transaction_pin IS 'Hashed transaction PIN for verifying high-value transfers (US users only)';

-- 3. Add address column to recipients table (if not exists)
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS address text;

-- 4. Create table for storing bank statement metadata (files stored in Supabase Storage)
CREATE TABLE IF NOT EXISTS bank_statement_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  month_year text, -- e.g., "2024-10" for October 2024
  status text DEFAULT 'pending', -- pending, verified, rejected
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_statements_user_id ON bank_statement_uploads(user_id);

-- Enable RLS
ALTER TABLE bank_statement_uploads ENABLE ROW LEVEL SECURITY;

-- Users can view their own uploads
CREATE POLICY "Users can view own bank statements" ON bank_statement_uploads
  FOR SELECT USING (auth.uid() = user_id);

-- Users can upload their own statements
CREATE POLICY "Users can upload bank statements" ON bank_statement_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT, INSERT ON bank_statement_uploads TO authenticated;

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Stores security and compliance audit events';
COMMENT ON TABLE bank_statement_uploads IS 'Tracks bank statement uploads for large transfer compliance';
COMMENT ON COLUMN users.bank_statements_uploaded IS 'Whether user has completed one-time bank statement verification';
