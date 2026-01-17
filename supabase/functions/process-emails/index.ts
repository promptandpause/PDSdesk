import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  body: {
    content: string;
    contentType: string;
  };
  receivedDateTime: string;
  conversationId: string;
}

interface GraphTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

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

async function getRecentEmails(accessToken: string, mailboxEmail: string): Promise<{ emails: EmailMessage[], debug: any }> {
  // Get all recent emails (last 50) - we track processed ones in database
  const url = `https://graph.microsoft.com/v1.0/users/${mailboxEmail}/messages?$orderby=receivedDateTime desc&$top=50`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get emails: ${error}`);
  }

  const data = await response.json();
  return { 
    emails: data.value || [],
    debug: {
      mailboxEmail,
      totalReturned: data.value?.length || 0,
    }
  };
}

async function markEmailAsRead(accessToken: string, mailboxEmail: string, messageId: string): Promise<void> {
  const url = `https://graph.microsoft.com/v1.0/users/${mailboxEmail}/messages/${messageId}`;
  
  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isRead: true }),
  });
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

function extractTicketNumberFromSubject(subject: string): string | null {
  const match = subject.match(/\[?(TKT\d+)\]?/i);
  return match ? match[1].toUpperCase() : null;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get email configuration
    const { data: configData, error: configError } = await supabase
      .from('email_config')
      .select('config_key, config_value');

    if (configError) {
      return new Response(JSON.stringify({ error: 'Config query error: ' + configError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!configData || configData.length === 0) {
      return new Response(JSON.stringify({ error: 'Email config not found or empty' }), {
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
      return new Response(JSON.stringify({ 
        error: 'Missing email configuration',
        details: {
          hasTenantId: !!tenantId,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          hasMailboxEmail: !!mailboxEmail,
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Graph API access token
    let accessToken: string;
    try {
      accessToken = await getGraphAccessToken(tenantId, clientId, clientSecret);
    } catch (tokenError) {
      return new Response(JSON.stringify({ 
        error: 'Graph token error',
        message: tokenError instanceof Error ? tokenError.message : 'Unknown token error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get unread emails
    let emails: EmailMessage[];
    let emailDebug: any;
    try {
      const result = await getRecentEmails(accessToken, mailboxEmail);
      emails = result.emails;
      emailDebug = result.debug;
    } catch (mailError) {
      return new Response(JSON.stringify({ 
        error: 'Mail fetch error',
        message: mailError instanceof Error ? mailError.message : 'Unknown mail error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let processed = 0;
    let created = 0;
    let replied = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const email of emails) {
      // Check if already processed (only skip if status is 'processed')
      const { data: existing } = await supabase
        .from('inbound_emails')
        .select('id, status')
        .eq('ms_message_id', email.id)
        .single();

      if (existing && existing.status === 'processed') {
        skipped++;
        await markEmailAsRead(accessToken, mailboxEmail, email.id);
        continue;
      }
      
      // If exists but pending/failed, we'll reprocess it
      const existingId = existing?.id;

      // Log inbound email
      const bodyText = email.body.contentType === 'html' 
        ? stripHtmlTags(email.body.content)
        : email.body.content;

      let inboundEmail: any;
      
      if (existingId) {
        // Update existing pending record
        const { data, error } = await supabase
          .from('inbound_emails')
          .update({ status: 'pending', error_message: null })
          .eq('id', existingId)
          .select()
          .single();
        inboundEmail = data;
        if (error) {
          errors.push(`Update error: ${error.message}`);
          continue;
        }
      } else {
        // Insert new record
        const { data, error: insertError } = await supabase
          .from('inbound_emails')
          .insert({
            ms_message_id: email.id,
            from_email: email.from.emailAddress.address,
            from_name: email.from.emailAddress.name,
            subject: email.subject,
            body_text: bodyText,
            body_html: email.body.contentType === 'html' ? email.body.content : null,
            received_at: email.receivedDateTime,
            status: 'pending',
          })
          .select()
          .single();
        inboundEmail = data;
        if (insertError) {
          errors.push(`Insert error: ${insertError.message}`);
          continue;
        }
      }
      
      if (!inboundEmail) {
        errors.push('No inbound email record');
        continue;
      }

      try {
        // Check if this is a reply to an existing ticket
        const ticketNumber = extractTicketNumberFromSubject(email.subject);
        
        if (ticketNumber) {
          // Find existing ticket
          const { data: ticket } = await supabase
            .from('tickets')
            .select('id, requester_id')
            .eq('ticket_number', ticketNumber)
            .single();

          if (ticket) {
            // Find user by email
            const { data: user } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', email.from.emailAddress.address.toLowerCase())
              .single();

            // Add as comment
            const { data: comment } = await supabase
              .from('ticket_comments')
              .insert({
                ticket_id: ticket.id,
                author_id: user?.id || ticket.requester_id,
                body: `**Email reply from ${email.from.emailAddress.name || email.from.emailAddress.address}:**\n\n${bodyText}`,
                is_internal: false,
              })
              .select()
              .single();

            // Update ticket
            await supabase
              .from('tickets')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', ticket.id);

            // Update inbound email record
            await supabase
              .from('inbound_emails')
              .update({
                ticket_id: ticket.id,
                comment_id: comment?.id,
                status: 'processed',
                processed_at: new Date().toISOString(),
              })
              .eq('id', inboundEmail.id);

            replied++;
          }
        } else {
          // Create new ticket from email
          // Find user profile by email (case insensitive)
          const senderEmail = email.from.emailAddress.address.toLowerCase();
          
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', senderEmail)
            .single();

          if (!existingUser) {
            // User not found - store email in inbound_emails and skip ticket creation
            // They need to be registered in the system first
            throw new Error(`User not found in system: ${senderEmail}. Email stored for manual review.`);
          }

          const userId = existingUser.id;

          // Generate ticket number
          const { data: seqData } = await supabase.rpc('generate_ticket_number');
          const newTicketNumber = seqData || `TKT${Date.now()}`;

          // Create ticket
          const { data: newTicket, error: ticketError } = await supabase
            .from('tickets')
            .insert({
              ticket_number: newTicketNumber,
              title: email.subject || 'No Subject',
              description: `[Created from email]\n\n${bodyText || 'No content'}`,
              status: 'open',
              priority: 'medium',
              requester_id: userId,
              created_by: userId,
            })
            .select()
            .single();

          if (ticketError) {
            throw new Error(`Failed to create ticket: ${ticketError.message}`);
          }

          // Update inbound email record
          await supabase
            .from('inbound_emails')
            .update({
              ticket_id: newTicket.id,
              status: 'processed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', inboundEmail.id);

          // Confirmation email is sent via the email_queue trigger on ticket creation
          // No direct email send here to avoid duplicates
          created++;
        }

        processed++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Email ${email.subject}: ${errMsg}`);
        console.error('Error processing email:', err);
        await supabase
          .from('inbound_emails')
          .update({
            status: 'failed',
            error_message: errMsg,
          })
          .eq('id', inboundEmail.id);
      }

      // Mark as read in mailbox
      await markEmailAsRead(accessToken, mailboxEmail, email.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        created,
        replied,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        total: emails.length,
        debug: emailDebug,
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
