import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      scope: 'customers:read identity_verifications:read'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to get Cybrid token: ${await response.text()}`)
  }

  const data = await response.json()
  return data.access_token
}

async function getIdentityVerifications(token: string, customerGuid: string) {
  const response = await fetch(`${CYBRID_API_URL}/api/identity_verifications?customer_guid=${customerGuid}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to get identity verifications: ${await response.text()}`)
  }

  return response.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 204 })
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
      .select('cybrid_customer_guid, kyc_status, kyc_inquiry_id')
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
        JSON.stringify({ error: 'No Cybrid customer found', kyc_status: 'not_started' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Cybrid token and fetch latest verification status
    const cybridToken = await getCybridToken()
    const verifications = await getIdentityVerifications(cybridToken, userData.cybrid_customer_guid)

    console.log('Verifications response:', JSON.stringify(verifications))

    // Find the most recent verification
    let latestVerification = null
    if (verifications.objects && verifications.objects.length > 0) {
      // Sort by created_at descending to get the latest
      latestVerification = verifications.objects.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
    }

    if (!latestVerification) {
      return new Response(
        JSON.stringify({ kyc_status: 'not_started', message: 'No verification found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Latest verification:', JSON.stringify(latestVerification))

    // Map Cybrid state/outcome to our kyc_status
    // Cybrid states: storing, waiting, pending, reviewing, completed, failed
    // Cybrid outcomes: passed, failed (only set when state is completed)
    let kycStatus = 'in_progress'
    
    if (latestVerification.state === 'completed') {
      if (latestVerification.outcome === 'passed') {
        kycStatus = 'completed'
      } else {
        kycStatus = 'failed'
      }
    } else if (latestVerification.state === 'failed') {
      kycStatus = 'failed'
    } else if (['storing', 'waiting', 'pending', 'reviewing'].includes(latestVerification.state)) {
      kycStatus = 'in_progress'
    }

    // Update user's kyc_status in database
    if (kycStatus !== userData.kyc_status) {
      await supabaseClient
        .from('users')
        .update({ kyc_status: kycStatus })
        .eq('id', user.id)
    }

    return new Response(
      JSON.stringify({ 
        kyc_status: kycStatus,
        state: latestVerification.state,
        outcome: latestVerification.outcome,
        persona_inquiry_id: latestVerification.persona_inquiry_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error checking KYC status:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
