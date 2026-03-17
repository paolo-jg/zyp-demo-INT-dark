import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CYBRID_API_URL = Deno.env.get('CYBRID_API_URL') || 'https://bank.sandbox.cybrid.app'
const CYBRID_ID_URL = Deno.env.get('CYBRID_ID_URL') || 'https://id.sandbox.cybrid.app'
const CYBRID_CLIENT_ID = Deno.env.get('CYBRID_CLIENT_ID')
const CYBRID_CLIENT_SECRET = Deno.env.get('CYBRID_CLIENT_SECRET')

async function getCybridToken(): Promise<string> {
  const response = await fetch(`${CYBRID_ID_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: CYBRID_CLIENT_ID,
      client_secret: CYBRID_CLIENT_SECRET,
      scope: 'customers:read external_bank_accounts:execute external_bank_accounts:read'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to get Cybrid token: ${await response.text()}`)
  }

  const data = await response.json()
  return data.access_token
}

async function createExternalBankAccount(token: string, customerGuid: string, plaidPublicToken: string, accountId: string) {
  const response = await fetch(`${CYBRID_API_URL}/api/external_bank_accounts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Primary Bank Account',  // Required by Cybrid
      account_kind: 'plaid',         // Required - indicates Plaid-connected account
      customer_guid: customerGuid,
      asset: 'USD',
      plaid_public_token: plaidPublicToken,
      plaid_account_id: accountId
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to create external bank account: ${await response.text()}`)
  }

  return response.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { plaid_public_token, plaid_account_id } = await req.json()

    if (!plaid_public_token || !plaid_account_id) {
      return new Response(
        JSON.stringify({ error: 'Missing plaid_public_token or plaid_account_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userData.cybrid_customer_guid) {
      return new Response(
        JSON.stringify({ error: 'Cybrid customer not created yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Per Cybrid docs: Customer must be KYC verified before linking external bank accounts
    if (userData.kyc_status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'KYC verification must be completed before linking a bank account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cybridToken = await getCybridToken()
    const bankAccount = await createExternalBankAccount(
      cybridToken,
      userData.cybrid_customer_guid,
      plaid_public_token,
      plaid_account_id
    )

    console.log('External bank account created:', bankAccount.guid, 'State:', bankAccount.state)

    // Update user record with the external bank account GUID
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ 
        plaid_linked: true,
        cybrid_external_bank_account_guid: bankAccount.guid
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update user with bank account GUID:', updateError)
      // Don't fail - the bank account was created, just log the error
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        bank_account_guid: bankAccount.guid,
        state: bankAccount.state
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})