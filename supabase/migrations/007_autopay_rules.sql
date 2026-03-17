-- Autopay Rules Table
-- Stores rules for automatically paying invoices from specific senders
CREATE TABLE IF NOT EXISTS autopay_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  rule_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'under_amount'
  amount_threshold DECIMAL(12,2), -- For 'under_amount' rule type
  timing TEXT NOT NULL DEFAULT 'on_due_date', -- 'on_due_date', 'days_before', 'on_receipt'
  days_before_due INTEGER, -- For 'days_before' timing
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one rule per sender per user
  UNIQUE(user_id, sender_name)
);

-- Autopay Pending Payments Table
-- Stores payments waiting for approval or scheduled to be executed
CREATE TABLE IF NOT EXISTS autopay_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES autopay_rules(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  amount DECIMAL(12,2) NOT NULL,
  scheduled_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'rejected', 'failed'
  error_message TEXT,
  cybrid_transfer_guid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE,
  
  -- Index for efficient queries
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'completed', 'rejected', 'failed'))
);

-- Autopay Execution Log
-- Tracks all autopay executions for audit purposes
CREATE TABLE IF NOT EXISTS autopay_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES autopay_rules(id) ON DELETE SET NULL,
  pending_id UUID REFERENCES autopay_pending(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'created', 'approved', 'executed', 'rejected', 'failed'
  amount DECIMAL(12,2),
  sender_name TEXT,
  cybrid_transfer_guid TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_autopay_rules_user ON autopay_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_autopay_rules_active ON autopay_rules(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_autopay_pending_user ON autopay_pending(user_id);
CREATE INDEX IF NOT EXISTS idx_autopay_pending_status ON autopay_pending(user_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_autopay_pending_scheduled ON autopay_pending(scheduled_date, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_autopay_logs_user ON autopay_logs(user_id);

-- RLS Policies
ALTER TABLE autopay_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopay_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopay_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own autopay rules
CREATE POLICY autopay_rules_select ON autopay_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY autopay_rules_insert ON autopay_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY autopay_rules_update ON autopay_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY autopay_rules_delete ON autopay_rules FOR DELETE USING (auth.uid() = user_id);

-- Users can only see and manage their own pending payments
CREATE POLICY autopay_pending_select ON autopay_pending FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY autopay_pending_insert ON autopay_pending FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY autopay_pending_update ON autopay_pending FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY autopay_pending_delete ON autopay_pending FOR DELETE USING (auth.uid() = user_id);

-- Users can only see their own logs
CREATE POLICY autopay_logs_select ON autopay_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY autopay_logs_insert ON autopay_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically create pending payments when invoices are received
CREATE OR REPLACE FUNCTION process_autopay_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
  invoice_amount DECIMAL(12,2);
  scheduled DATE;
BEGIN
  -- Only process payable invoices (invoices you need to pay)
  IF NEW.type != 'Payable' THEN
    RETURN NEW;
  END IF;

  -- Find matching autopay rule for this sender
  SELECT * INTO rule
  FROM autopay_rules
  WHERE user_id = NEW.user_id
    AND is_active = true
    AND (sender_name = NEW.sender_name OR sender_name = NEW.recipient_name)
  LIMIT 1;

  -- No matching rule found
  IF rule IS NULL THEN
    RETURN NEW;
  END IF;

  -- Parse invoice amount
  invoice_amount := NEW.amount;

  -- Check if amount threshold applies
  IF rule.rule_type = 'under_amount' AND invoice_amount > rule.amount_threshold THEN
    RETURN NEW;
  END IF;

  -- Calculate scheduled date based on timing
  IF rule.timing = 'on_receipt' THEN
    scheduled := CURRENT_DATE;
  ELSIF rule.timing = 'days_before' THEN
    scheduled := NEW.due_date - (rule.days_before_due || ' days')::INTERVAL;
  ELSE -- on_due_date
    scheduled := NEW.due_date;
  END IF;

  -- Create pending payment
  INSERT INTO autopay_pending (
    user_id,
    rule_id,
    invoice_id,
    sender_name,
    sender_email,
    amount,
    scheduled_date,
    status
  ) VALUES (
    NEW.user_id,
    rule.id,
    NEW.id,
    COALESCE(NEW.sender_name, NEW.recipient_name),
    NEW.sender_email,
    invoice_amount,
    scheduled,
    CASE WHEN rule.requires_approval THEN 'pending' ELSE 'approved' END
  );

  -- Log the action
  INSERT INTO autopay_logs (
    user_id,
    rule_id,
    invoice_id,
    action,
    amount,
    sender_name,
    metadata
  ) VALUES (
    NEW.user_id,
    rule.id,
    NEW.id,
    'created',
    invoice_amount,
    COALESCE(NEW.sender_name, NEW.recipient_name),
    jsonb_build_object('timing', rule.timing, 'requires_approval', rule.requires_approval)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run autopay check when invoices are inserted
DROP TRIGGER IF EXISTS trigger_autopay_on_invoice ON invoices;
CREATE TRIGGER trigger_autopay_on_invoice
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION process_autopay_on_invoice();
