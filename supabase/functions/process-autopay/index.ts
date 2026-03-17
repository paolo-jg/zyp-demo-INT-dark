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
      scope: 'counterparties:execute counterparties:read transfers:execute transfers:read quotes:execute quotes:read'
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to get Cybrid token: ${await response.text()}`)
  }

  const data = await response.json()
  return data.access_token
}

// Create counterparty for sanctions screening
async function createCounterparty(token: string, customerGuid: string, recipient: any) {
  const isBusinessRecipient = recipient.type === 'business' || recipient.account_type === 'business'
  
  const body: any = {
    customer_guid: customerGuid,
    type: isBusinessRecipient ? 'business' : 'individual',
  }

  if (isBusinessRecipient) {
    body.name = {
      full: recipient.business_name || recipient.company || recipient.name
    }
  } else {
    const nameParts = (recipient.name || '').split(' ')
    body.name = {
      first: recipient.first_name || nameParts[0] || '',
      last: recipient.last_name || nameParts.slice(1).join(' ') || ''
    }
  }

  body.address = {
    country_code: 'PH'
  }

  const response = await fetch(`${CYBRID_API_URL}/api/counterparties`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create counterparty: ${errorText}`)
  }

  return response.json()
}

// Create a quote
async function createQuote(token: string, customerGuid: string, amount: number) {
  const response = await fetch(`${CYBRID_API_URL}/api/quotes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer_guid: customerGuid,
      product_type: 'funding',
      asset: 'USD',
      side: 'withdrawal',
      deliver_amount: Math.round(amount * 100)
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create quote: ${errorText}`)
  }

  return response.json()
}

// Execute the transfer
async function executeTransfer(token: string, quoteGuid: string, externalBankAccountGuid: string) {
  const response = await fetch(`${CYBRID_API_URL}/api/transfers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      quote_guid: quoteGuid,
      transfer_type: 'funding',
      external_bank_account_guid: externalBankAccountGuid
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to execute transfer: ${errorText}`)
  }

  return response.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client for server-side operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Also get user client if called from frontend
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    let specificPendingId: string | null = null

    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      
      const { data: { user } } = await supabaseClient.auth.getUser()
      userId = user?.id || null

      // Check if specific pending payment ID was provided
      try {
        const body = await req.json()
        specificPendingId = body.pending_id || null
      } catch {
        // No body provided, process all due payments
      }
    }

    // Build query for pending payments
    let query = supabaseAdmin
      .from('autopay_pending')
      .select(`
        *,
        rule:autopay_rules(*),
        invoice:invoices(*)
      `)
      .in('status', ['approved', 'pending'])
      .lte('scheduled_date', new Date().toISOString().split('T')[0])

    // If user is authenticated, only process their payments
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // If specific pending ID provided, only process that one
    if (specificPendingId) {
      query = query.eq('id', specificPendingId)
    }

    const { data: pendingPayments, error: fetchError } = await query

    if (fetchError) {
      throw new Error(`Failed to fetch pending payments: ${fetchError.message}`)
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending payments to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []
    let cybridToken: string | null = null

    for (const pending of pendingPayments) {
      // Skip if requires approval and not yet approved (unless specifically requested)
      if (pending.rule?.requires_approval && pending.status === 'pending' && !specificPendingId) {
        continue
      }

      try {
        // Get user data for Cybrid credentials
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', pending.user_id)
          .single()

        if (userError || !userData) {
          throw new Error('User not found')
        }

        // Verify user has Cybrid setup
        if (!userData.cybrid_customer_guid) {
          throw new Error('User has not completed Cybrid verification')
        }

        if (!userData.cybrid_external_bank_account_guid) {
          throw new Error('User has not linked a bank account')
        }

        // Get recipient data - try to find in recipients table
        const { data: recipientData } = await supabaseAdmin
          .from('recipients')
          .select('*')
          .eq('user_id', pending.user_id)
          .or(`name.eq.${pending.sender_name},company.eq.${pending.sender_name}`)
          .limit(1)
          .single()

        if (!recipientData) {
          throw new Error(`Recipient "${pending.sender_name}" not found in recipients list`)
        }

        // Get Cybrid token (reuse if available)
        if (!cybridToken) {
          cybridToken = await getCybridToken()
        }

        // Step 1: Create counterparty for sanctions check
        console.log(`Creating counterparty for ${pending.sender_name}...`)
        const counterparty = await createCounterparty(
          cybridToken, 
          userData.cybrid_customer_guid, 
          recipientData
        )

        // Check sanctions result
        if (counterparty.state === 'rejected' || counterparty.state === 'sanctioned') {
          throw new Error('Recipient failed compliance screening (sanctions check)')
        }

        // Step 2: Create quote
        console.log(`Creating quote for $${pending.amount}...`)
        const quote = await createQuote(
          cybridToken,
          userData.cybrid_customer_guid,
          pending.amount
        )

        // Step 3: Execute transfer
        console.log(`Executing transfer...`)
        const transfer = await executeTransfer(
          cybridToken,
          quote.guid,
          userData.cybrid_external_bank_account_guid
        )

        // Update pending payment status
        await supabaseAdmin
          .from('autopay_pending')
          .update({
            status: 'completed',
            executed_at: new Date().toISOString(),
            cybrid_transfer_guid: transfer.guid
          })
          .eq('id', pending.id)

        // Update invoice status if linked
        if (pending.invoice_id) {
          await supabaseAdmin
            .from('invoices')
            .update({ 
              status: 'fully_paid',
              updated_at: new Date().toISOString()
            })
            .eq('id', pending.invoice_id)
        }

        // Log successful execution
        await supabaseAdmin
          .from('autopay_logs')
          .insert({
            user_id: pending.user_id,
            rule_id: pending.rule_id,
            pending_id: pending.id,
            invoice_id: pending.invoice_id,
            action: 'executed',
            amount: pending.amount,
            sender_name: pending.sender_name,
            cybrid_transfer_guid: transfer.guid,
            metadata: {
              counterparty_guid: counterparty.guid,
              quote_guid: quote.guid,
              transfer_state: transfer.state
            }
          })

        // Create transaction record
        await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: pending.user_id,
            recipient_id: recipientData.id,
            type: 'Sent',
            amount: pending.amount,
            status: 'completed',
            description: `Autopay: ${pending.sender_name}`,
            cybrid_transfer_guid: transfer.guid,
            invoice_id: pending.invoice_id
          })

        results.push({
          pending_id: pending.id,
          success: true,
          transfer_guid: transfer.guid,
          amount: pending.amount,
          sender: pending.sender_name
        })

        console.log(`Successfully processed autopay for ${pending.sender_name}: $${pending.amount}`)

      } catch (error) {
        console.error(`Failed to process autopay ${pending.id}:`, error)

        // Update pending payment with error
        await supabaseAdmin
          .from('autopay_pending')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', pending.id)

        // Log failed execution
        await supabaseAdmin
          .from('autopay_logs')
          .insert({
            user_id: pending.user_id,
            rule_id: pending.rule_id,
            pending_id: pending.id,
            invoice_id: pending.invoice_id,
            action: 'failed',
            amount: pending.amount,
            sender_name: pending.sender_name,
            error_message: error.message
          })

        results.push({
          pending_id: pending.id,
          success: false,
          error: error.message,
          sender: pending.sender_name
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        succeeded: successCount,
        failed: failCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing autopay:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
