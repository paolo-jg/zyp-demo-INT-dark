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
      scope: 'transfers:read'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to get Cybrid token: ${await response.text()}`)
  }

  const data = await response.json()
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    console.log('get-transfer-status called')
    
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

    const { transfer_guid, transaction_id } = await req.json()

    if (!transfer_guid && !transaction_id) {
      return new Response(
        JSON.stringify({ error: 'Missing transfer_guid or transaction_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let cybridTransferGuid = transfer_guid

    // If transaction_id provided, get the transfer_guid from our database
    if (transaction_id && !transfer_guid) {
      const { data: transaction, error: txError } = await supabaseClient
        .from('transactions')
        .select('cybrid_transfer_guid')
        .eq('id', transaction_id)
        .eq('user_id', user.id)
        .single()

      if (txError || !transaction?.cybrid_transfer_guid) {
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      cybridTransferGuid = transaction.cybrid_transfer_guid
    }

    const cybridToken = await getCybridToken()

    // Get transfer status from Cybrid
    const response = await fetch(`${CYBRID_API_URL}/api/transfers/${cybridTransferGuid}`, {
      headers: {
        'Authorization': `Bearer ${cybridToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get transfer: ${await response.text()}`)
    }

    const transfer = await response.json()

    // Map Cybrid status to user-friendly status
    const statusMap: Record<string, string> = {
      'storing': 'Processing',
      'pending': 'Pending',
      'reviewing': 'Under Review',
      'completed': 'Completed',
      'failed': 'Failed'
    }

    // Map to our internal status
    const dbStatusMap: Record<string, string> = {
      'storing': 'pending',
      'pending': 'pending',
      'reviewing': 'pending',
      'completed': 'completed',
      'failed': 'failed'
    }

    const dbStatus = dbStatusMap[transfer.state] || 'pending'

    // Update our database if we have a transaction_id
    if (transaction_id) {
      await supabaseClient
        .from('transactions')
        .update({ 
          status: dbStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction_id)
        .eq('user_id', user.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        transfer_guid: transfer.guid,
        state: transfer.state,
        status_display: statusMap[transfer.state] || transfer.state,
        status_db: dbStatus,
        failure_code: transfer.failure_code,
        created_at: transfer.created_at,
        updated_at: transfer.updated_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
