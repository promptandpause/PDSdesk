import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, PanelSection, Button, StatusBadge, PriorityBadge, Badge, SLAIndicator, TicketWatchers, TicketTimeEntries, TicketLinks, TicketApprovals, Input, useToast } from '../components';
import { useTicketSLA } from '../hooks/useSLA';

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  assignee_id: string | null;
  assignment_group_id: string | null;
  requester_id: string | null;
  created_by: string | null;
  escalation_level: number;
  escalated_at: string | null;
  escalation_reason: string | null;
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

interface Attachment {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
}

interface OperatorGroup {
  id: string;
  name: string;
  group_key: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface EscalationHistory {
  id: string;
  from_group_id: string | null;
  to_group_id: string | null;
  escalation_type: string;
  reason: string | null;
  performed_by: string;
  created_at: string;
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, roles } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Escalation state
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [operatorGroups, setOperatorGroups] = useState<OperatorGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<Profile[]>([]);
  const [escalationData, setEscalationData] = useState({
    toGroupId: '',
    toAssigneeId: '',
    reason: '',
    type: 'escalate' as 'escalate' | 'de_escalate' | 'transfer',
  });
  const [escalationHistory, setEscalationHistory] = useState<EscalationHistory[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [groups, setGroups] = useState<Map<string, OperatorGroup>>(new Map());

  const isAgent = roles.includes('operator') || roles.includes('service_desk_admin') || roles.includes('global_admin');
  const isGlobalAdmin = roles.includes('global_admin');
  const isServiceDeskAdmin = roles.includes('service_desk_admin');
  const { sla, isResponseMet, isResolved } = useTicketSLA(id ?? null);

  // Check if ticket can be deleted
  const canDeleteTicket = useCallback(() => {
    if (!ticket) return false;
    if (isGlobalAdmin) return true; // Global admins can always delete
    if (isServiceDeskAdmin) {
      // Service desk admins can only delete within 5 minutes of creation
      const createdAt = new Date(ticket.created_at);
      const now = new Date();
      const diffMs = now.getTime() - createdAt.getTime();
      const fiveMinutesMs = 5 * 60 * 1000;
      return diffMs <= fiveMinutesMs;
    }
    return false;
  }, [ticket, isGlobalAdmin, isServiceDeskAdmin]);

  const handleDeleteTicket = async () => {
    if (!ticket || !canDeleteTicket()) return;
    
    setDeleting(true);
    setShowDeleteConfirm(false);
    
    const ticketNumber = ticket.ticket_number;
    
    // Delete attachments from storage first
    for (const attachment of attachments) {
      await supabase.storage.from('ticket-attachments').remove([attachment.storage_path]);
    }
    
    // Delete ticket (cascades to comments, attachments records, etc.)
    const { error } = await supabase.from('tickets').delete().eq('id', ticket.id);
    
    setDeleting(false);
    
    if (error) {
      showToast('error', 'Failed to delete ticket', `Error: ${error.code} - ${error.message}`);
      return;
    }
    
    showToast('success', 'Ticket deleted successfully', `Ticket ${ticketNumber} has been permanently removed.`);
    navigate('/tickets');
  };

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [{ data: ticketData }, { data: commentsData }, { data: attachmentsData }, { data: groupsData }, { data: historyData }] = await Promise.all([
      supabase.from('tickets').select('*').eq('id', id).single(),
      supabase.from('ticket_comments').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
      supabase.from('ticket_attachments').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
      supabase.from('operator_groups').select('id, name, group_key').eq('is_active', true).order('name'),
      supabase.from('ticket_escalation_history').select('*').eq('ticket_id', id).order('created_at', { ascending: false }),
    ]);

    setTicket(ticketData as Ticket | null);
    setComments((commentsData as Comment[]) ?? []);
    setAttachments((attachmentsData as Attachment[]) ?? []);
    setOperatorGroups((groupsData as OperatorGroup[]) ?? []);
    setEscalationHistory((historyData as EscalationHistory[]) ?? []);

    // Build groups map
    const groupsMap = new Map<string, OperatorGroup>();
    (groupsData as OperatorGroup[] ?? []).forEach((g) => groupsMap.set(g.id, g));
    setGroups(groupsMap);

    // Fetch profiles for comments, history, and assignee
    const authorIds = new Set<string>();
    (commentsData as Comment[] ?? []).forEach((c) => authorIds.add(c.author_id));
    (historyData as EscalationHistory[] ?? []).forEach((h) => authorIds.add(h.performed_by));
    if ((ticketData as Ticket)?.assignee_id) {
      authorIds.add((ticketData as Ticket).assignee_id as string);
    }
    
    if (authorIds.size > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(authorIds));
      
      const profilesMap = new Map<string, Profile>();
      (profilesData as Profile[] ?? []).forEach((p) => profilesMap.set(p.id, p));
      setProfiles(profilesMap);
    }

    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !ticket || !user) return;

    setSubmitting(true);

    const { error } = await supabase.from('ticket_comments').insert({
      ticket_id: ticket.id,
      body: newComment.trim(),
      is_internal: isInternalComment,
      author_id: user.id,
    });

    if (!error) {
      setNewComment('');
      setIsInternalComment(false);
      void fetchData();
    }

    setSubmitting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !ticket || !user) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const filePath = `${ticket.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);

      if (!uploadError) {
        await supabase.from('ticket_attachments').insert({
          ticket_id: ticket.id,
          uploader_id: user.id,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          storage_path: filePath,
        });
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    void fetchData();
  };

  const handleEscalate = async () => {
    if (!ticket || !escalationData.toGroupId) return;

    setSubmitting(true);

    const { error } = await supabase.rpc('escalate_ticket', {
      p_ticket_id: ticket.id,
      p_to_group_id: escalationData.toGroupId,
      p_to_assignee_id: escalationData.toAssigneeId || null,
      p_reason: escalationData.reason || null,
      p_escalation_type: escalationData.type,
    });

    if (error) {
      alert('Escalation failed: ' + error.message);
    } else {
      setShowEscalateModal(false);
      setEscalationData({ toGroupId: '', toAssigneeId: '', reason: '', type: 'escalate' });
      void fetchData();
    }

    setSubmitting(false);
  };

  const fetchGroupMembers = async (groupId: string) => {
    const { data: memberData } = await supabase
      .from('operator_group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (memberData && memberData.length > 0) {
      const userIds = memberData.map((m: { user_id: string }) => m.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      setGroupMembers((profilesData as Profile[]) ?? []);
    } else {
      setGroupMembers([]);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAuthorName = (authorId: string) => {
    const profile = profiles.get(authorId);
    return profile?.full_name || profile?.email || authorId.slice(0, 8) + '...';
  };

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return '—';
    return groups.get(groupId)?.name || groupId.slice(0, 8) + '...';
  };

  const isImageFile = (mimeType: string | null) => {
    return mimeType?.startsWith('image/') ?? false;
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
        subtitle={`${ticket.ticket_number}${ticket.escalation_level > 0 ? ` • Escalation Level ${ticket.escalation_level}` : ''}`}
        breadcrumbs={[
          { label: 'Tickets', to: '/tickets' },
          { label: ticket.ticket_number },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--itsm-space-2)' }}>
            <Button variant="ghost" onClick={() => navigate('/tickets')}>
              Back
            </Button>
            {canDeleteTicket() && (
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(true)} style={{ color: 'var(--itsm-error-500)' }}>
                Delete
              </Button>
            )}
            {isAgent && (
              <Button variant="secondary" onClick={() => setShowEscalateModal(true)}>
                Escalate / Transfer
              </Button>
            )}
            <Button variant="primary">
              Edit
            </Button>
          </div>
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
                <div style={{ marginTop: 'var(--itsm-space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {isAgent && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                      />
                      <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)' }}>
                        Internal note (not visible to requester)
                      </span>
                    </label>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--itsm-space-2)', marginLeft: 'auto' }}>
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
            </div>
          </Panel>

          {/* Attachments */}
          <Panel title="Attachments" subtitle={`${attachments.length} files`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  loading={uploading}
                >
                  {uploading ? 'Uploading...' : '📎 Upload Files'}
                </Button>
              </div>

              {/* Attachments List */}
              {attachments.length === 0 ? (
                <div style={{ color: 'var(--itsm-text-tertiary)', fontSize: 'var(--itsm-text-sm)' }}>
                  No attachments yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--itsm-space-3)' }}>
                  {attachments.map((attachment) => {
                    const publicUrl = supabase.storage.from('ticket-attachments').getPublicUrl(attachment.storage_path).data.publicUrl;
                    return (
                      <div
                        key={attachment.id}
                        style={{
                          padding: 'var(--itsm-space-3)',
                          border: '1px solid var(--itsm-border-subtle)',
                          borderRadius: 'var(--itsm-panel-radius)',
                          backgroundColor: 'var(--itsm-surface-sunken)',
                        }}
                      >
                        {isImageFile(attachment.mime_type) ? (
                          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={publicUrl}
                              alt={attachment.file_name}
                              style={{
                                width: '100%',
                                height: 120,
                                objectFit: 'cover',
                                borderRadius: 'var(--itsm-panel-radius)',
                                marginBottom: 'var(--itsm-space-2)',
                              }}
                            />
                          </a>
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: 60,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'var(--itsm-surface-base)',
                              borderRadius: 'var(--itsm-panel-radius)',
                              marginBottom: 'var(--itsm-space-2)',
                              fontSize: 24,
                            }}
                          >
                            📄
                          </div>
                        )}
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 'var(--itsm-text-xs)',
                            color: 'var(--itsm-primary-600)',
                            textDecoration: 'none',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {attachment.file_name}
                        </a>
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 2 }}>
                          {formatFileSize(attachment.size_bytes)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>

          {/* Escalation History */}
          {escalationHistory.length > 0 && (
            <Panel title="Escalation History">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
                {escalationHistory.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: 'var(--itsm-space-3)',
                      backgroundColor: 'var(--itsm-surface-sunken)',
                      borderRadius: 'var(--itsm-panel-radius)',
                      borderLeft: '3px solid var(--itsm-warning-500)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--itsm-space-1)' }}>
                      <Badge
                        variant={h.escalation_type === 'escalate' ? 'warning' : h.escalation_type === 'de_escalate' ? 'success' : 'info'}
                        size="sm"
                      >
                        {h.escalation_type === 'escalate' ? 'Escalated' : h.escalation_type === 'de_escalate' ? 'De-escalated' : 'Transferred'}
                      </Badge>
                      <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                        {formatDateTime(h.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-primary)' }}>
                      {getGroupName(h.from_group_id)} → {getGroupName(h.to_group_id)}
                    </div>
                    {h.reason && (
                      <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-secondary)', marginTop: 'var(--itsm-space-1)' }}>
                        Reason: {h.reason}
                      </div>
                    )}
                    <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 'var(--itsm-space-1)' }}>
                      By: {getAuthorName(h.performed_by)}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
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
                {ticket.assignee_id ? (profiles.get(ticket.assignee_id)?.full_name || 'Unknown') : 'Unassigned'}
              </span>
            </PanelSection>
          </Panel>

          {/* SLA Panel */}
          {sla && (
            <Panel title="SLA">
              <PanelSection title="First Response" noBorder>
                <SLAIndicator
                  dueAt={sla.first_response_due_at}
                  label="Response"
                  isComplete={isResponseMet}
                />
              </PanelSection>
              <PanelSection title="Resolution" noBorder>
                <SLAIndicator
                  dueAt={sla.resolution_due_at}
                  label="Resolution"
                  isComplete={isResolved}
                />
              </PanelSection>
            </Panel>
          )}

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

          {/* Watchers */}
          <Panel title="Watchers">
            <TicketWatchers ticketId={ticket.id} />
          </Panel>

          {/* Time Tracking */}
          <Panel title="Time Tracking">
            <TicketTimeEntries ticketId={ticket.id} />
          </Panel>

          {/* Linked Tickets */}
          <Panel title="Linked Tickets">
            <TicketLinks ticketId={ticket.id} />
          </Panel>

          {/* Approvals */}
          <Panel title="Approvals">
            <TicketApprovals ticketId={ticket.id} />
          </Panel>
        </div>
      </div>

      {/* Escalation Modal */}
      {showEscalateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowEscalateModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--itsm-surface-base)',
              borderRadius: 'var(--itsm-panel-radius)',
              padding: 'var(--itsm-space-6)',
              width: '100%',
              maxWidth: 500,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 'var(--itsm-text-lg)', fontWeight: 'var(--itsm-weight-semibold)' as any, marginBottom: 'var(--itsm-space-4)' }}>
              Escalate / Transfer Ticket
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              {/* Action Type */}
              <div>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Action
                </label>
                <div style={{ display: 'flex', gap: 'var(--itsm-space-2)' }}>
                  {(['escalate', 'transfer', 'de_escalate'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEscalationData({ ...escalationData, type })}
                      style={{
                        padding: 'var(--itsm-space-2) var(--itsm-space-3)',
                        border: '1px solid',
                        borderColor: escalationData.type === type ? 'var(--itsm-primary-500)' : 'var(--itsm-border-default)',
                        borderRadius: 'var(--itsm-input-radius)',
                        backgroundColor: escalationData.type === type ? 'var(--itsm-primary-100)' : 'var(--itsm-surface-base)',
                        color: escalationData.type === type ? 'var(--itsm-primary-700)' : 'var(--itsm-text-secondary)',
                        cursor: 'pointer',
                        fontSize: 'var(--itsm-text-sm)',
                      }}
                    >
                      {type === 'escalate' ? '⬆ Escalate' : type === 'de_escalate' ? '⬇ De-escalate' : '↔ Transfer'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Group */}
              <div>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Target Queue
                </label>
                <select
                  value={escalationData.toGroupId}
                  onChange={(e) => {
                    setEscalationData({ ...escalationData, toGroupId: e.target.value, toAssigneeId: '' });
                    if (e.target.value) void fetchGroupMembers(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '0 var(--itsm-space-3)',
                    fontSize: 'var(--itsm-text-sm)',
                    border: '1px solid var(--itsm-border-default)',
                    borderRadius: 'var(--itsm-input-radius)',
                    backgroundColor: 'var(--itsm-surface-base)',
                  }}
                >
                  <option value="">Select queue...</option>
                  {operatorGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Assignee */}
              {escalationData.toGroupId && (
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Assign To (optional)
                  </label>
                  <select
                    value={escalationData.toAssigneeId}
                    onChange={(e) => setEscalationData({ ...escalationData, toAssigneeId: e.target.value })}
                    style={{
                      width: '100%',
                      height: 36,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      backgroundColor: 'var(--itsm-surface-base)',
                    }}
                  >
                    <option value="">Leave unassigned</option>
                    {groupMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || m.email || m.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                  Reason
                </label>
                <textarea
                  value={escalationData.reason}
                  onChange={(e) => setEscalationData({ ...escalationData, reason: e.target.value })}
                  placeholder="Explain why this ticket is being escalated or transferred..."
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
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)', marginTop: 'var(--itsm-space-2)' }}>
                <Button variant="ghost" onClick={() => setShowEscalateModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleEscalate}
                  disabled={!escalationData.toGroupId || submitting}
                  loading={submitting}
                >
                  {escalationData.type === 'escalate' ? 'Escalate' : escalationData.type === 'de_escalate' ? 'De-escalate' : 'Transfer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--itsm-surface-base)',
              borderRadius: 'var(--itsm-panel-radius)',
              padding: 'var(--itsm-space-6)',
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 'var(--itsm-text-lg)', fontWeight: 'var(--itsm-weight-semibold)' as any, marginBottom: 'var(--itsm-space-3)', color: 'var(--itsm-error-600)' }}>
              Delete Ticket
            </h3>
            <p style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)', marginBottom: 'var(--itsm-space-4)' }}>
              Are you sure you want to delete ticket <strong>{ticket?.ticket_number}</strong>? This action cannot be undone and will permanently remove the ticket along with all comments and attachments.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)' }}>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteTicket}
                disabled={deleting}
                loading={deleting}
                style={{ backgroundColor: 'var(--itsm-error-500)' }}
              >
                Delete Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
