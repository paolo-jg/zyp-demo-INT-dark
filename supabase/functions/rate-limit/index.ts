// Supabase Edge Function for server-side rate limiting
// Deploy: supabase functions deploy rate-limit

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limit configurations
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number; lockoutMs: number }> = {
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 },
  transfer: { maxRequests: 10, windowMs: 60 * 1000, lockoutMs: 5 * 60 * 1000 },
  invoice: { maxRequests: 20, windowMs: 60 * 1000, lockoutMs: 5 * 60 * 1000 },
  recipient: { maxRequests: 20, windowMs: 60 * 1000, lockoutMs: 5 * 60 * 1000 },
  export: { maxRequests: 5, windowMs: 60 * 1000, lockoutMs: 5 * 60 * 1000 },
  password_reset: { maxRequests: 3, windowMs: 60 * 60 * 1000, lockoutMs: 60 * 60 * 1000 },
  pin_verify: { maxRequests: 5, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 },
}

serve(async (req) => {
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

    const { action, check_only } = await req.json()

    if (!action || !RATE_LIMITS[action]) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const config = RATE_LIMITS[action]
    const now = new Date()
    const windowStart = new Date(now.getTime() - config.windowMs)

    // Get current rate limit record
    const { data: rateLimit } = await supabaseClient
      .from('rate_limits')
      .select('*')
      .eq('user_id', user.id)
      .eq('action', action)
      .single()

    // Check if currently locked out
    if (rateLimit?.locked_until) {
      const lockUntil = new Date(rateLimit.locked_until)
      if (lockUntil > now) {
        const retryAfter = Math.ceil((lockUntil.getTime() - now.getTime()) / 1000)
        return new Response(
          JSON.stringify({
            allowed: false,
            locked: true,
            retryAfter,
            remaining: 0
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check if window has expired and reset
    let attempts = 0
    if (rateLimit) {
      const recordWindowStart = new Date(rateLimit.window_start)
      if (recordWindowStart < windowStart) {
        // Window expired, reset
        attempts = 0
      } else {
        attempts = rateLimit.attempts || 0
      }
    }

    // If just checking, return current status
    if (check_only) {
      return new Response(
        JSON.stringify({
          allowed: attempts < config.maxRequests,
          remaining: Math.max(0, config.maxRequests - attempts),
          locked: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Record the attempt
    const newAttempts = attempts + 1
    const isLocked = newAttempts >= config.maxRequests
    const lockUntil = isLocked ? new Date(now.getTime() + config.lockoutMs).toISOString() : null

    await supabaseClient
      .from('rate_limits')
      .upsert({
        user_id: user.id,
        action,
        attempts: newAttempts,
        window_start: attempts === 0 ? now.toISOString() : (rateLimit?.window_start || now.toISOString()),
        locked_until: lockUntil,
        updated_at: now.toISOString()
      })

    if (isLocked) {
      // Log the lockout
      await supabaseClient
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action: 'rate_limit_exceeded',
          details: { rate_limit_action: action, attempts: newAttempts }
        })

      return new Response(
        JSON.stringify({
          allowed: false,
          locked: true,
          retryAfter: Math.ceil(config.lockoutMs / 1000),
          remaining: 0
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        locked: false,
        remaining: config.maxRequests - newAttempts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
