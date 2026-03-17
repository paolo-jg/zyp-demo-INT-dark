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

// Zyp's flat fee percentage
const ZYP_TOTAL_FEE_PERCENT = 0.005 // 0.5%

async function getCybridToken(scopes: string): Promise<string> {
  const response = await fetch(`${CYBRID_ID_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: CYBRID_CLIENT_ID,
      client_secret: CYBRID_CLIENT_SECRET,
      scope: scopes
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to get Cybrid token: ${await response.text()}`)
  }

  const data = await response.json()
  return data.access_token
}

// Create counterparty for sanctions screening with Philippine bank details
async function createCounterparty(token: string, customerGuid: string, recipient: any) {
  const isBusinessRecipient = recipient.type === 'business' || recipient.account_type === 'business'
  
  const body: any = {
    customer_guid: customerGuid,
    type: isBusinessRecipient ? 'business' : 'individual',
  }

  // Set name based on recipient type
  if (isBusinessRecipient) {
    body.name = {
      full: recipient.business_name || recipient.company || recipient.name
    }
  } else {
    // Parse name into first/last
    const nameParts = (recipient.name || recipient.accountName || '').split(' ')
    body.name = {
      first: recipient.firstName || nameParts[0] || '',
      last: recipient.lastName || nameParts.slice(1).join(' ') || ''
    }
  }

  // Add Philippine address for sanctions screening
  body.address = {
    street: recipient.address || '',
    city: recipient.city || '',
    country_code: 'PH'
  }

  console.log('Creating counterparty:', JSON.stringify(body))

  const response = await fetch(`${CYBRID_API_URL}/api/counterparties`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const responseText = await response.text()
  console.log('Counterparty response:', responseText)

  if (!response.ok) {
    throw new Error(`Failed to create counterparty: ${responseText}`)
  }

  return JSON.parse(responseText)
}

// Create external bank account for Philippine recipient (for payout)
async function createRecipientBankAccount(
  token: string, 
  customerGuid: string, 
  counterpartyGuid: string, 
  recipient: any
) {
  // Philippine bank account details
  const body = {
    name: recipient.accountName || recipient.name,
    account_kind: 'raw_routing_details',
    customer_guid: customerGuid,
    counterparty_guid: counterpartyGuid,
    asset: 'PHP', // Philippine Peso for payout
    counterparty_bank_account: {
      routing_number_type: 'bic', // SWIFT/BIC for Philippine banks
      routing_number: recipient.swiftCode || recipient.bankCode || '',
      account_number: recipient.accountNumber || ''
    }
  }

  console.log('Creating recipient bank account:', JSON.stringify(body))

  const response = await fetch(`${CYBRID_API_URL}/api/external_bank_accounts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const responseText = await response.text()
  console.log('Recipient bank account response:', responseText)

  if (!response.ok) {
    throw new Error(`Failed to create recipient bank account: ${responseText}`)
  }

  return JSON.parse(responseText)
}

// Create a funding quote (to pull USD from user's US bank)
async function createFundingQuote(token: string, customerGuid: string, amountCents: number) {
  const response = await fetch(`${CYBRID_API_URL}/api/quotes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      product_type: 'funding',
      customer_guid: customerGuid,
      asset: 'USD',
      side: 'deposit',
      receive_amount: amountCents
    })
  })

  const responseText = await response.text()
  console.log('Funding quote response:', responseText)

  if (!response.ok) {
    throw new Error(`Failed to create funding quote: ${responseText}`)
  }

  return JSON.parse(responseText)
}

