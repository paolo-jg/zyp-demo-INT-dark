# Zyp Supabase Database Setup Guide

## Quick Start

### 1. Run the Migration

Go to your Supabase Dashboard → SQL Editor and run the contents of:
```
supabase/migrations/015_zyp_id_and_search.sql
```

### 2. Verify Setup

```sql
-- Test Zyp ID generation
SELECT generate_zyp_id();
-- Should return something like: ZYP-202601-000001

-- Check invoices table has zyp_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name = 'zyp_id';

-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_auto_zyp_id';
```

### 3. Test Internal Search

```sql
-- Test user search (as authenticated user)
SELECT * FROM search_verified_users('test', NULL, 10);

-- Test recipient search
SELECT * FROM search_verified_recipients(
  'your-user-uuid-here'::uuid, 
  'search term', 
  'Philippines'
);
```

---

## Zyp ID System

### Format
```
ZYP-YYYYMM-XXXXXX
Example: ZYP-202601-000001, ZYP-202601-000002, etc.
```

### Auto-Generation
- Every new invoice automatically gets a Zyp ID
- Existing invoices are backfilled on migration run
- IDs are guaranteed unique via database sequence

### Looking Up by Zyp ID

```javascript
// Frontend usage
const { data, error } = await supabase.rpc('lookup_invoice_by_zyp_id', {
  p_zyp_id: 'ZYP-202601-000001'
});
```

---

## RLS (Row Level Security) Summary

| Table | Who Can Read | Who Can Write |
|-------|--------------|---------------|
| `users` | Self + Verified/Searchable users | Self only |
| `invoices` | Sender OR Recipient | Sender (create), Both (update) |
| `recipients` | Owner OR platform_user_id | Owner only |
| `transactions` | Owner only | Owner only |
| `zyp_id_registry` | Owner OR Counterparty | Owner only |

---

## Internal Search Features

### 1. Search Verified Users (Directory)

```javascript
const searchUsers = async (query, country = null) => {
  const { data, error } = await supabase.rpc('search_verified_users', {
    search_query: query,
    search_country: country,
    result_limit: 20
  });
  return data;
};
```

**Requirements for users to appear in search:**
- `verification_status = 'verified'`
- `searchable = true`
- `onboarding_completed = true`

### 2. Search Verified Recipients

```javascript
const searchRecipients = async (query) => {
  const { data, error } = await supabase.rpc('search_verified_recipients', {
    p_user_id: currentUser.id,
    search_query: query,
    target_country: 'Philippines'
  });
  return data;
};
```

**Requirements for recipients to appear:**
- `platform_verified = true`
- Belongs to the requesting user

### 3. EarlyPay Eligibility Check

```javascript
const checkEarlyPay = async (zypId) => {
  const { data, error } = await supabase.rpc('check_earlypay_eligibility', {
    p_zyp_id: zypId
  });
  return data;
  // Returns: { eligible: true/false, reason: '...', max_advance: 850, fee_percentage: 2.5 }
};
```

---

## Making Users Searchable

To enable a user to appear in the platform directory:

```sql
UPDATE users 
SET searchable = true, verification_status = 'verified'
WHERE id = 'user-uuid-here';
```

Or in the frontend after KYC verification:

```javascript
await supabase.from('users').update({
  searchable: true,
  verification_status: 'verified',
  verified_at: new Date().toISOString()
}).eq('id', userId);
```

---

## Making Recipients Verified

To mark a recipient as platform-verified (can receive transfers):

```sql
UPDATE recipients 
SET platform_verified = true, verification_date = NOW()
WHERE id = 'recipient-uuid-here';
```

---

## Troubleshooting

### "Cannot read properties of undefined"

This usually means data is null. Always use safe access:
```javascript
const logs = (statusLogs || {})[invoice?.invoiceNumber] || [];
```

### "Permission denied for table"

1. Check RLS is enabled
2. Verify you're authenticated
3. Check the policy conditions

```sql
-- Debug: Check current user
SELECT auth.uid();

-- Debug: Check policies on a table
SELECT * FROM pg_policies WHERE tablename = 'invoices';
```

### Zyp ID not appearing on invoices

1. Check the trigger exists
2. Verify the column exists
3. Test manual insert

```sql
-- Test insert
INSERT INTO invoices (user_id, invoice_number, amount, status, date)
VALUES ('test-user-id', 'INV-TEST-001', 1000, 'sent', NOW())
RETURNING zyp_id;
```

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Frontend Integration

### Displaying Zyp ID on Invoices

The `InvoiceList.jsx` component now displays the Zyp ID:
- Desktop: Below invoice number in emerald monospace font
- Mobile: In the card header

### Using Zyp ID in Customer Service

```javascript
// Look up any invoice by Zyp ID
const lookupInvoice = async (zypId) => {
  const { data } = await supabase.rpc('lookup_invoice_by_zyp_id', {
    p_zyp_id: zypId
  });
  return data;
};
```

### Admin Full Lookup (requires admin role)

```javascript
const adminLookup = async (zypId) => {
  const { data } = await supabase.rpc('admin_lookup_zyp_id', {
    p_zyp_id: zypId
  });
  return data;
};
```
