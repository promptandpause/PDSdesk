import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input } from '../components';

interface Category {
  id: string;
  name: string;
}

export function TicketNewPage() {
  const navigate = useNavigate();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from('ticket_categories').select('id,name').order('name');
      setCategories((data as Category[]) ?? []);
      setLoading(false);
    }
    void loadCategories();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setSubmitting(true);

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category: category || null,
        status: 'open',
        requester_id: user.id,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) {
      setSubmitting(false);
      return;
    }

    navigate(`/tickets/${data.id}`);
  };

  return (
    <div>
      <PageHeader
        title="New Ticket"
        breadcrumbs={[
          { label: 'Tickets', to: '/tickets' },
          { label: 'New' },
        ]}
        actions={
          <Button variant="ghost" onClick={() => navigate('/tickets')}>
            Cancel
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)', maxWidth: 720 }}>
        <Panel>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-4)' }}>
              <Input
                label="Subject"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of the issue"
                required
              />

              <div>
                <label
                  className="itsm-label"
                  style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}
                >
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about the issue..."
                  style={{
                    width: '100%',
                    minHeight: 120,
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <div>
                  <label
                    className="itsm-label"
                    style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}
                  >
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      backgroundColor: 'var(--itsm-surface-base)',
                      color: 'var(--itsm-text-primary)',
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label
                    className="itsm-label"
                    style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}
                  >
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      backgroundColor: 'var(--itsm-surface-base)',
                      color: 'var(--itsm-text-primary)',
                    }}
                  >
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)', marginTop: 'var(--itsm-space-2)' }}>
                <Button variant="secondary" type="button" onClick={() => navigate('/tickets')}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={!title.trim() || submitting} loading={submitting}>
                  Create Ticket
                </Button>
              </div>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
