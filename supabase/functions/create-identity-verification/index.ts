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
      scope: 'customers:read identity_verifications:execute identity_verifications:read'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to get Cybrid token: ${await response.text()}`)
  }

  const data = await response.json()
  return data.access_token
}

async function createIdentityVerification(token: string, customerGuid: string, type: string) {
  // Per Cybrid FAQ:
  // - Individual customer KYC: type="kyc", method="id_and_selfie" (60 min expiry)
  // - Business customer KYB: type="kyc", method="business_registration" (24 hr expiry)
  const isBusinessCustomer = type === 'business'
  
  const response = await fetch(`${CYBRID_API_URL}/api/identity_verifications`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer_guid: customerGuid,
      type: 'kyc',
      method: isBusinessCustomer ? 'business_registration' : 'id_and_selfie'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to create identity verification: ${await response.text()}`)
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

    // Must have Cybrid customer first
    if (!userData.cybrid_customer_guid) {
      return new Response(
        JSON.stringify({ error: 'Cybrid customer not created yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only US users need KYC
    if (userData.country !== 'United States') {
      return new Response(
        JSON.stringify({ error: 'KYC not required for this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cybridToken = await getCybridToken()
    const verification = await createIdentityVerification(
      cybridToken, 
      userData.cybrid_customer_guid,
      userData.account_type
    )

    // Save the inquiry ID for Persona
    await supabaseClient
      .from('users')
      .update({ 
        kyc_inquiry_id: verification.persona_inquiry_id,
        kyc_status: 'in_progress'
      })
      .eq('id', user.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        inquiry_id: verification.persona_inquiry_id,
        verification_guid: verification.guid,
        state: verification.state
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