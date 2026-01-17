import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Badge } from '../components';

interface Category {
  id: string;
  name: string;
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

interface TicketTemplate {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  priority: string | null;
  category: string | null;
}

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  company_name: string | null;
}

const TICKET_TYPES = [
  { value: 'itsm_incident', label: 'Incident', description: 'Something is broken or not working' },
  { value: 'itsm_request', label: 'Service Request', description: 'Request for a new service or access' },
  { value: 'customer_service', label: 'Customer Inquiry', description: 'External customer support request' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'var(--itsm-success-500)' },
  { value: 'medium', label: 'Medium', color: 'var(--itsm-warning-500)' },
  { value: 'high', label: 'High', color: 'var(--itsm-error-500)' },
  { value: 'urgent', label: 'Urgent', color: 'var(--itsm-error-600)' },
  { value: 'critical', label: 'Critical', color: 'var(--itsm-error-700)' },
];

const IMPACT_OPTIONS = [
  { value: 'low', label: 'Low - Single user affected' },
  { value: 'medium', label: 'Medium - Department affected' },
  { value: 'high', label: 'High - Multiple departments affected' },
  { value: 'urgent', label: 'Urgent - Time-sensitive issue' },
  { value: 'critical', label: 'Critical - Entire organization affected' },
];

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low - Can wait' },
  { value: 'medium', label: 'Medium - Should be addressed soon' },
  { value: 'high', label: 'High - Needs immediate attention' },
  { value: 'urgent', label: 'Urgent - Time-sensitive' },
  { value: 'critical', label: 'Critical - Business critical' },
];

