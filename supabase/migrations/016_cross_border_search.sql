-- =====================================================
-- ZYP CROSS-BORDER SEARCH UPDATE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Update search_verified_users to handle country variants
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
DECLARE
  normalized_country TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Normalize country names
  IF search_country IS NOT NULL THEN
    IF search_country IN ('United States', 'USA', 'US') THEN
      normalized_country := 'United States';
    ELSIF search_country IN ('Philippines', 'PH') THEN
      normalized_country := 'Philippines';
    ELSE
      normalized_country := search_country;
    END IF;
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
    AND u.id != auth.uid()
    AND (
      normalized_country IS NULL 
      OR u.country = normalized_country
      OR (normalized_country = 'United States' AND u.country IN ('United States', 'USA', 'US'))
      OR (normalized_country = 'Philippines' AND u.country IN ('Philippines', 'PH'))
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

-- New function: Auto cross-border search based on caller's country
CREATE OR REPLACE FUNCTION search_cross_border_users(
  search_query TEXT DEFAULT '',
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  business_name TEXT,
  account_type TEXT,
  country TEXT,
  email TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_country TEXT;
  target_country TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get caller's country
  SELECT u.country INTO caller_country FROM users u WHERE u.id = auth.uid();
  
  -- Determine target country (opposite)
  IF caller_country IN ('United States', 'USA', 'US') THEN
    target_country := 'Philippines';
  ELSIF caller_country IN ('Philippines', 'PH') THEN
    target_country := 'United States';
  ELSE
    -- Unknown country - return empty
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(u.public_display_name, u.business_name, u.first_name || ' ' || u.last_name) as display_name,
    u.business_name,
    u.account_type,
    u.country,
    u.email
  FROM users u
  WHERE 
    u.searchable = true
    AND u.verification_status = 'verified'
    AND u.onboarding_completed = true
    AND u.id != auth.uid()
    AND (
      u.country = target_country
      OR (target_country = 'United States' AND u.country IN ('United States', 'USA', 'US'))
      OR (target_country = 'Philippines' AND u.country IN ('Philippines', 'PH'))
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

GRANT EXECUTE ON FUNCTION search_cross_border_users TO authenticated;

-- Test data: Make sure you have some searchable users
-- UPDATE users SET searchable = true, verification_status = 'verified' WHERE id = 'your-test-user-id';
