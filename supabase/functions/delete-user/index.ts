// Supabase Edge Function: Delete User Account
// This function handles complete account deletion including auth user removal

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a Supabase client with the user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client for verifying the user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token or user not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Admin client for deleting data and auth user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Delete user data from all tables (order matters due to foreign keys)
    // 1. Delete activity logs
    await supabaseAdmin.from('activity_log').delete().eq('user_id', userId)
    
    // 2. Delete linked bank accounts
    await supabaseAdmin.from('linked_bank_accounts').delete().eq('user_id', userId)
    
    // 3. Delete kyb verifications
    await supabaseAdmin.from('kyb_verifications').delete().eq('user_id', userId)
    
    // 4. Delete cybrid transfers
    await supabaseAdmin.from('cybrid_transfers').delete().eq('user_id', userId)
    
    // 5. Delete transactions
    await supabaseAdmin.from('transactions').delete().eq('user_id', userId)
    
    // 6. Delete invoices (by user_id and recipient_id)
    await supabaseAdmin.from('invoices').delete().eq('user_id', userId)
    await supabaseAdmin.from('invoices').delete().eq('recipient_id', userId)
    
    // 7. Delete recipients (uses zyp_user_id)
    await supabaseAdmin.from('recipients').delete().eq('zyp_user_id', userId)
    
    // 8. Delete user profile
    await supabaseAdmin.from('users').delete().eq('id', userId)

    // 8. Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete auth user', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
