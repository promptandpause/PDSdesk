import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString();

    console.log(`Cleaning up logs older than ${cutoffDate}`);

    // Archive old audit logs (move to archived_audit_logs or delete)
    const { data: oldAuditLogs, error: auditSelectError } = await supabase
      .from('audit_logs')
      .select('id')
      .lt('created_at', cutoffDate);

    if (auditSelectError) {
      console.error('Error selecting old audit logs:', auditSelectError);
    } else if (oldAuditLogs && oldAuditLogs.length > 0) {
      const { error: auditDeleteError, count: auditDeleteCount } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate);

      if (auditDeleteError) {
        console.error('Error deleting old audit logs:', auditDeleteError);
      } else {
        console.log(`Deleted ${auditDeleteCount ?? oldAuditLogs.length} old audit logs`);
      }
    }

    // Clean up old ticket events (keep ticket but remove old events)
    const { data: oldEvents, error: eventsSelectError } = await supabase
      .from('ticket_events')
      .select('id')
      .lt('created_at', cutoffDate);

    if (eventsSelectError) {
      console.error('Error selecting old ticket events:', eventsSelectError);
    } else if (oldEvents && oldEvents.length > 0) {
      const { error: eventsDeleteError, count: eventsDeleteCount } = await supabase
        .from('ticket_events')
        .delete()
        .lt('created_at', cutoffDate);

      if (eventsDeleteError) {
        console.error('Error deleting old ticket events:', eventsDeleteError);
      } else {
        console.log(`Deleted ${eventsDeleteCount ?? oldEvents.length} old ticket events`);
      }
    }

    // Clean up old notifications
    const { data: oldNotifications, error: notifSelectError } = await supabase
      .from('user_notifications')
      .select('id')
      .lt('created_at', cutoffDate);

    if (notifSelectError) {
      console.error('Error selecting old notifications:', notifSelectError);
    } else if (oldNotifications && oldNotifications.length > 0) {
      const { error: notifDeleteError, count: notifDeleteCount } = await supabase
        .from('user_notifications')
        .delete()
        .lt('created_at', cutoffDate);

      if (notifDeleteError) {
        console.error('Error deleting old notifications:', notifDeleteError);
      } else {
        console.log(`Deleted ${notifDeleteCount ?? oldNotifications.length} old notifications`);
      }
    }

    // Clean up old reservations that are cancelled or completed
    const { data: oldReservations, error: resSelectError } = await supabase
      .from('reservations')
      .select('id')
      .lt('end_time', cutoffDate)
      .in('status', ['cancelled', 'completed']);

    if (resSelectError) {
      console.error('Error selecting old reservations:', resSelectError);
    } else if (oldReservations && oldReservations.length > 0) {
      const { error: resDeleteError, count: resDeleteCount } = await supabase
        .from('reservations')
        .delete()
        .lt('end_time', cutoffDate)
        .in('status', ['cancelled', 'completed']);

      if (resDeleteError) {
        console.error('Error deleting old reservations:', resDeleteError);
      } else {
        console.log(`Deleted ${resDeleteCount ?? oldReservations.length} old reservations`);
      }
    }

    const summary = {
      cutoffDate,
      auditLogsDeleted: oldAuditLogs?.length ?? 0,
      ticketEventsDeleted: oldEvents?.length ?? 0,
      notificationsDeleted: oldNotifications?.length ?? 0,
      reservationsDeleted: oldReservations?.length ?? 0,
    };

    console.log('Cleanup summary:', summary);

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
