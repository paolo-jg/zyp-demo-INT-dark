-- Migration: Admin Dashboard Tables
-- Internal dashboard for monitoring, controls, and reconciliation

-- ==================== ADMIN ROLES ====================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'support', -- 'super_admin', 'admin', 'support', 'viewer'
  permissions JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id),
  CONSTRAINT valid_admin_role CHECK (role IN ('super_admin', 'admin', 'support', 'viewer'))
);

-- ==================== ADMIN AUDIT LOG ====================
-- Tracks all admin actions for compliance
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL, -- 'pause_transfer', 'refund', 'suspend_user', 'update_system_control', etc.
  target_type TEXT, -- 'user', 'transaction', 'system', etc.
  target_id TEXT, -- ID of the affected record
  details JSONB, -- Additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== SYSTEM CONTROLS ====================
-- Kill switches and system-wide settings
CREATE TABLE IF NOT EXISTS system_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_key TEXT UNIQUE NOT NULL,
  control_value JSONB NOT NULL DEFAULT 'true',
  description TEXT,
  updated_by UUID REFERENCES admin_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default controls
INSERT INTO system_controls (control_key, control_value, description) VALUES
  ('transfers_enabled', 'true', 'Master switch for all transfers'),
  ('signups_enabled', 'true', 'Allow new user registrations'),
  ('maintenance_mode', 'false', 'Show maintenance page to all users'),
  ('max_transfer_amount', '1000000', 'Maximum single transfer amount in USD')
ON CONFLICT (control_key) DO NOTHING;

-- ==================== FLAGGED TRANSACTIONS ====================
-- Transactions flagged for review
CREATE TABLE IF NOT EXISTS flagged_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  flag_reason TEXT NOT NULL, -- 'large_amount', 'velocity', 'sanctions', 'manual', 'error'
  flag_details JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'escalated'
  reviewed_by UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_flag_status CHECK (status IN ('pending', 'approved', 'rejected', 'escalated'))
);

-- ==================== RECONCILIATION ====================
-- Track reconciliation between Zyp and Cybrid
CREATE TABLE IF NOT EXISTS reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_date DATE NOT NULL,
  zyp_transaction_id UUID REFERENCES transactions(id),
  cybrid_transfer_guid TEXT,
  zyp_amount DECIMAL(12, 2),
  cybrid_amount DECIMAL(12, 2),
  zyp_status TEXT,
  cybrid_status TEXT,
  match_status TEXT DEFAULT 'pending', -- 'matched', 'mismatch', 'pending', 'manual_override'
  discrepancy_amount DECIMAL(12, 2),
  discrepancy_reason TEXT,
  reconciled_by UUID REFERENCES admin_users(id),
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_match_status CHECK (match_status IN ('matched', 'mismatch', 'pending', 'manual_override'))
);

-- ==================== SYSTEM ALERTS ====================
-- Alerts for admin attention
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'error', 'warning', 'info', 'critical'
  category TEXT NOT NULL, -- 'transfer', 'kyc', 'system', 'security', 'reconciliation'
  title TEXT NOT NULL,
  message TEXT,
  details JSONB,
  target_type TEXT,
  target_id TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
  acknowledged_by UUID REFERENCES admin_users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES admin_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_alert_type CHECK (alert_type IN ('error', 'warning', 'info', 'critical')),
  CONSTRAINT valid_alert_status CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed'))
);

-- ==================== DAILY METRICS ====================
-- Pre-aggregated daily stats for dashboard
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  total_transfers INTEGER DEFAULT 0,
  total_volume_usd DECIMAL(14, 2) DEFAULT 0,
  total_fees_usd DECIMAL(10, 2) DEFAULT 0,
  successful_transfers INTEGER DEFAULT 0,
  failed_transfers INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  kyc_completed INTEGER DEFAULT 0,
  kyc_failed INTEGER DEFAULT 0,
  avg_transfer_size DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_flagged_transactions_status ON flagged_transactions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reconciliation_date ON reconciliation_records(reconciliation_date);
CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON reconciliation_records(match_status) WHERE match_status != 'matched';
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status, alert_type) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(metric_date);

-- ==================== RLS POLICIES ====================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- Admin users can only be managed by super_admins
CREATE POLICY admin_users_select ON admin_users
  FOR SELECT USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY admin_users_insert ON admin_users
  FOR INSERT WITH CHECK (
    (select auth.uid()) IN (SELECT user_id FROM admin_users WHERE role = 'super_admin')
  );

CREATE POLICY admin_users_update ON admin_users
  FOR UPDATE USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users WHERE role = 'super_admin')
  );

CREATE POLICY admin_users_delete ON admin_users
  FOR DELETE USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users WHERE role = 'super_admin')
  );

