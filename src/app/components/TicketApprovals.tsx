import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Button, Badge, Input } from './index';

interface ApprovalRequest {
  id: string;
  ticket_id: string;
  requested_by: string;
  approver_id: string;
  status: string;
  request_reason: string | null;
  created_at: string;
  updated_at: string;
  requester_profile?: {
    full_name: string | null;
    email: string | null;
  };
  approver_profile?: {
    full_name: string | null;
    email: string | null;
  };
  decisions?: ApprovalDecision[];
}

interface ApprovalDecision {
  id: string;
  approval_request_id: string;
  decision: string;
  comments: string | null;
  decided_by: string;
  decided_at: string;
}

interface TicketApprovalsProps {
  ticketId: string;
}

export function TicketApprovals({ ticketId }: TicketApprovalsProps) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionComment, setDecisionComment] = useState('');

  const [formData, setFormData] = useState({
    approver_email: '',
    reason: '',
  });

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from('ticket_approval_requests')
      .select(`
        *,
        requester_profile:profiles!ticket_approval_requests_requested_by_fkey(full_name, email),
        approver_profile:profiles!ticket_approval_requests_approver_id_fkey(full_name, email),
        decisions:ticket_approval_decisions(*)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(data as ApprovalRequest[]);
    }
    setLoading(false);
  }, [supabase, ticketId]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.approver_email.trim() || !user) return;

    setSaving(true);

    // Find approver by email
    const { data: approverData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', formData.approver_email.trim())
      .single();

    if (!approverData) {
      alert('Approver not found. Please enter a valid email.');
      setSaving(false);
      return;
    }

    await supabase.from('ticket_approval_requests').insert({
      ticket_id: ticketId,
      requested_by: user.id,
      approver_id: approverData.id,
      request_reason: formData.reason.trim() || null,
      status: 'pending',
    });

    setFormData({ approver_email: '', reason: '' });
    setShowForm(false);
    setSaving(false);
    await fetchRequests();
  };

  const handleDecision = async (requestId: string, decision: 'approved' | 'rejected') => {
    if (!user) return;

    setDecidingId(requestId);

    // Create decision record
    await supabase.from('ticket_approval_decisions').insert({
      approval_request_id: requestId,
      decision,
      comments: decisionComment.trim() || null,
      decided_by: user.id,
    });

    // Update request status
    await supabase
      .from('ticket_approval_requests')
      .update({ status: decision })
      .eq('id', requestId);

    setDecidingId(null);
    setDecisionComment('');
    await fetchRequests();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const canDecide = (request: ApprovalRequest) => {
    return request.approver_id === user?.id && request.status === 'pending';
  };

  if (loading) {
    return (
      <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--itsm-space-2)' }}>
        <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
          {requests.length} approval request{requests.length !== 1 ? 's' : ''}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Request'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--itsm-space-3)', padding: 'var(--itsm-space-3)', backgroundColor: 'var(--itsm-surface-sunken)', borderRadius: 'var(--itsm-panel-radius)' }}>
          <Input
            label="Approver Email"
            type="email"
            value={formData.approver_email}
            onChange={(e) => setFormData({ ...formData, approver_email: e.target.value })}
            placeholder="approver@example.com"
            required
          />
          <div style={{ marginTop: 'var(--itsm-space-2)' }}>
            <Input
              label="Reason (optional)"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Why is approval needed?"
            />
          </div>
          <div style={{ marginTop: 'var(--itsm-space-2)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              Request Approval
            </Button>
          </div>
        </form>
      )}

      {requests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-2)' }}>
          {requests.map((request) => (
            <div
              key={request.id}
              style={{
                padding: 'var(--itsm-space-2)',
                backgroundColor: 'var(--itsm-surface-sunken)',
                borderRadius: 'var(--itsm-panel-radius)',
                fontSize: 'var(--itsm-text-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--itsm-space-1)' }}>
                {getStatusBadge(request.status)}
                <span style={{ color: 'var(--itsm-text-tertiary)' }}>
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>

              <div style={{ color: 'var(--itsm-text-secondary)', marginBottom: 'var(--itsm-space-1)' }}>
                <strong>Approver:</strong> {request.approver_profile?.full_name || request.approver_profile?.email || 'Unknown'}
              </div>

              {request.request_reason && (
                <div style={{ color: 'var(--itsm-text-tertiary)', marginBottom: 'var(--itsm-space-1)' }}>
                  {request.request_reason}
                </div>
              )}

              {canDecide(request) && (
                <div style={{ marginTop: 'var(--itsm-space-2)', paddingTop: 'var(--itsm-space-2)', borderTop: '1px solid var(--itsm-border-subtle)' }}>
                  <Input
                    label="Comments (optional)"
                    value={decidingId === request.id ? decisionComment : ''}
                    onChange={(e) => setDecisionComment(e.target.value)}
                    placeholder="Add a comment..."
                  />
                  <div style={{ marginTop: 'var(--itsm-space-2)', display: 'flex', gap: 'var(--itsm-space-2)' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleDecision(request.id, 'approved')}
                      loading={decidingId === request.id}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => void handleDecision(request.id, 'rejected')}
                      loading={decidingId === request.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {request.decisions && request.decisions.length > 0 && (
                <div style={{ marginTop: 'var(--itsm-space-2)', paddingTop: 'var(--itsm-space-2)', borderTop: '1px solid var(--itsm-border-subtle)' }}>
                  {request.decisions.map((decision) => (
                    <div key={decision.id} style={{ color: 'var(--itsm-text-tertiary)' }}>
                      <strong>{decision.decision === 'approved' ? '✓' : '✗'}</strong> {decision.comments || 'No comment'}
                      <span style={{ marginLeft: 'var(--itsm-space-2)' }}>
                        {new Date(decision.decided_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
