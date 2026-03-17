import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let rate: number | null = null
    let source = ''

    // Primary source: Coins.ph (direct USDC/PHP pair - real-time, no cache)
    try {
      const coinsResponse = await fetch(
        'https://api.pro.coins.ph/openapi/quote/v1/ticker/price?symbol=USDCPHP',
        { 
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000) // 3 second timeout for fast response
        }
      )
      
      if (coinsResponse.ok) {
        const data = await coinsResponse.json()
        if (data.price) {
          rate = parseFloat(data.price)
          source = 'coins.ph'
        }
      }
    } catch (e) {
      console.error('Coins.ph API error:', e)
    }

    // Fallback 1: CoinGecko
    if (!rate) {
      try {
        const geckoResponse = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=php',
          { signal: AbortSignal.timeout(3000) }
        )
        
        if (geckoResponse.ok) {
          const data = await geckoResponse.json()
          if (data['usd-coin']?.php) {
            rate = data['usd-coin'].php
            source = 'coingecko'
          }
        }
      } catch (e) {
        console.error('CoinGecko API error:', e)
      }
    }

    // Fallback 2: Forex rate
    if (!rate) {
      try {
        const forexResponse = await fetch(
          'https://open.er-api.com/v6/latest/USD',
          { signal: AbortSignal.timeout(3000) }
        )
        
        if (forexResponse.ok) {
          const data = await forexResponse.json()
          if (data.rates?.PHP) {
            rate = data.rates.PHP
            source = 'forex'
          }
        }
      } catch (e) {
        console.error('Forex API error:', e)
      }
    }

    // Fallback 3: Static rate
    if (!rate) {
      rate = 58.50
      source = 'fallback'
    }

    return new Response(
      JSON.stringify({
        rate,
        source,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Exchange rate error:', error)
    
    return new Response(
      JSON.stringify({
        rate: 58.50,
        source: 'error-fallback',
        error: error.message
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
