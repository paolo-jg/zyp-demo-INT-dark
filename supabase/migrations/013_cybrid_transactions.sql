-- Migration: Add Cybrid transfer columns to transactions table
-- This tracks the Cybrid resources created for each transfer

-- Add Cybrid-related columns for tracking transfers
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cybrid_transfer_guid TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cybrid_counterparty_guid TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cybrid_quote_guid TEXT;

-- Add indexes for Cybrid lookups
CREATE INDEX IF NOT EXISTS idx_transactions_cybrid_transfer ON transactions(cybrid_transfer_guid) WHERE cybrid_transfer_guid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_cybrid_counterparty ON transactions(cybrid_counterparty_guid) WHERE cybrid_counterparty_guid IS NOT NULL;

-- Add comments
COMMENT ON COLUMN transactions.cybrid_transfer_guid IS 'Cybrid transfer GUID for tracking ACH/funding transfers';
COMMENT ON COLUMN transactions.cybrid_counterparty_guid IS 'Cybrid counterparty GUID for sanctions screening';
COMMENT ON COLUMN transactions.cybrid_quote_guid IS 'Cybrid quote GUID used for this transfer';

-- Ensure transactions table has updated_at column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();
