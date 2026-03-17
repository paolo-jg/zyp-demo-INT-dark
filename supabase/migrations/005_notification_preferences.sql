-- Migration: Add notification preferences and notification log tables
-- Run this in Supabase SQL Editor

-- Notification preferences for each user
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email notifications
  email_transfer_initiated BOOLEAN DEFAULT true,
  email_transfer_completed BOOLEAN DEFAULT true,
  email_transfer_failed BOOLEAN DEFAULT true,
  email_invoice_received BOOLEAN DEFAULT true,
  email_invoice_paid BOOLEAN DEFAULT true,
  email_payment_received BOOLEAN DEFAULT true,
  email_weekly_summary BOOLEAN DEFAULT true,
  email_security_alerts BOOLEAN DEFAULT true,
  email_large_transfer_alerts BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  
  -- SMS notifications (reserved for future use)
  sms_enabled BOOLEAN DEFAULT false,
  sms_transfer_completed BOOLEAN DEFAULT false,
  sms_large_transfer_alerts BOOLEAN DEFAULT true,
  sms_security_alerts BOOLEAN DEFAULT true,
  sms_payment_received BOOLEAN DEFAULT false,
  
  -- Thresholds
  large_transfer_threshold DECIMAL(12,2) DEFAULT 10000.00,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Log of sent notifications (for debugging and preventing duplicates)
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'email' or 'sms'
  event_type TEXT NOT NULL, -- 'transfer_completed', 'invoice_paid', etc.
  recipient TEXT NOT NULL, -- email address or phone number
  subject TEXT,
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Users can view/update their own preferences
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can view their own notification log
DROP POLICY IF EXISTS "Users can view own notification log" ON notification_log;
CREATE POLICY "Users can view own notification log" ON notification_log
  FOR SELECT USING (user_id = auth.uid());

-- Service role can insert logs
DROP POLICY IF EXISTS "Service can insert notification logs" ON notification_log;
CREATE POLICY "Service can insert notification logs" ON notification_log
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT ON notification_log TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at DESC);

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences when user is created
DROP TRIGGER IF EXISTS on_user_created_notification_prefs ON users;
CREATE TRIGGER on_user_created_notification_prefs
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
