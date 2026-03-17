-- =====================================================
-- ZYP DATABASE SCHEMA UPDATE
-- Team Management, Recurring Payments, Bulk Payments
-- =====================================================

-- ==================== TEAM MANAGEMENT ====================

-- Team members table (links users to team owners)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'finance', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, member_id)
);

-- Team invites table
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'finance', 'viewer')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add team_role and team_owner_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_role TEXT DEFAULT 'owner';
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_owner_id UUID REFERENCES auth.users(id);

-- RLS policies for team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team members" ON team_members
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    member_id = auth.uid() OR
    owner_id IN (SELECT team_owner_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Owners and admins can manage team members" ON team_members
  FOR ALL USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.owner_id = team_members.owner_id 
      AND tm.member_id = auth.uid() 
      AND tm.role = 'admin'
    )
  );

-- RLS policies for team_invites
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team invites" ON team_invites
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Owners and admins can manage invites" ON team_invites
  FOR ALL USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.owner_id = team_invites.owner_id 
      AND tm.member_id = auth.uid() 
      AND tm.role = 'admin'
    )
  );

-- ==================== RECURRING PAYMENTS ====================

CREATE TABLE IF NOT EXISTS recurring_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD',
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date DATE NOT NULL,
  next_payment_date TIMESTAMPTZ NOT NULL,
  last_paid_date TIMESTAMPTZ,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'completed')),
  auto_execute BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT FALSE,
  total_paid DECIMAL(12, 2) DEFAULT 0,
  payment_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding due payments
CREATE INDEX IF NOT EXISTS idx_recurring_payments_next_due 
  ON recurring_payments(next_payment_date, status) 
  WHERE status = 'active';

-- RLS for recurring_payments
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their recurring payments" ON recurring_payments
  FOR ALL USING (
    user_id = auth.uid() OR
    user_id IN (SELECT team_owner_id FROM users WHERE id = auth.uid())
  );

-- ==================== BULK PAYMENTS ====================

-- Batch metadata
CREATE TABLE IF NOT EXISTS bulk_payment_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'processing', 'completed', 'failed', 'cancelled')),
  total_amount DECIMAL(12, 2) DEFAULT 0,
  total_payments INTEGER DEFAULT 0,
  completed_payments INTEGER DEFAULT 0,
  failed_payments INTEGER DEFAULT 0,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual payments in a batch
CREATE TABLE IF NOT EXISTS bulk_payment_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES bulk_payment_batches(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES recipients(id),
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  transaction_id UUID REFERENCES transactions(id),
  cybrid_transfer_guid TEXT,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for batch processing
CREATE INDEX IF NOT EXISTS idx_bulk_payment_items_batch 
  ON bulk_payment_items(batch_id, status);

-- RLS for bulk payments
ALTER TABLE bulk_payment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_payment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their bulk batches" ON bulk_payment_batches
  FOR ALL USING (
    user_id = auth.uid() OR
    user_id IN (SELECT team_owner_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view batch items" ON bulk_payment_items
  FOR ALL USING (
    batch_id IN (
      SELECT id FROM bulk_payment_batches 
      WHERE user_id = auth.uid() OR 
      user_id IN (SELECT team_owner_id FROM users WHERE id = auth.uid())
    )
  );

-- ==================== HELPER FUNCTIONS ====================

-- Function to update next payment date
CREATE OR REPLACE FUNCTION update_next_payment_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.last_paid_date IS DISTINCT FROM NEW.last_paid_date) THEN
    NEW.next_payment_date = CASE NEW.frequency
      WHEN 'weekly' THEN COALESCE(NEW.last_paid_date, NOW()) + INTERVAL '7 days'
      WHEN 'biweekly' THEN COALESCE(NEW.last_paid_date, NOW()) + INTERVAL '14 days'
      WHEN 'monthly' THEN COALESCE(NEW.last_paid_date, NOW()) + INTERVAL '1 month'
    END;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_next_payment
  BEFORE UPDATE ON recurring_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_next_payment_date();

-- Function to update batch totals
CREATE OR REPLACE FUNCTION update_batch_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bulk_payment_batches
  SET 
    total_payments = (SELECT COUNT(*) FROM bulk_payment_items WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)),
    total_amount = (SELECT COALESCE(SUM(amount), 0) FROM bulk_payment_items WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)),
    completed_payments = (SELECT COUNT(*) FROM bulk_payment_items WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id) AND status = 'completed'),
    failed_payments = (SELECT COUNT(*) FROM bulk_payment_items WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id) AND status = 'failed'),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.batch_id, OLD.batch_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_totals
  AFTER INSERT OR UPDATE OR DELETE ON bulk_payment_items
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_totals();

-- ==================== PERMISSIONS CHECK FUNCTION ====================

-- Function to check if user has permission for an action
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's team role
  SELECT team_role INTO user_role FROM users WHERE id = user_uuid;
  
  -- Owner has all permissions
  IF user_role = 'owner' THEN RETURN TRUE; END IF;
  
  -- Check specific permissions
  RETURN CASE permission
    WHEN 'view' THEN user_role IN ('owner', 'admin', 'finance', 'viewer')
    WHEN 'send' THEN user_role IN ('owner', 'admin', 'finance')
    WHEN 'manage_recipients' THEN user_role IN ('owner', 'admin', 'finance')
    WHEN 'manage_invoices' THEN user_role IN ('owner', 'admin', 'finance')
    WHEN 'manage_team' THEN user_role IN ('owner', 'admin')
    WHEN 'settings' THEN user_role IN ('owner', 'admin')
    WHEN 'delete' THEN user_role = 'owner'
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