-- Admin audit log - admins can view, only system can insert
CREATE POLICY admin_audit_log_select ON admin_audit_log
  FOR SELECT USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY admin_audit_log_insert ON admin_audit_log
  FOR INSERT WITH CHECK (
    (select auth.uid()) IN (SELECT user_id FROM admin_users)
  );

-- System controls - admins can view, only admin+ can update
CREATE POLICY system_controls_select ON system_controls
  FOR SELECT USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY system_controls_update ON system_controls
  FOR UPDATE USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users WHERE role IN ('super_admin', 'admin'))
  );

-- Flagged transactions - all admins can view, support+ can update
CREATE POLICY flagged_transactions_select ON flagged_transactions
  FOR SELECT USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY flagged_transactions_insert ON flagged_transactions
  FOR INSERT WITH CHECK (
    (select auth.uid()) IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY flagged_transactions_update ON flagged_transactions
  FOR UPDATE USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users WHERE role IN ('super_admin', 'admin', 'support'))
  );

-- Reconciliation - all admins can view, admin+ can manage
CREATE POLICY reconciliation_records_select ON reconciliation_records
  FOR SELECT USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY reconciliation_records_all ON reconciliation_records
  FOR ALL USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users WHERE role IN ('super_admin', 'admin'))
  );

-- System alerts - all admins can view and update
CREATE POLICY system_alerts_select ON system_alerts
  FOR SELECT USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users)
  );

CREATE POLICY system_alerts_all ON system_alerts
  FOR ALL USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users)
  );

-- Daily metrics - all admins can view
CREATE POLICY daily_metrics_select ON daily_metrics
  FOR SELECT USING (
    (select auth.uid()) IN (SELECT user_id FROM admin_users)
  );

-- ==================== HELPER FUNCTIONS ====================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE user_id = check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin role
CREATE OR REPLACE FUNCTION get_admin_role(check_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  admin_role TEXT;
BEGIN
  SELECT role INTO admin_role FROM admin_users WHERE user_id = check_user_id;
  RETURN admin_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  admin_id UUID;
  log_id UUID;
BEGIN
  SELECT id INTO admin_id FROM admin_users WHERE user_id = auth.uid();
  
  INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (admin_id, p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create system alert
CREATE OR REPLACE FUNCTION create_system_alert(
  p_alert_type TEXT,
  p_category TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO system_alerts (alert_type, category, title, message, details, target_type, target_id)
  VALUES (p_alert_type, p_category, p_title, p_message, p_details, p_target_type, p_target_id)
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update daily metrics (call this via cron or trigger)
CREATE OR REPLACE FUNCTION update_daily_metrics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_metrics (
    metric_date,
    total_transfers,
    total_volume_usd,
    total_fees_usd,
    successful_transfers,
    failed_transfers,
    new_users,
    active_users,
    avg_transfer_size
  )
  SELECT
    p_date,
    COUNT(*),
    COALESCE(SUM(amount_sent), 0),
    COALESCE(SUM(fee), 0),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    (SELECT COUNT(*) FROM auth.users WHERE DATE(created_at) = p_date),
    (SELECT COUNT(DISTINCT user_id) FROM transactions WHERE DATE(created_at) = p_date),
    COALESCE(AVG(amount_sent), 0)
  FROM transactions
  WHERE DATE(created_at) = p_date
  ON CONFLICT (metric_date) DO UPDATE SET
    total_transfers = EXCLUDED.total_transfers,
    total_volume_usd = EXCLUDED.total_volume_usd,
    total_fees_usd = EXCLUDED.total_fees_usd,
    successful_transfers = EXCLUDED.successful_transfers,
    failed_transfers = EXCLUDED.failed_transfers,
    new_users = EXCLUDED.new_users,
    active_users = EXCLUDED.active_users,
    avg_transfer_size = EXCLUDED.avg_transfer_size,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public function to check if signups are enabled (callable without auth)
CREATE OR REPLACE FUNCTION are_signups_enabled()
RETURNS BOOLEAN AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT (control_value::text = 'true' OR control_value::text = '"true"')
  INTO is_enabled
  FROM system_controls
  WHERE control_key = 'signups_enabled';
  
  RETURN COALESCE(is_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public function to check if system is in maintenance mode (callable without auth)
CREATE OR REPLACE FUNCTION is_maintenance_mode()
RETURNS BOOLEAN AS $$
DECLARE
  is_maintenance BOOLEAN;
BEGIN
  SELECT (control_value::text = 'true' OR control_value::text = '"true"')
  INTO is_maintenance
  FROM system_controls
  WHERE control_key = 'maintenance_mode';
  
  RETURN COALESCE(is_maintenance, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
