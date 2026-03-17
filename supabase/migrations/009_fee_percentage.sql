-- Migration: Add fee_percentage column to transactions table
-- This stores the fee percentage rate (e.g., 0.5 for 0.5%) for analytics

-- Add fee_percentage column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fee_percentage DECIMAL(5, 3) DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN transactions.fee_percentage IS 'Fee percentage rate applied to this transaction (e.g., 0.5 means 0.5%). Used for analytics calculations.';

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_transactions_fee_percentage ON transactions(fee_percentage) WHERE fee_percentage IS NOT NULL;
