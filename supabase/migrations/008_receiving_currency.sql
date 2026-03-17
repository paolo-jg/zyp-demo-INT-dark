-- Migration: Add receiving_currency field for Philippine users and recipients
-- This tracks whether funds are received in USD or PHP
-- Users/recipients receiving in USD will be charged a $10 receiver fee per transaction

-- Add receiving_currency column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS receiving_currency VARCHAR(3) DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN users.receiving_currency IS 'Currency the user receives funds in (PHP or USD). Only applicable for Philippine users. USD receivers incur a $10 fee per transaction.';

-- Add receiving_currency column to recipients table
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS receiving_currency VARCHAR(3) DEFAULT 'PHP';

-- Add comment explaining the field
COMMENT ON COLUMN recipients.receiving_currency IS 'Currency the recipient receives funds in (PHP or USD). USD receivers incur a $10 fee per transaction.';

-- Add receiver_fee column to transactions table to track the $10 USD receiver fee
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receiver_fee DECIMAL(10, 2) DEFAULT 0;

-- Add receiving_currency to transactions table to track what currency was received
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receiving_currency VARCHAR(3) DEFAULT 'PHP';

-- Add comment explaining the fields
COMMENT ON COLUMN transactions.receiver_fee IS 'Receiver fee charged when sending to a USD account holder in Philippines ($10 per transaction)';
COMMENT ON COLUMN transactions.receiving_currency IS 'Currency the recipient received funds in (PHP or USD)';

-- Create index for querying users by receiving currency
CREATE INDEX IF NOT EXISTS idx_users_receiving_currency ON users(receiving_currency) WHERE receiving_currency IS NOT NULL;

-- Create index for querying recipients by receiving currency
CREATE INDEX IF NOT EXISTS idx_recipients_receiving_currency ON recipients(receiving_currency) WHERE receiving_currency IS NOT NULL;

-- Add check constraint to ensure valid currency values for users
ALTER TABLE users ADD CONSTRAINT check_receiving_currency 
  CHECK (receiving_currency IS NULL OR receiving_currency IN ('PHP', 'USD'));

-- Add check constraint to ensure valid currency values for recipients
ALTER TABLE recipients ADD CONSTRAINT check_recipient_receiving_currency 
  CHECK (receiving_currency IS NULL OR receiving_currency IN ('PHP', 'USD'));

-- Add check constraint to ensure valid currency values for transactions
ALTER TABLE transactions ADD CONSTRAINT check_transaction_receiving_currency 
  CHECK (receiving_currency IS NULL OR receiving_currency IN ('PHP', 'USD'));
