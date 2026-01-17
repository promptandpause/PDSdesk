import { getSupabaseClient } from '../supabaseClient';

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private supabase = getSupabaseClient();

  async renderTemplate(templateName: string, data: Record<string, any>): Promise<{ html: string; text: string }> {
    // Load HTML template
    const htmlTemplate = await this.loadTemplate(templateName, 'html');
    
    // Simple template rendering (replace {{variables}})
    let html = htmlTemplate;
    let text = this.htmlToText(html);
    
    // Replace template variables
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value));
      text = text.replace(regex, String(value));
    });
    
    return { html, text };
  }

  private async loadTemplate(templateName: string, type: 'html' | 'text'): Promise<string> {
    try {
      const response = await fetch(`/lib/email/templates/${templateName}.${type}`);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${templateName}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Error loading email template:', error);
      throw error;
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  async enqueueNotification(
    ticketId: string,
    eventType: 'created' | 'updated' | 'resolved' | 'closed',
    recipientEmail?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('enqueue_ticket_notification', {
        p_ticket_id: ticketId,
        p_event_type: eventType,
        p_recipient_email: recipientEmail || null
      });

      if (error) {
        console.error('Error enqueuing notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error enqueuing notification:', error);
      return null;
    }
  }

  async processEmailReply(
    emailQueueId: string,
    replyContent: string,
    replyFromEmail: string,
    replyFromName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('process_incoming_email', {
        p_email_queue_id: emailQueueId,
        p_reply_content: replyContent,
        p_reply_from_email: replyFromEmail,
        p_reply_from_name: replyFromName || null
      });

      if (error) {
        console.error('Error processing email reply:', error);
        return { success: false, error: error.message };
      }

      return { success: data?.ok || false };
    } catch (error) {
      console.error('Error processing email reply:', error);
      return { success: false, error: 'Internal error' };
    }
  }

  async getUserNotificationPreferences(userId: string): Promise<Record<string, boolean> | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Return defaults if no preferences set
        return {
          email_ticket_created: true,
          email_ticket_updated: true,
          email_ticket_resolved: true,
          email_ticket_closed: true,
          inapp_notifications: true
        };
      }

      return {
        email_ticket_created: data.email_ticket_created,
        email_ticket_updated: data.email_ticket_updated,
        email_ticket_resolved: data.email_ticket_resolved,
        email_ticket_closed: data.email_ticket_closed,
        inapp_notifications: data.inapp_notifications
      };
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  }

  async updateUserNotificationPreferences(
    userId: string,
    preferences: Partial<Record<string, boolean>>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }
}
