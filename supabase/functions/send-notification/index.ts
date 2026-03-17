// Supabase Edge Function: Send email notifications via Resend
// Deploy with: supabase functions deploy send-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email templates
const EMAIL_TEMPLATES = {
  transfer_completed: {
    subject: 'Transfer Complete - ${amount} sent to ${recipientName}',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
          <div style="width: 64px; height: 64px; background: white; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;"><span style="font-size: 32px;">✓</span></div>
          <h1 style="color: white; margin: 0; font-size: 24px;">Transfer Complete!</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Great news, {{firstName}}! Your transfer has been completed successfully.</p>
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Amount Sent:</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #10b981;">{{amount}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Amount Received:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">{{amountReceived}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Recipient:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">{{recipientName}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Fee:</td><td style="padding: 8px 0; text-align: right;">{{fee}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Reference:</td><td style="padding: 8px 0; text-align: right; font-family: monospace;">{{reference}}</td></tr>
            </table>
          </div>
          <a href="https://app.tryzyp.com" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-weight: 600; margin-top: 24px;">View in Dashboard</a>
        </div>
        <div style="padding: 24px; text-align: center; background: #111827;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 Zyp. All rights reserved.</p>
        </div>
      </div>
    `,
  },
  
  transfer_failed: {
    subject: 'Transfer Failed - Action Required',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Transfer Failed</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {{firstName}},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Unfortunately, your transfer of <strong>{{amount}}</strong> to <strong>{{recipientName}}</strong> could not be completed.</p>
          <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #fecaca;">
            <p style="color: #991b1b; margin: 0; font-weight: 600;">Reason: {{failureReason}}</p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your funds have not been debited. Please review the recipient details and try again.</p>
          <a href="https://app.tryzyp.com" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-weight: 600; margin-top: 24px;">Retry Transfer</a>
        </div>
        <div style="padding: 24px; text-align: center; background: #111827;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Need help? Contact support@tryzyp.com</p>
        </div>
      </div>
    `,
  },
  
  invoice_paid: {
    subject: 'Invoice {{invoiceNumber}} Paid - ${amount}',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
          <div style="width: 64px; height: 64px; background: white; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;"><span style="font-size: 32px;">💰</span></div>
          <h1 style="color: white; margin: 0; font-size: 24px;">Invoice Paid!</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Great news, {{firstName}}! Invoice <strong>#{{invoiceNumber}}</strong> has been paid.</p>
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Invoice #:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">{{invoiceNumber}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Amount:</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #10b981;">{{amount}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Paid By:</td><td style="padding: 8px 0; text-align: right;">{{paidBy}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Paid On:</td><td style="padding: 8px 0; text-align: right;">{{paidDate}}</td></tr>
            </table>
          </div>
          <a href="https://app.tryzyp.com" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-weight: 600; margin-top: 24px;">View in Dashboard</a>
        </div>
        <div style="padding: 24px; text-align: center; background: #111827;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 Zyp. All rights reserved.</p>
        </div>
      </div>
    `,
  },
  
  payment_received: {
    subject: 'Payment Received - ${amount}',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
          <div style="width: 64px; height: 64px; background: white; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;"><span style="font-size: 32px;">🎉</span></div>
          <h1 style="color: white; margin: 0; font-size: 24px;">Payment Received!</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {{firstName}},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">You've received a payment of <strong style="color: #10b981; font-size: 24px;">{{amount}}</strong></p>
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">From:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">{{senderName}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Amount:</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #10b981;">{{amount}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Reference:</td><td style="padding: 8px 0; text-align: right; font-family: monospace;">{{reference}}</td></tr>
            </table>
          </div>
          <p style="color: #6b7280; font-size: 14px;">The funds should arrive in your bank account within 1-2 business days.</p>
        </div>
        <div style="padding: 24px; text-align: center; background: #111827;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 Zyp. All rights reserved.</p>
        </div>
      </div>
    `,
  },
  
  security_alert: {
    subject: '⚠️ Security Alert - {{alertType}}',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Security Alert</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {{firstName}},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">We detected the following activity on your account:</p>
          <div style="background: #fef2f2; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #fecaca;">
            <p style="color: #991b1b; margin: 0 0 12px; font-weight: 600;">{{alertType}}</p>
            <p style="color: #7f1d1d; margin: 0; font-size: 14px;">{{alertDetails}}</p>
            <p style="color: #9ca3af; margin: 12px 0 0; font-size: 12px;">Time: {{timestamp}}</p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">If this was you, no action is needed. If you didn't make this change, please secure your account immediately.</p>
          <a href="https://app.tryzyp.com/settings" style="display: block; background: #dc2626; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-weight: 600; margin-top: 24px;">Secure My Account</a>
        </div>
        <div style="padding: 24px; text-align: center; background: #111827;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">If you need help, contact support@tryzyp.com immediately.</p>
        </div>
      </div>
    `,
  },
  
  large_transfer_alert: {
    subject: '🔔 Large Transfer Alert - ${amount}',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Large Transfer Alert</h1>
        </div>
        <div style="padding: 32px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi {{firstName}},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">A large transfer was initiated from your account:</p>
          <div style="background: #fffbeb; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #fde68a;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Amount:</td><td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 20px; color: #d97706;">{{amount}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Recipient:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">{{recipientName}}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Time:</td><td style="padding: 8px 0; text-align: right;">{{timestamp}}</td></tr>
            </table>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">If you didn't initiate this transfer, please contact us immediately.</p>
        </div>
        <div style="padding: 24px; text-align: center; background: #111827;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">You can adjust large transfer alerts in your notification settings.</p>
        </div>
      </div>
    `,
  },
}

