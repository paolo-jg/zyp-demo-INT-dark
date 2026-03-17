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

// Zyp's flat fee percentage to the user
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
    console.log('create-quote called')
    
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

    const { amount_usd, recipient_id } = await req.json()

    if (!amount_usd || amount_usd <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Cybrid customer GUID
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('cybrid_customer_guid, cybrid_account_guid')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.cybrid_customer_guid) {
      return new Response(
        JSON.stringify({ error: 'Please complete onboarding first' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cybridToken = await getCybridToken('prices:read quotes:execute quotes:read')
    console.log('Got Cybrid token')

    // Amount in base units (cents for USD)
    const amountInCents = Math.round(amount_usd * 100)

    // Create a funding quote to get Cybrid's fees
    const quoteResponse = await fetch(`${CYBRID_API_URL}/api/quotes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cybridToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_type: 'funding',
        customer_guid: userData.cybrid_customer_guid,
        asset: 'USD',
        side: 'deposit',
        receive_amount: amountInCents
      })
    })

    const quoteText = await quoteResponse.text()
    console.log('Quote response:', quoteText)

    if (!quoteResponse.ok) {
      throw new Error(`Failed to create quote: ${quoteText}`)
    }

    const quote = JSON.parse(quoteText)

    // Get live exchange rate
    const exchangeRate = await getExchangeRate()

    // Calculate fees
    // Cybrid's fee (from quote, in cents)
    const cybridFeeCents = quote.fee || 0
    const cybridFeeUsd = cybridFeeCents / 100
    const cybridFeePercent = amount_usd > 0 ? cybridFeeUsd / amount_usd : 0

    // Zyp's total fee is always 0.5% of the amount
    const totalFeeUsd = amount_usd * ZYP_TOTAL_FEE_PERCENT
    
    // Zyp's margin is the difference between our flat fee and Cybrid's cost
    const zypMarginUsd = Math.max(0, totalFeeUsd - cybridFeeUsd)
    const zypMarginPercent = Math.max(0, ZYP_TOTAL_FEE_PERCENT - cybridFeePercent)

    // Calculate PHP amount recipient will receive
    const phpAmount = amount_usd * exchangeRate

    // Total cost to user
    const totalCostUsd = amount_usd + totalFeeUsd

    return new Response(
      JSON.stringify({
        success: true,
        quote_guid: quote.guid,
        
        // Amounts
        amount_usd: amount_usd,
        amount_php: Math.round(phpAmount * 100) / 100,
        
        // Exchange rate
        exchange_rate: exchangeRate,
        
        // Fees (user only sees total 0.5%)
        fee_usd: Math.round(totalFeeUsd * 100) / 100,
        fee_percent: ZYP_TOTAL_FEE_PERCENT * 100, // 0.5
        
        // Internal breakdown (for analytics, not shown to user)
        _internal: {
          cybrid_fee_usd: Math.round(cybridFeeUsd * 100) / 100,
          cybrid_fee_percent: Math.round(cybridFeePercent * 10000) / 100,
          zyp_margin_usd: Math.round(zypMarginUsd * 100) / 100,
          zyp_margin_percent: Math.round(zypMarginPercent * 10000) / 100
        },
        
        // Totals
        total_cost_usd: Math.round(totalCostUsd * 100) / 100,
        recipient_gets_php: Math.round(phpAmount * 100) / 100,
        
        // Quote expiration
        expires_at: quote.expires_at || new Date(Date.now() + 30000).toISOString()
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