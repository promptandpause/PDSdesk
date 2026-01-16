import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, PanelSection, Button, StatusBadge, PriorityBadge, Badge } from '../components';

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  assigned_to: string | null;
  requester_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  body: string;
  is_internal: boolean;
  author_id: string;
  created_at: string;
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);

      const [{ data: ticketData }, { data: commentsData }] = await Promise.all([
        supabase.from('tickets').select('*').eq('id', id).single(),
        supabase.from('ticket_comments').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
      ]);

      if (cancelled) return;

      setTicket(ticketData as Ticket | null);
      setComments((commentsData as Comment[]) ?? []);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !ticket || !user) return;

    setSubmitting(true);

    const { error } = await supabase.from('ticket_comments').insert({
      ticket_id: ticket.id,
      body: newComment.trim(),
      is_internal: false,
      author_id: user.id,
    });

    if (!error) {
      setNewComment('');
      const { data } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });
      setComments((data as Comment[]) ?? []);
    }

    setSubmitting(false);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <div style={{ padding: 'var(--itsm-space-6)', color: 'var(--itsm-text-tertiary)' }}>
          Loading ticket...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div>
        <PageHeader title="Ticket Not Found" />
        <div style={{ padding: 'var(--itsm-space-6)', color: 'var(--itsm-text-tertiary)' }}>
          The requested ticket could not be found.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={ticket.title}
        subtitle={ticket.ticket_number}
        breadcrumbs={[
          { label: 'Tickets', to: '/tickets' },
          { label: ticket.ticket_number },
        ]}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/tickets')}>
              Back
            </Button>
            <Button variant="secondary">
              Edit
            </Button>
          </>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 'var(--itsm-space-6)',
          padding: 'var(--itsm-space-6)',
        }}
      >
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
          {/* Description */}
          <Panel title="Description">
            <div
              style={{
                fontSize: 'var(--itsm-text-sm)',
                lineHeight: 'var(--itsm-leading-relaxed)',
                color: 'var(--itsm-text-primary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {ticket.description || 'No description provided.'}
            </div>
          </Panel>

          {/* Comments */}
          <Panel title="Activity" subtitle={`${comments.length} comments`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              {comments.length === 0 ? (
                <div style={{ color: 'var(--itsm-text-tertiary)', fontSize: 'var(--itsm-text-sm)' }}>
                  No comments yet.
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: 'var(--itsm-space-3)',
                      backgroundColor: comment.is_internal ? 'var(--itsm-status-pending-bg)' : 'var(--itsm-surface-sunken)',
                      borderRadius: 'var(--itsm-panel-radius)',
                      border: '1px solid var(--itsm-border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--itsm-space-2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)' }}>
                        <span
                          style={{
                            fontSize: 'var(--itsm-text-xs)',
                            fontWeight: 'var(--itsm-weight-medium)' as any,
                            color: 'var(--itsm-text-secondary)',
                          }}
                        >
                          {comment.author_id.slice(0, 8)}...
                        </span>
                        {comment.is_internal && (
                          <Badge variant="purple" size="sm">Internal</Badge>
                        )}
                      </div>
                      <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                        {formatDateTime(comment.created_at)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--itsm-text-sm)',
                        lineHeight: 'var(--itsm-leading-normal)',
                        color: 'var(--itsm-text-primary)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {comment.body}
                    </div>
                  </div>
                ))
              )}

              {/* New Comment */}
              <div style={{ marginTop: 'var(--itsm-space-2)' }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 'var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    fontFamily: 'inherit',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    resize: 'vertical',
                    backgroundColor: 'var(--itsm-surface-base)',
                  }}
                />
                <div style={{ marginTop: 'var(--itsm-space-2)', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="primary"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    loading={submitting}
                  >
                    Add Comment
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
          <Panel>
            <PanelSection title="Status" noBorder>
              <StatusBadge status={ticket.status} />
            </PanelSection>
            <PanelSection title="Priority" noBorder>
              <PriorityBadge priority={ticket.priority} />
            </PanelSection>
            <PanelSection title="Category" noBorder>
              <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-primary)' }}>
                {ticket.category ?? '—'}
              </span>
            </PanelSection>
            <PanelSection title="Assigned To" noBorder>
              <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-primary)' }}>
                {ticket.assigned_to ?? 'Unassigned'}
              </span>
            </PanelSection>
          </Panel>

          <Panel>
            <PanelSection title="Created" noBorder>
              <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)' }}>
                {formatDateTime(ticket.created_at)}
              </span>
            </PanelSection>
            <PanelSection title="Last Updated" noBorder>
              <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)' }}>
                {formatDateTime(ticket.updated_at)}
              </span>
            </PanelSection>
          </Panel>
        </div>
      </div>
    </div>
  );
}
