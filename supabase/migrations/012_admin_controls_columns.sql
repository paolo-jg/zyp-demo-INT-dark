-- Migration: Add columns needed for admin controls
-- Ensures admin dashboard actions actually work

-- Add is_suspended column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Add index for quick suspended user checks
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(id) WHERE is_suspended = true;

-- Add 'paused' as valid transaction status (if using check constraint)
-- Note: If transactions.status doesn't have a check constraint, this isn't needed
-- ALTER TABLE transactions DROP CONSTRAINT IF EXISTS valid_transaction_status;
-- ALTER TABLE transactions ADD CONSTRAINT valid_transaction_status 
--   CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'paused', 'cancelled'));
