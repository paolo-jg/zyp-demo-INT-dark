// Supabase Edge Function for secure PIN operations
// Deploy: supabase functions deploy verify-pin
// Set secret: supabase secrets set PIN_SALT="your-secure-random-salt-here"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Secure hash function using server-side salt
async function hashPin(pin: string): Promise<string> {
  const salt = Deno.env.get('PIN_SALT') || 'fallback-salt-change-in-production'
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, pin, newPin } = await req.json()

    // Rate limiting check
    const { data: rateLimit } = await supabaseClient
      .from('rate_limits')
      .select('*')
      .eq('user_id', user.id)
      .eq('action', 'pin_verify')
      .single()

    if (rateLimit?.locked_until && new Date(rateLimit.locked_until) > new Date()) {
      const remainingSeconds = Math.ceil((new Date(rateLimit.locked_until).getTime() - Date.now()) / 1000)
      return new Response(
        JSON.stringify({ 
          error: 'Too many attempts', 
          locked: true,
          retryAfter: remainingSeconds 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's stored PIN hash
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('transaction_pin')
      .eq('id', user.id)
      .single()

    if (userError) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (action) {
      case 'hash': {
        // Hash a new PIN (for setting up PIN)
        if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
          return new Response(
            JSON.stringify({ error: 'Invalid PIN format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const hash = await hashPin(pin)
        return new Response(
          JSON.stringify({ hash }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'verify': {
        // Verify PIN against stored hash
        if (!pin || !userData.transaction_pin) {
          return new Response(
            JSON.stringify({ error: 'PIN required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const inputHash = await hashPin(pin)
        const isValid = inputHash === userData.transaction_pin

        if (!isValid) {
          // Record failed attempt
          const attempts = (rateLimit?.attempts || 0) + 1
          const lockUntil = attempts >= 5 
            ? new Date(Date.now() + 15 * 60 * 1000).toISOString() // Lock for 15 min
            : null

          await supabaseClient
            .from('rate_limits')
            .upsert({
              user_id: user.id,
              action: 'pin_verify',
              attempts,
              locked_until: lockUntil,
              window_start: rateLimit?.window_start || new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          // Log failed attempt
          await supabaseClient
            .from('security_audit_log')
            .insert({
              user_id: user.id,
              action: 'pin_verify_failed',
              details: { attempts_remaining: Math.max(0, 5 - attempts) }
            })

          return new Response(
            JSON.stringify({ 
              valid: false, 
              attemptsRemaining: Math.max(0, 5 - attempts),
              locked: attempts >= 5
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Success - clear rate limit
        await supabaseClient
          .from('rate_limits')
          .delete()
          .eq('user_id', user.id)
          .eq('action', 'pin_verify')

        // Log successful verification
        await supabaseClient
          .from('security_audit_log')
          .insert({
            user_id: user.id,
            action: 'pin_verify_success',
            details: {}
          })

        return new Response(
          JSON.stringify({ valid: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'change': {
        // Change PIN (requires current PIN verification first)
        if (!pin || !newPin) {
          return new Response(
            JSON.stringify({ error: 'Current and new PIN required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify current PIN
        const currentHash = await hashPin(pin)
        if (currentHash !== userData.transaction_pin) {
          return new Response(
            JSON.stringify({ error: 'Current PIN is incorrect' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate new PIN
        if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
          return new Response(
            JSON.stringify({ error: 'New PIN must be 4 digits' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Hash and store new PIN
        const newHash = await hashPin(newPin)
        await supabaseClient
          .from('users')
          .update({ transaction_pin: newHash })
          .eq('id', user.id)

        // Log PIN change
        await supabaseClient
          .from('security_audit_log')
          .insert({
            user_id: user.id,
            action: 'pin_changed',
            details: {}
          })

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
