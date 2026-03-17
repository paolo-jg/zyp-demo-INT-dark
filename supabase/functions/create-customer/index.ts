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
      scope: 'customers:write customers:read'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get Cybrid token: ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

interface CybridCustomerPayload {
  type: 'individual' | 'business'
  name?: {
    first: string
    last: string
    middle?: string
  }
  business_name?: string
  email?: string
  phone?: string
  address?: {
    street: string
    street2?: string
    city: string
    subdivision: string
    postal_code: string
    country_code: string
  }
  date_of_birth?: string // YYYY-MM-DD format
}

async function createCybridCustomer(token: string, payload: CybridCustomerPayload) {
  const response = await fetch(`${CYBRID_API_URL}/api/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create Cybrid customer: ${errorText}`)
  }

  return response.json()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check for Cybrid credentials
    if (!CYBRID_CLIENT_ID || !CYBRID_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Cybrid credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user details from database
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if customer already exists
    if (userData.cybrid_customer_guid) {
      return new Response(
        JSON.stringify({ 
          success: true,
          customer_guid: userData.cybrid_customer_guid,
          message: 'Customer already exists'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only US users need Cybrid customers (senders)
    if (userData.country !== 'United States') {
      return new Response(
        JSON.stringify({ error: 'Cybrid customer creation only required for US users' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Cybrid access token
    const cybridToken = await getCybridToken()

    // Build customer payload based on account type
    const isBusinessAccount = userData.account_type === 'business'
    
    const customerPayload: CybridCustomerPayload = {
      type: isBusinessAccount ? 'business' : 'individual',
    }

    if (isBusinessAccount) {
      // Business customer
      customerPayload.business_name = userData.business_name || userData.company_name
    } else {
      // Individual customer
      customerPayload.name = {
        first: userData.first_name,
        last: userData.last_name,
      }
      
      // Add date of birth if available (required for KYC)
      if (userData.date_of_birth) {
        customerPayload.date_of_birth = userData.date_of_birth
      }
    }

    // Add email if available
    if (userData.email || user.email) {
      customerPayload.email = userData.email || user.email
    }

    // Add phone if available
    if (userData.phone) {
      customerPayload.phone = userData.phone
    }

    // Add address if available
    if (userData.address || userData.street_address) {
      customerPayload.address = {
        street: userData.street_address || userData.address,
        city: userData.city || '',
        subdivision: userData.state || '', // State/province code
        postal_code: userData.zip_code || userData.postal_code || '',
        country_code: 'US'
      }
    }

    // Create customer in Cybrid
    const customer = await createCybridCustomer(cybridToken, customerPayload)

    // Save customer GUID to user record
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ 
        cybrid_customer_guid: customer.guid,
        cybrid_customer_state: customer.state
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update user with customer GUID:', updateError)
      // Don't fail the request - customer was created successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        customer_guid: customer.guid,
        state: customer.state,
        type: customer.type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Cybrid customer:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
