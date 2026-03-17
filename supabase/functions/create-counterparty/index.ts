import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CYBRID_API_URL = Deno.env.get('CYBRID_API_URL') || 'https://bank.sandbox.cybrid.app'
const CYBRID_CLIENT_ID = Deno.env.get('CYBRID_BANK_CLIENT_ID')
const CYBRID_CLIENT_SECRET = Deno.env.get('CYBRID_BANK_CLIENT_SECRET')
const CYBRID_BANK_GUID = Deno.env.get('CYBRID_BANK_GUID')

async function getCybridToken(): Promise<string> {
  const response = await fetch('https://id.sandbox.cybrid.app/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: CYBRID_CLIENT_ID,
      client_secret: CYBRID_CLIENT_SECRET,
      scope: 'counterparties:read counterparties:write counterparties:execute'
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Cybrid token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { type, firstName, lastName, businessName, dateOfBirth, address } = await req.json()

    // Validate required fields
    if (!type || !firstName || !lastName || !address) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For individuals, date of birth is required
    if (type === 'individual' && !dateOfBirth) {
      return new Response(
        JSON.stringify({ success: false, error: 'Date of birth is required for individual counterparties' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Cybrid token
    const token = await getCybridToken()

    // Build counterparty request body based on type
    const counterpartyBody: any = {
      type: type,
      name: {
        first: firstName,
        last: lastName
      },
      address: {
        street: address.street,
        city: address.city,
        subdivision: address.subdivision,
        postal_code: address.postalCode,
        country_code: address.countryCode
      }
    }

    // Add business name for business counterparties
    if (type === 'business' && businessName) {
      counterpartyBody.name.full = businessName
    }

    // Add date of birth for individual counterparties
    if (type === 'individual' && dateOfBirth) {
      counterpartyBody.date_of_birth = dateOfBirth
    }

    console.log('Creating counterparty:', JSON.stringify(counterpartyBody))

    // Create counterparty in Cybrid
    const counterpartyResponse = await fetch(`${CYBRID_API_URL}/api/counterparties`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(counterpartyBody)
    })

    if (!counterpartyResponse.ok) {
      const errorText = await counterpartyResponse.text()
      console.error('Cybrid counterparty creation failed:', errorText)
      return new Response(
        JSON.stringify({ success: false, error: `Counterparty creation failed: ${errorText}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const counterpartyData = await counterpartyResponse.json()
    console.log('Counterparty created:', counterpartyData.guid)

    // Save counterparty GUID to user record
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        cybrid_counterparty_guid: counterpartyData.guid,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to save counterparty GUID:', updateError)
      // Don't fail - counterparty was created successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        counterparty_guid: counterpartyData.guid,
        state: counterpartyData.state
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating counterparty:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