// Replace template variables
function renderTemplate(template: string, data: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '')
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value || '')
  }
  return result
}

// Send email via Resend
async function sendEmail(to: string, template: string, data: Record<string, string>) {
  const emailTemplate = EMAIL_TEMPLATES[template]
  if (!emailTemplate) {
    throw new Error(`Unknown email template: ${template}`)
  }
  
  const subject = renderTemplate(emailTemplate.subject, data)
  const html = renderTemplate(emailTemplate.html, data)
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Zyp <noreply@notifications.tryzyp.com>',
      to: [to],
      subject,
      html,
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend API error: ${error}`)
  }
  
  return await response.json()
}

// Log notification
async function logNotification(
  supabase: any,
  userId: string,
  eventType: string,
  recipient: string,
  subject: string | null,
  status: string,
  errorMessage: string | null,
  metadata: any
) {
  await supabase.from('notification_log').insert({
    user_id: userId,
    notification_type: 'email',
    event_type: eventType,
    recipient,
    subject,
    status,
    error_message: errorMessage,
    metadata,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    const { userId, eventType, data, forceEmail = false } = await req.json()
    
    if (!userId || !eventType || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, eventType, data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, first_name')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    const preferences = prefs || {
      email_transfer_initiated: true,
      email_transfer_completed: true,
      email_transfer_failed: true,
      email_invoice_received: true,
      email_invoice_paid: true,
      email_payment_received: true,
      email_security_alerts: true,
      email_large_transfer_alerts: true,
    }
    
    const templateData = { firstName: user.first_name || 'there', ...data }
    
    const prefKeyMap: Record<string, string> = {
      transfer_completed: 'email_transfer_completed',
      transfer_failed: 'email_transfer_failed',
      invoice_paid: 'email_invoice_paid',
      payment_received: 'email_payment_received',
      security_alert: 'email_security_alerts',
      large_transfer_alert: 'email_large_transfer_alerts',
    }
    
    const prefKey = prefKeyMap[eventType]
    if (!prefKey) {
      return new Response(
        JSON.stringify({ error: `Unknown event type: ${eventType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    let result = null
    const shouldSendEmail = forceEmail || preferences[prefKey]
    
    if (shouldSendEmail && user.email && EMAIL_TEMPLATES[eventType]) {
      try {
        result = await sendEmail(user.email, eventType, templateData)
        await logNotification(
          supabase, userId, eventType, user.email,
          renderTemplate(EMAIL_TEMPLATES[eventType].subject, templateData),
          'sent', null, { resend_id: result.id }
        )
      } catch (error) {
        result = { error: error.message }
        await logNotification(supabase, userId, eventType, user.email, null, 'failed', error.message, {})
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