// Execute the funding transfer (pull USD from user's bank via ACH)
async function executeFundingTransfer(token: string, quoteGuid: string, externalBankAccountGuid: string) {
  const response = await fetch(`${CYBRID_API_URL}/api/transfers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      quote_guid: quoteGuid,
      transfer_type: 'funding',
      external_bank_account_guid: externalBankAccountGuid,
      payment_rail: 'ach'
    })
  })

  const responseText = await response.text()
  console.log('Funding transfer response:', responseText)

  if (!response.ok) {
    throw new Error(`Failed to execute funding transfer: ${responseText}`)
  }

  return JSON.parse(responseText)
}

// Get exchange rate for USD/PHP
async function getExchangeRate(): Promise<number> {
  try {
    const response = await fetch('https://api.pro.coins.ph/openapi/quote/v1/ticker/price?symbol=USDCPHP')
    if (response.ok) {
      const data = await response.json()
      if (data.price) {
        return parseFloat(data.price)
      }
    }
  } catch (e) {
    console.log('Failed to fetch live rate:', e.message)
  }
  return 56.50 // Fallback rate
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    console.log('create-transfer called')
    
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

    const { amount, recipient } = await req.json()

    if (!amount || !recipient) {
      return new Response(
        JSON.stringify({ error: 'Missing amount or recipient' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get sender's data
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

    // Verify user is set up
    if (!userData.cybrid_customer_guid) {
      return new Response(
        JSON.stringify({ error: 'Please complete identity verification first' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userData.cybrid_external_bank_account_guid) {
      return new Response(
        JSON.stringify({ error: 'Please link a bank account first' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Cybrid token with all required scopes
    const cybridToken = await getCybridToken(
      'counterparties:execute counterparties:read external_bank_accounts:execute external_bank_accounts:read quotes:execute quotes:read transfers:execute transfers:read'
    )
    console.log('Got Cybrid token')

    // Step 1: Create counterparty for sanctions screening
    console.log('Step 1: Creating counterparty for sanctions check...')
    const counterparty = await createCounterparty(
      cybridToken, 
      userData.cybrid_customer_guid, 
      recipient
    )
    console.log('Counterparty created:', counterparty.guid, 'State:', counterparty.state)

    // Check if counterparty passed sanctions
    if (counterparty.state === 'rejected' || counterparty.state === 'sanctioned') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Transfer blocked: recipient did not pass compliance screening',
          blocked: true,
          reason: 'sanctions'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Create funding quote (to pull USD)
    // Calculate total with fee (0.5%)
    const feeUsd = amount * ZYP_TOTAL_FEE_PERCENT
    const totalAmountCents = Math.round((amount + feeUsd) * 100)
    
    console.log('Step 2: Creating funding quote for', totalAmountCents, 'cents...')
    const fundingQuote = await createFundingQuote(
      cybridToken, 
      userData.cybrid_customer_guid, 
      totalAmountCents
    )
    console.log('Funding quote created:', fundingQuote.guid)

    // Step 3: Execute funding transfer (pull from user's US bank)
    console.log('Step 3: Executing funding transfer...')
    const fundingTransfer = await executeFundingTransfer(
      cybridToken, 
      fundingQuote.guid, 
      userData.cybrid_external_bank_account_guid
    )
    console.log('Funding transfer executed:', fundingTransfer.guid, 'State:', fundingTransfer.state)

    // Step 4: Get exchange rate and calculate PHP amount
    const exchangeRate = await getExchangeRate()
    const phpAmount = amount * exchangeRate

    // Step 5: Record transaction in our database
    const { data: transaction, error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        recipient_id: recipient.id || null,
        recipient_name: recipient.name || recipient.accountName,
        recipient_email: recipient.email || null,
        recipient_bank: recipient.bankName || recipient.bank || null,
        amount_sent: amount,
        fee: feeUsd,
        fee_percentage: ZYP_TOTAL_FEE_PERCENT * 100, // Store as 0.5
        amount_received: phpAmount,
        currency_sent: 'USD',
        currency_received: recipient.receivingCurrency || 'PHP',
        exchange_rate: exchangeRate,
        status: 'pending',
        estimated_arrival: '1-2 business days',
        cybrid_transfer_guid: fundingTransfer.guid,
        cybrid_counterparty_guid: counterparty.guid,
        cybrid_quote_guid: fundingQuote.guid,
        cybrid_status: fundingTransfer.state
      })
      .select()
      .single()

    if (txError) {
      console.error('Failed to record transaction:', txError)
      // Don't fail the whole request - transfer was initiated
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        transfer_guid: fundingTransfer.guid,
        transfer_state: fundingTransfer.state,
        counterparty_guid: counterparty.guid,
        quote_guid: fundingQuote.guid,
        transaction_id: transaction?.id,
        
        // Amounts for UI
        amount_usd: amount,
        amount_php: Math.round(phpAmount * 100) / 100,
        fee_usd: Math.round(feeUsd * 100) / 100,
        fee_percent: ZYP_TOTAL_FEE_PERCENT * 100,
        total_usd: Math.round((amount + feeUsd) * 100) / 100,
        exchange_rate: exchangeRate,
        
        estimated_arrival: '1-2 business days'
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