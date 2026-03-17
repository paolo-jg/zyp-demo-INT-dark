-- =====================================================
-- ZYP DATABASE SCHEMA: Zyp ID System & Internal Search
-- Migration 015 - January 2026
-- =====================================================

-- ==================== ZYP ID SEQUENCE ====================
-- Creates unique, human-readable IDs for all invoices
-- Format: ZYP-YYYYMM-XXXXXX (e.g., ZYP-202601-000001)

-- Create sequence for Zyp IDs
CREATE SEQUENCE IF NOT EXISTS zyp_invoice_seq START 1;

-- Function to generate Zyp ID
CREATE OR REPLACE FUNCTION generate_zyp_id()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  seq_num INTEGER;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  seq_num := nextval('zyp_invoice_seq');
  RETURN 'ZYP-' || year_month || '-' || LPAD(seq_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Add zyp_id column to invoices if not exists
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS zyp_id TEXT UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS zyp_id_created_at TIMESTAMPTZ;

-- Create index for fast Zyp ID lookups
CREATE INDEX IF NOT EXISTS idx_invoices_zyp_id ON invoices(zyp_id) WHERE zyp_id IS NOT NULL;

-- Trigger to auto-generate Zyp ID on invoice creation
CREATE OR REPLACE FUNCTION auto_generate_zyp_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.zyp_id IS NULL THEN
    NEW.zyp_id := generate_zyp_id();
    NEW.zyp_id_created_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_zyp_id ON invoices;
CREATE TRIGGER trigger_auto_zyp_id
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_zyp_id();

-- Backfill existing invoices with Zyp IDs
UPDATE invoices 
SET zyp_id = generate_zyp_id(), zyp_id_created_at = created_at
WHERE zyp_id IS NULL;

-- ==================== ZYP ID REGISTRY ====================
-- Central registry for tracking all Zyp IDs (for customer service & EarlyPay)

CREATE TABLE IF NOT EXISTS zyp_id_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zyp_id TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'transfer', 'user', 'recipient')),
  entity_id UUID NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_user_id UUID REFERENCES auth.users(id),
  amount DECIMAL(12, 2),
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_zyp_registry_entity ON zyp_id_registry(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_zyp_registry_owner ON zyp_id_registry(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_zyp_registry_status ON zyp_id_registry(status);

-- Enable RLS
ALTER TABLE zyp_id_registry ENABLE ROW LEVEL SECURITY;

-- Users can view their own registry entries
CREATE POLICY zyp_registry_select ON zyp_id_registry
  FOR SELECT USING (
    owner_user_id = (select auth.uid()) OR
    counterparty_user_id = (select auth.uid())
  );

-- Only system/admin can insert/update (via Edge Functions)
CREATE POLICY zyp_registry_insert ON zyp_id_registry
  FOR INSERT WITH CHECK (owner_user_id = (select auth.uid()));

-- ==================== VERIFIED USER DIRECTORY ====================
-- Searchable directory of verified platform users

-- Add verification fields if not exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' 
  CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS searchable BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_display_name TEXT;

-- Create search index
CREATE INDEX IF NOT EXISTS idx_users_searchable ON users(searchable, verification_status) 
  WHERE searchable = true AND verification_status = 'verified';

CREATE INDEX IF NOT EXISTS idx_users_business_search ON users 
  USING gin(to_tsvector('english', COALESCE(business_name, '') || ' ' || COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')));

-- ==================== SECURE DIRECTORY SEARCH FUNCTION ====================
-- RPC function for searching verified users (internal platform use only)

CREATE OR REPLACE FUNCTION search_verified_users(
  search_query TEXT,
  search_country TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  business_name TEXT,
  account_type TEXT,
  country TEXT,
  verification_status TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users to search
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(u.public_display_name, u.business_name, u.first_name || ' ' || u.last_name) as display_name,
    u.business_name,
    u.account_type,
    u.country,
    u.verification_status
  FROM users u
  WHERE 
    u.searchable = true
    AND u.verification_status = 'verified'
    AND u.onboarding_completed = true
    AND u.id != auth.uid()  -- Don't include self
    AND (
      search_country IS NULL OR u.country = search_country
    )
    AND (
      search_query IS NULL 
      OR search_query = ''
      OR u.business_name ILIKE '%' || search_query || '%'
      OR u.first_name ILIKE '%' || search_query || '%'
      OR u.last_name ILIKE '%' || search_query || '%'
      OR u.email ILIKE '%' || search_query || '%'
    )
  ORDER BY u.business_name, u.last_name
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_verified_users TO authenticated;

-- ==================== RECIPIENT VERIFICATION TRACKING ====================
-- Track which recipients are verified and can receive transfers

ALTER TABLE recipients ADD COLUMN IF NOT EXISTS platform_verified BOOLEAN DEFAULT false;
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES auth.users(id);
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS platform_user_id UUID REFERENCES auth.users(id);
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ;

-- Index for finding verified recipients
CREATE INDEX IF NOT EXISTS idx_recipients_verified ON recipients(platform_verified, country) 
  WHERE platform_verified = true;

-- ==================== SECURE RECIPIENT LOOKUP ====================
-- RPC function to find verified recipients for transfers

CREATE OR REPLACE FUNCTION search_verified_recipients(
  p_user_id UUID,
  search_query TEXT DEFAULT NULL,
  target_country TEXT DEFAULT 'Philippines'
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  country TEXT,
  bank_name TEXT,
  account_last_four TEXT,
  platform_verified BOOLEAN,
  platform_user_id UUID
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Only return user's own recipients that are verified
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.email,
    r.country,
    r.bank_name,
    RIGHT(r.account_number, 4) as account_last_four,
    r.platform_verified,
    r.platform_user_id
  FROM recipients r
  WHERE 
    r.zyp_user_id = p_user_id
    AND r.country = target_country
    AND r.platform_verified = true
    AND (
      search_query IS NULL 
      OR search_query = ''
      OR r.name ILIKE '%' || search_query || '%'
      OR r.email ILIKE '%' || search_query || '%'
    )
  ORDER BY r.name;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION search_verified_recipients TO authenticated;

-- ==================== INVOICE LOOKUP BY ZYP ID ====================
-- RPC function for customer service / EarlyPay to look up invoices

CREATE OR REPLACE FUNCTION lookup_invoice_by_zyp_id(p_zyp_id TEXT)
RETURNS TABLE (
  zyp_id TEXT,
  invoice_number TEXT,
  amount DECIMAL,
  currency TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  due_date DATE,
  sender_id TEXT,
  recipient_id UUID,
  sender_business_name TEXT,
  recipient_business_name TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    i.zyp_id,
    i.invoice_number,
    CAST(REPLACE(REPLACE(i.amount, '$', ''), ',', '') AS DECIMAL) as amount,
    COALESCE(i.currency, 'USD') as currency,
    COALESCE(i.status, 'pending') as status,
    i.created_at,
    i.due_date::DATE,
    i.user_id as sender_id,
    i.recipient_id,
    (SELECT business_name FROM users WHERE id::text = i.user_id) as sender_business_name,
    (SELECT business_name FROM users WHERE id = i.recipient_id) as recipient_business_name
  FROM invoices i
  WHERE 
    i.zyp_id = p_zyp_id
    AND (
      -- User must be sender or recipient
      i.user_id = auth.uid()::text 
      OR i.recipient_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION lookup_invoice_by_zyp_id TO authenticated;

-- ==================== IMPROVED RLS POLICIES ====================

-- Users table: Allow viewing verified users in directory
DROP POLICY IF EXISTS "Users can view directory" ON users;
CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    -- Can always see own profile
    id = (select auth.uid())
    OR
    -- Can see verified, searchable users (limited fields via view)
    (verification_status = 'verified' AND searchable = true AND onboarding_completed = true)
  );

-- Recipients table: Improved policies
DROP POLICY IF EXISTS "Users can view own recipients" ON recipients;
DROP POLICY IF EXISTS "Users can manage own recipients" ON recipients;

CREATE POLICY "recipients_select" ON recipients
  FOR SELECT USING (
    zyp_user_id = (select auth.uid())
    OR
    -- Allow viewing if user is the platform_user_id (they can be found)
    platform_user_id = (select auth.uid())
  );

CREATE POLICY "recipients_insert" ON recipients
  FOR INSERT WITH CHECK (zyp_user_id = (select auth.uid()));

CREATE POLICY "recipients_update" ON recipients
  FOR UPDATE USING (zyp_user_id = (select auth.uid()));

CREATE POLICY "recipients_delete" ON recipients
  FOR DELETE USING (zyp_user_id = (select auth.uid()));

-- Invoices table: Both parties can view
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "invoices_select" ON invoices;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    user_id = (select auth.uid())::text 
    OR recipient_id = (select auth.uid())
  );

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (user_id = (select auth.uid())::text);

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (
    user_id = (select auth.uid())::text 
    OR recipient_id = (select auth.uid())
  );

-- ==================== ADMIN LOOKUP FUNCTIONS ====================
-- For customer service (requires admin role)

CREATE OR REPLACE FUNCTION admin_lookup_zyp_id(p_zyp_id TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  user_role TEXT;
BEGIN
  -- Check if user is admin
  SELECT u.team_role INTO user_role FROM users u WHERE u.id = auth.uid();
  
  IF user_role NOT IN ('admin', 'owner') AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  SELECT jsonb_build_object(
    'zyp_id', i.zyp_id,
    'invoice_number', i.invoice_number,
    'amount', i.amount,
    'status', i.status,
    'created_at', i.created_at,
    'sender', jsonb_build_object(
      'user_id', i.user_id,
      'business_name', (SELECT business_name FROM users WHERE id::text = i.user_id)
    ),
    'recipient', jsonb_build_object(
      'user_id', i.recipient_id,
      'business_name', (SELECT business_name FROM users WHERE id = i.recipient_id)
    )
  ) INTO result
  FROM invoices i
  WHERE i.zyp_id = p_zyp_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ==================== EARLYPAY ELIGIBILITY CHECK ====================
-- Function to check if invoice is eligible for EarlyPay

CREATE OR REPLACE FUNCTION check_earlypay_eligibility(p_zyp_id TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_data RECORD;
  eligibility JSONB;
BEGIN
  -- Get invoice details
  SELECT 
    i.*,
    CAST(REPLACE(REPLACE(i.amount, '$', ''), ',', '') AS DECIMAL) as amount_numeric
  INTO invoice_data
  FROM invoices i
  WHERE i.zyp_id = p_zyp_id
    AND (i.user_id = auth.uid()::text OR i.recipient_id = auth.uid());
  
  IF invoice_data IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Invoice not found or access denied');
  END IF;
  
  -- Check eligibility criteria
  IF invoice_data.status IN ('paid', 'cancelled') THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Invoice already settled');
  END IF;
  
  IF invoice_data.amount_numeric < 500 THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Amount below minimum ($500)');
  END IF;
  
  IF invoice_data.due_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Invoice is past due');
  END IF;
  
  RETURN jsonb_build_object(
    'eligible', true,
    'zyp_id', invoice_data.zyp_id,
    'amount', invoice_data.amount_numeric,
    'due_date', invoice_data.due_date,
    'max_advance', invoice_data.amount_numeric * 0.85,  -- 85% max advance
    'fee_percentage', 2.5  -- 2.5% fee
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION check_earlypay_eligibility TO authenticated;

-- ==================== AUDIT TRAIL FOR ZYP IDS ====================

CREATE TABLE IF NOT EXISTS zyp_id_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zyp_id TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zyp_audit_id ON zyp_id_audit(zyp_id);
CREATE INDEX IF NOT EXISTS idx_zyp_audit_date ON zyp_id_audit(created_at DESC);

-- RLS for audit table
ALTER TABLE zyp_id_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY zyp_audit_insert ON zyp_id_audit
  FOR INSERT WITH CHECK (performed_by = (select auth.uid()));

-- Only admins can read full audit (users see their own via functions)
CREATE POLICY zyp_audit_select ON zyp_id_audit
  FOR SELECT USING (
    performed_by = (select auth.uid())
    OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = (select auth.uid()))
  );

-- ==================== UPDATE TRIGGER FOR TIMESTAMPS ====================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
DROP TRIGGER IF EXISTS trigger_zyp_registry_updated ON zyp_id_registry;
CREATE TRIGGER trigger_zyp_registry_updated
  BEFORE UPDATE ON zyp_id_registry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