export function TicketNewPage() {
  const navigate = useNavigate();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, roles } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [operatorGroups, setOperatorGroups] = useState<OperatorGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<Profile[]>([]);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactSearch, setShowContactSearch] = useState(false);

  // Form fields
  const [ticketType, setTicketType] = useState('itsm_incident');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [impact, setImpact] = useState('medium');
  const [urgency, setUrgency] = useState('medium');
  const [category, setCategory] = useState('');
  const [assignmentGroupId, setAssignmentGroupId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const isAgent = roles.includes('operator') || roles.includes('service_desk_admin') || roles.includes('global_admin');

  // Load reference data
  useEffect(() => {
    async function loadData() {
      const [{ data: catData }, { data: groupData }, { data: templateData }] = await Promise.all([
        supabase.from('ticket_categories').select('id,name').order('name'),
        supabase.from('operator_groups').select('id, name, group_key').eq('is_active', true).order('name'),
        supabase.from('ticket_templates').select('id, name, title, description, priority, category').eq('is_active', true).order('name'),
      ]);
      
      setCategories((catData as Category[]) ?? []);
      setOperatorGroups((groupData as OperatorGroup[]) ?? []);
      setTemplates((templateData as TicketTemplate[]) ?? []);
      setLoading(false);
    }
    void loadData();
  }, [supabase]);

  // Fetch group members when assignment group changes
  const fetchGroupMembers = useCallback(async (groupId: string) => {
    if (!groupId) {
      setGroupMembers([]);
      return;
    }
    
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
  }, [supabase]);

  // Search contacts
  const searchContacts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setContacts([]);
      return;
    }
    
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, email, company_name')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);
    
    setContacts((data as Contact[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (contactSearch) void searchContacts(contactSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [contactSearch, searchContacts]);

  // Apply template
  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      if (template.title) setTitle(template.title);
      if (template.description) setDescription(template.description);
      if (template.priority) setPriority(template.priority);
      if (template.category) setCategory(template.category);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Add tag
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  // Calculate priority from impact/urgency matrix
  useEffect(() => {
    const matrix: Record<string, Record<string, string>> = {
      critical: { critical: 'critical', urgent: 'critical', high: 'critical', medium: 'urgent', low: 'high' },
      urgent: { critical: 'critical', urgent: 'urgent', high: 'urgent', medium: 'high', low: 'high' },
      high: { critical: 'critical', urgent: 'urgent', high: 'high', medium: 'high', low: 'medium' },
      medium: { critical: 'urgent', urgent: 'high', high: 'high', medium: 'medium', low: 'low' },
      low: { critical: 'high', urgent: 'high', high: 'medium', medium: 'low', low: 'low' },
    };
    const calculated = matrix[impact]?.[urgency] ?? 'medium';
    setPriority(calculated);
  }, [impact, urgency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setSubmitting(true);

    // Create ticket
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category: category || null,
        status: 'open',
        ticket_type: ticketType,
        requester_id: requesterId || user.id,
        created_by: user.id,
        assignment_group_id: assignmentGroupId || null,
        assignee_id: assigneeId || null,
      })
      .select('id')
      .single();

    if (error) {
      alert('Failed to create ticket: ' + error.message);
      setSubmitting(false);
      return;
    }

    // Upload attachments
    if (attachments.length > 0) {
      setUploading(true);
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${data.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, file);

        if (!uploadError) {
          await supabase.from('ticket_attachments').insert({
            ticket_id: data.id,
            uploader_id: user.id,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            storage_path: filePath,
          });
        }
      }
      setUploading(false);
    }

    navigate(`/tickets/${data.id}`);
  };

  const selectStyle = {
    width: '100%',
    height: 36,
    padding: '0 var(--itsm-space-3)',
    fontSize: 'var(--itsm-text-sm)',
    border: '1px solid var(--itsm-border-default)',
    borderRadius: 'var(--itsm-input-radius)',
    backgroundColor: 'var(--itsm-surface-base)',
    color: 'var(--itsm-text-primary)',
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <PageHeader
        title="Create New Ticket"
        subtitle="Fill in the details below to submit a new ticket"
        breadcrumbs={[
          { label: 'Tickets', to: '/tickets' },
          { label: 'New Ticket' },
        ]}
        actions={
          <Button variant="ghost" onClick={() => navigate('/tickets')}>
            Cancel
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--itsm-space-6)' }}>
            {/* Main Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              {/* Template Selection */}
              {templates.length > 0 && (
                <Panel title="Quick Start">
                  <div>
                    <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                      Apply Template
                    </label>
                    <select
                      onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">Select a template to pre-fill fields...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </Panel>
              )}

              {/* Ticket Type */}
              <Panel title="Ticket Type">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--itsm-space-3)' }}>
                  {TICKET_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setTicketType(type.value)}
                      style={{
                        padding: 'var(--itsm-space-3)',
                        border: '2px solid',
                        borderColor: ticketType === type.value ? 'var(--itsm-primary-500)' : 'var(--itsm-border-default)',
                        borderRadius: 'var(--itsm-panel-radius)',
                        backgroundColor: ticketType === type.value ? 'var(--itsm-primary-50)' : 'var(--itsm-surface-base)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any, fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-primary)' }}>
                        {type.label}
                      </div>
                      <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 2 }}>
                        {type.description}
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>

              {/* Basic Information */}
              <Panel title="Basic Information">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
                  <Input
                    label="Subject *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary of the issue or request"
                    required
                  />

                  <div>
                    <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide detailed information about the issue, including steps to reproduce, expected behavior, and any error messages..."
                      style={{
                        width: '100%',
                        minHeight: 150,
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

                  <div>
                    <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                      Category
                    </label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
                      <option value="">Select category...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Panel>

              {/* Impact & Urgency (for agents) */}
              {isAgent && (
                <Panel title="Impact & Urgency">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                    <div>
                      <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                        Impact
                      </label>
                      <select value={impact} onChange={(e) => setImpact(e.target.value)} style={selectStyle}>
                        {IMPACT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                        Urgency
                      </label>
                      <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={selectStyle}>
                        {URGENCY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 'var(--itsm-space-3)', padding: 'var(--itsm-space-2)', backgroundColor: 'var(--itsm-surface-sunken)', borderRadius: 'var(--itsm-input-radius)' }}>
                    <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                      Calculated Priority: 
                    </span>
                    <Badge 
                      variant={priority === 'critical' ? 'danger' : priority === 'urgent' ? 'red' : priority === 'high' ? 'warning' : priority === 'low' ? 'success' : 'info'} 
                      size="sm" 
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Badge>
                  </div>
                </Panel>
              )}

              {/* Attachments */}
              <Panel title="Attachments">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📎 Add Attachments
                  </Button>
                  
                  {attachments.length > 0 && (
                    <div style={{ marginTop: 'var(--itsm-space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-2)' }}>
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--itsm-space-2) var(--itsm-space-3)',
                            backgroundColor: 'var(--itsm-surface-sunken)',
                            borderRadius: 'var(--itsm-input-radius)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)' }}>
                            <span style={{ fontSize: 16 }}>{file.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                            <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-primary)' }}>{file.name}</span>
                            <span style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>({formatFileSize(file.size)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--itsm-error-500)',
                              fontSize: 16,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>

              {/* Tags */}
              <Panel title="Tags">
                <div style={{ display: 'flex', gap: 'var(--itsm-space-2)', flexWrap: 'wrap', marginBottom: tags.length > 0 ? 'var(--itsm-space-3)' : 0 }}>
                  {tags.map((tag) => (
                    <Badge key={tag} variant="info" size="sm">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          marginLeft: 4,
                          color: 'inherit',
                          fontSize: 10,
                        }}
                      >
                        ✕
                      </button>
                    </Badge>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--itsm-space-2)' }}>
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={addTag}>
                    Add
                  </Button>
                </div>
              </Panel>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              {/* Assignment (for agents) */}
              {isAgent && (
                <Panel title="Assignment">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
                    <div>
                      <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                        Assign to Queue
                      </label>
                      <select
                        value={assignmentGroupId}
                        onChange={(e) => {
                          setAssignmentGroupId(e.target.value);
                          setAssigneeId('');
                          if (e.target.value) void fetchGroupMembers(e.target.value);
                        }}
                        style={selectStyle}
                      >
                        <option value="">Unassigned</option>
                        {operatorGroups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    {assignmentGroupId && (
                      <div>
                        <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                          Assign to Agent
                        </label>
                        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={selectStyle}>
                          <option value="">Unassigned</option>
                          {groupMembers.map((m) => (
                            <option key={m.id} value={m.id}>{m.full_name || m.email || m.id}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </Panel>
              )}

              {/* Requester (for agents) */}
              {isAgent && (
                <Panel title="Requester">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
                    <div style={{ position: 'relative' }}>
                      <Input
                        label="Search Contact"
                        value={contactSearch}
                        onChange={(e) => {
                          setContactSearch(e.target.value);
                          setShowContactSearch(true);
                        }}
                        onFocus={() => setShowContactSearch(true)}
                        placeholder="Search by name or email..."
                      />
                      {showContactSearch && contacts.length > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'var(--itsm-surface-base)',
                            border: '1px solid var(--itsm-border-default)',
                            borderRadius: 'var(--itsm-input-radius)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            zIndex: 10,
                            maxHeight: 200,
                            overflow: 'auto',
                          }}
                        >
                          {contacts.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setRequesterId(c.id);
                                setRequesterName(c.full_name);
                                setContactSearch('');
                                setShowContactSearch(false);
                              }}
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: 'var(--itsm-space-2) var(--itsm-space-3)',
                                textAlign: 'left',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontSize: 'var(--itsm-text-sm)',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--itsm-surface-sunken)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>{c.full_name}</div>
                              {c.email && <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>{c.email}</div>}
                              {c.company_name && <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>{c.company_name}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {requesterName && (
                      <div style={{ padding: 'var(--itsm-space-2)', backgroundColor: 'var(--itsm-success-100)', borderRadius: 'var(--itsm-input-radius)', fontSize: 'var(--itsm-text-sm)' }}>
                        <strong>Selected:</strong> {requesterName}
                        <button
                          type="button"
                          onClick={() => {
                            setRequesterId('');
                            setRequesterName('');
                          }}
                          style={{ marginLeft: 'var(--itsm-space-2)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--itsm-error-500)' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {!requesterName && (
                      <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                        Leave empty to set yourself as requester
                      </div>
                    )}
                  </div>
                </Panel>
              )}

              {/* Priority (for non-agents) */}
              {!isAgent && (
                <Panel title="Priority">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-2)' }}>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--itsm-space-2)',
                          padding: 'var(--itsm-space-2) var(--itsm-space-3)',
                          border: '2px solid',
                          borderColor: priority === opt.value ? opt.color : 'var(--itsm-border-default)',
                          borderRadius: 'var(--itsm-input-radius)',
                          backgroundColor: priority === opt.value ? 'var(--itsm-surface-sunken)' : 'var(--itsm-surface-base)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: opt.color }} />
                        <span style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-primary)' }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </Panel>
              )}

              {/* Submit */}
              <Panel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={!title.trim() || submitting || uploading}
                    loading={submitting || uploading}
                    style={{ width: '100%' }}
                  >
                    {uploading ? 'Uploading...' : submitting ? 'Creating...' : 'Create Ticket'}
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => navigate('/tickets')}
                    style={{ width: '100%' }}
                  >
                    Cancel
                  </Button>
                </div>
              </Panel>

              {/* Help */}
              <Panel title="Tips">
                <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-2)' }}>
                  <div>• Be specific in your subject line</div>
                  <div>• Include steps to reproduce issues</div>
                  <div>• Attach screenshots if helpful</div>
                  <div>• Select appropriate category for faster routing</div>
                </div>
              </Panel>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
