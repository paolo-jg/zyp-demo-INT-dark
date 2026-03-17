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
      scope: 'workflows:execute workflows:read'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to get Cybrid token: ${await response.text()}`)
  }

  const data = await response.json()
  return data.access_token
}

async function createPlaidWorkflow(token: string, customerGuid: string) {
  // Step 1: Create workflow with kind: link_token_create (per Cybrid docs)
  const response = await fetch(`${CYBRID_API_URL}/api/workflows`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer_guid: customerGuid,
      kind: 'link_token_create'  // Changed from type: 'plaid' per Cybrid docs
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to create Plaid workflow: ${await response.text()}`)
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
    const workflow = await createPlaidWorkflow(cybridToken, userData.cybrid_customer_guid)

    // If plaid_link_token is not immediately available, fetch the workflow
    let linkToken = workflow.plaid_link_token
    if (!linkToken && workflow.guid) {
      // Per Cybrid docs: "Use the workflow guid from the response to retrieve 
      // a plaid_link_token using the GET /api/workflows/{guid} endpoint"
      const getResponse = await fetch(`${CYBRID_API_URL}/api/workflows/${workflow.guid}`, {
        headers: {
          'Authorization': `Bearer ${cybridToken}`,
          'Content-Type': 'application/json'
        }
      })
      if (getResponse.ok) {
        const workflowDetails = await getResponse.json()
        linkToken = workflowDetails.plaid_link_token
      }
    }

    if (!linkToken) {
      throw new Error('Failed to retrieve Plaid link token from workflow')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        plaid_link_token: linkToken,
        workflow_guid: workflow.guid
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