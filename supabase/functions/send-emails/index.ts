import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GraphTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface EmailQueueItem {
  id: string;
  to_email: string;
  subject: string;
  body_html: string;
  body_text: string;
  reply_to: string | null;
  template_name: string;
  template_data: Record<string, any>;
  priority: number;
  send_at: string;
}

const EMAIL_TEMPLATES: Record<string, string> = {
  ticket_created: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .ticket-info { background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .ticket-info h2 { margin: 0 0 10px 0; font-size: 18px; color: #1f2937; }
    .field { margin: 8px 0; }
    .field-label { font-weight: 600; color: #6b7280; display: inline-block; width: 100px; }
    .priority { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .priority-low { background-color: #dbeafe; color: #1e40af; }
    .priority-medium { background-color: #fef3c7; color: #92400e; }
    .priority-high { background-color: #fee2e2; color: #991b1b; }
    .priority-urgent { background-color: #fecaca; color: #7f1d1d; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .description { background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 15px 0; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="header"><h1>Ticket Created Successfully</h1></div>
  <div class="content">
    <p>Hello {{requester_name}},</p>
    <p>Your ticket has been created successfully. Here are the details:</p>
    <div class="ticket-info">
      <h2>{{ticket_number}} - {{title}}</h2>
      <div class="field"><span class="field-label">Status:</span> <span>{{status}}</span></div>
      <div class="field"><span class="field-label">Priority:</span> <span class="priority priority-{{priority}}">{{priority}}</span></div>
      <div class="field"><span class="field-label">Created:</span> <span>{{created_at}}</span></div>
    </div>
    <div class="description"><strong>Description:</strong><br>{{description}}</div>
    <p>You can reply to this email to add comments to your ticket.</p>
    <a href="https://servicedesk.promptandpause.com/my-tickets" class="button">View Your Ticket</a>
  </div>
  <div class="footer"><p>Service Desk Team<br>{{support_email}}</p></div>
</body>
</html>`,

  ticket_updated: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .ticket-info { background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .ticket-info h2 { margin: 0 0 10px 0; font-size: 18px; color: #1f2937; }
    .field { margin: 8px 0; }
    .field-label { font-weight: 600; color: #6b7280; display: inline-block; width: 100px; }
    .priority { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .priority-low { background-color: #dbeafe; color: #1e40af; }
    .priority-medium { background-color: #fef3c7; color: #92400e; }
    .priority-high { background-color: #fee2e2; color: #991b1b; }
    .priority-urgent { background-color: #fecaca; color: #7f1d1d; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .update-notice { background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 6px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header"><h1>Ticket Updated</h1></div>
  <div class="content">
    <p>Hello {{requester_name}},</p>
    <p>Your ticket has been updated. Here are the current details:</p>
    <div class="ticket-info">
      <h2>{{ticket_number}} - {{title}}</h2>
      <div class="field"><span class="field-label">Status:</span> <span>{{status}}</span></div>
      <div class="field"><span class="field-label">Priority:</span> <span class="priority priority-{{priority}}">{{priority}}</span></div>
      <div class="field"><span class="field-label">Updated:</span> <span>{{updated_at}}</span></div>
    </div>
    <div class="update-notice"><strong>Reply to this email</strong> to add a comment to your ticket.</div>
    <a href="https://servicedesk.promptandpause.com/my-tickets" class="button">View Your Ticket</a>
  </div>
  <div class="footer"><p>Service Desk Team<br>{{support_email}}</p></div>
</body>
</html>`,

  ticket_resolved: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background-color: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .ticket-info { background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .ticket-info h2 { margin: 0 0 10px 0; font-size: 18px; color: #1f2937; }
    .field { margin: 8px 0; }
    .field-label { font-weight: 600; color: #6b7280; display: inline-block; width: 100px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .resolved-notice { background-color: #d1fae5; border: 1px solid #a7f3d0; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .rating-section { background-color: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
    .rating-button { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header"><h1>Ticket Resolved</h1></div>
  <div class="content">
    <p>Hello {{requester_name}},</p>
    <div class="resolved-notice"><strong>Good news!</strong> Your ticket has been marked as resolved.</div>
    <div class="ticket-info">
      <h2>{{ticket_number}} - {{title}}</h2>
      <div class="field"><span class="field-label">Status:</span> <span>{{status}}</span></div>
      <div class="field"><span class="field-label">Resolved:</span> <span>{{resolved_at}}</span></div>
    </div>
    <div class="rating-section">
      <p><strong>How did we do?</strong></p>
      <p>Please rate the service you received:</p>
      <a href="https://servicedesk.promptandpause.com/rate-ticket/{{ticket_id}}" class="rating-button">Rate This Ticket</a>
    </div>
    <p>If you need additional help, please reply to this email.</p>
    <a href="https://servicedesk.promptandpause.com/my-tickets" class="button">View Your Ticket</a>
  </div>
  <div class="footer"><p>Service Desk Team<br>{{support_email}}</p></div>
</body>
</html>`,

  ticket_closed: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
    .header { background-color: #6b7280; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .ticket-info { background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .ticket-info h2 { margin: 0 0 10px 0; font-size: 18px; color: #1f2937; }
    .field { margin: 8px 0; }
    .field-label { font-weight: 600; color: #6b7280; display: inline-block; width: 100px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .closed-notice { background-color: #e5e7eb; border: 1px solid #d1d5db; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .rating-reminder { background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; text-align: center; }
    .rating-button { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header"><h1>Ticket Closed</h1></div>
  <div class="content">
    <p>Hello {{requester_name}},</p>
    <div class="closed-notice"><strong>Your ticket has been closed.</strong> No further updates will be made.</div>
    <div class="ticket-info">
      <h2>{{ticket_number}} - {{title}}</h2>
      <div class="field"><span class="field-label">Status:</span> <span>{{status}}</span></div>
      <div class="field"><span class="field-label">Closed:</span> <span>{{closed_at}}</span></div>
    </div>
    <div class="rating-reminder">
      <p><strong>Still want to rate your experience?</strong></p>
      <a href="https://servicedesk.promptandpause.com/rate-ticket/{{ticket_id}}" class="rating-button">Rate This Ticket</a>
    </div>
    <p>If you need further assistance, please create a new ticket.</p>
    <a href="https://servicedesk.promptandpause.com/my-tickets" class="button">View Your Tickets</a>
  </div>
  <div class="footer"><p>Service Desk Team<br>{{support_email}}</p></div>
</body>
</html>`,
};

async function getGraphAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Graph token: ${error}`);
  }

  const data: GraphTokenResponse = await response.json();
  return data.access_token;
}

async function sendEmail(
  accessToken: string,
  mailboxEmail: string,
  to: string,
  subject: string,
  htmlBody: string,
  replyTo?: string
): Promise<void> {
  const url = `https://graph.microsoft.com/v1.0/users/${mailboxEmail}/sendMail`;
  
  const message: any = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlBody,
      },
      toRecipients: [
        {
          emailAddress: { address: to },
        },
      ],
    },
    saveToSentItems: true,
  };

  if (replyTo) {
    message.message.replyTo = [{ emailAddress: { address: replyTo } }];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}

function renderTemplate(templateName: string, data: Record<string, any>): string {
  let html = EMAIL_TEMPLATES[templateName] || '';
  
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, String(value || ''));
  });
  
  return html;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get email configuration
    const { data: configData } = await supabase
      .from('email_config')
      .select('config_key, config_value');

    if (!configData) {
      return new Response(JSON.stringify({ error: 'Email config not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config: Record<string, string> = {};
    configData.forEach((row: any) => {
      config[row.config_key] = row.config_value;
    });

    if (config.email_enabled !== 'true') {
      return new Response(JSON.stringify({ message: 'Email processing disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tenantId = config.ms_tenant_id;
    const clientId = config.ms_client_id;
    const clientSecret = config.ms_client_secret;
    const mailboxEmail = config.ms_mailbox_email;

    if (!tenantId || !clientId || !clientSecret || !mailboxEmail) {
      return new Response(JSON.stringify({ error: 'Missing email configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Graph API access token
    const accessToken = await getGraphAccessToken(tenantId, clientId, clientSecret);

    // Get pending emails from queue
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .is('sent_at', null)
      .lte('send_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('send_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch email queue: ${fetchError.message}`);
    }

    let sent = 0;
    let failed = 0;

    for (const email of pendingEmails || []) {
      try {
        // Render template
        const templateData = {
          ...email.template_data,
          support_email: email.reply_to || 'support@promptandpause.com'
        };
        const htmlBody = email.body_html || renderTemplate(email.template_name, templateData);

        // Send email
        await sendEmail(
          accessToken,
          mailboxEmail,
          email.to_email,
          email.subject,
          htmlBody,
          email.reply_to
        );

        // Update queue item as sent
        await supabase
          .from('email_queue')
          .update({
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        // Log successful send
        await supabase
          .from('email_logs')
          .insert({
            email_queue_id: email.id,
            to_email: email.to_email,
            template_name: email.template_name,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

        sent++;
      } catch (err) {
        console.error(`Failed to send email ${email.id}:`, err);

        // Update queue item with error
        await supabase
          .from('email_queue')
          .update({
            error_message: err instanceof Error ? err.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        // Log failed send
        await supabase
          .from('email_logs')
          .insert({
            email_queue_id: email.id,
            to_email: email.to_email,
            template_name: email.template_name,
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Unknown error',
          });

        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: pendingEmails?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
