-- Add date_of_birth and cybrid_counterparty_guid columns to users table
-- Required for Philippines counterparty compliance

ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cybrid_counterparty_guid TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_cybrid_counterparty_guid ON users(cybrid_counterparty_guid) WHERE cybrid_counterparty_guid IS NOT NULL;

COMMENT ON COLUMN users.date_of_birth IS 'Date of birth - required for Philippines individual counterparty compliance';
COMMENT ON COLUMN users.cybrid_counterparty_guid IS 'Cybrid counterparty GUID for Philippines users';
