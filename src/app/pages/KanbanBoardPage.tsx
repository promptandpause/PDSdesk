import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Badge } from '../components';

interface KanbanBoard {
  id: string;
  name: string;
  description: string | null;
  is_shared: boolean;
  created_by: string;
  created_at: string;
}

interface KanbanColumn {
  id: string;
  board_id: string;
  name: string;
  color: string | null;
  position: number;
}

interface KanbanCard {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  position: number;
  assigned_to: string | null;
  due_date: string | null;
  tags: string[];
  priority: string;
  created_by: string;
  created_at: string;
}

const DEFAULT_COLUMNS = [
  { name: 'Backlog', color: '#6B7280' },
  { name: 'To Do', color: '#3B82F6' },
  { name: 'In Progress', color: '#F59E0B' },
  { name: 'Done', color: '#10B981' },
];

export function KanbanBoardPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user } = useAuth();

  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<KanbanBoard | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Board form
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [boardFormData, setBoardFormData] = useState({ name: '', description: '', is_shared: false });

  // Card form
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [cardFormData, setCardFormData] = useState({
    column_id: '',
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchBoards = useCallback(async () => {
    const { data, error } = await supabase
      .from('kanban_boards')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBoards(data as KanbanBoard[]);
      if (data.length > 0 && !selectedBoard) {
        setSelectedBoard(data[0] as KanbanBoard);
      }
    }
    setLoading(false);
  }, [supabase, selectedBoard]);

  const fetchBoardData = useCallback(async () => {
    if (!selectedBoard) return;

    const [{ data: colsData }, { data: cardsData }] = await Promise.all([
      supabase
        .from('kanban_columns')
        .select('*')
        .eq('board_id', selectedBoard.id)
        .order('position'),
      supabase
        .from('kanban_cards')
        .select('*')
        .in(
          'column_id',
          (await supabase.from('kanban_columns').select('id').eq('board_id', selectedBoard.id)).data?.map((c: any) => c.id) ?? []
        )
        .order('position'),
    ]);

    if (colsData) setColumns(colsData as KanbanColumn[]);
    if (cardsData) setCards(cardsData as KanbanCard[]);
  }, [supabase, selectedBoard]);

  useEffect(() => {
    void fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (selectedBoard) {
      void fetchBoardData();
    }
  }, [selectedBoard, fetchBoardData]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardFormData.name.trim() || !user) return;

    setSaving(true);

    const { data: newBoard, error } = await supabase
      .from('kanban_boards')
      .insert({
        name: boardFormData.name.trim(),
        description: boardFormData.description.trim() || null,
        is_shared: boardFormData.is_shared,
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && newBoard) {
      // Create default columns
      const columnsToInsert = DEFAULT_COLUMNS.map((col, idx) => ({
        board_id: newBoard.id,
        name: col.name,
        color: col.color,
        position: idx,
      }));

      await supabase.from('kanban_columns').insert(columnsToInsert);

      setSelectedBoard(newBoard as KanbanBoard);
      setBoardFormData({ name: '', description: '', is_shared: false });
      setShowBoardForm(false);
      void fetchBoards();
    }

    setSaving(false);
  };

  const handleDeleteBoard = async () => {
    if (!selectedBoard || !confirm(`Delete board "${selectedBoard.name}"? This will delete all columns and cards.`)) return;

    await supabase.from('kanban_boards').delete().eq('id', selectedBoard.id);
    setSelectedBoard(null);
    void fetchBoards();
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFormData.title.trim() || !cardFormData.column_id || !user) return;

    setSaving(true);

    const maxPosition = cards.filter((c) => c.column_id === cardFormData.column_id).length;

    const payload = {
      column_id: cardFormData.column_id,
      title: cardFormData.title.trim(),
      description: cardFormData.description.trim() || null,
      priority: cardFormData.priority,
      due_date: cardFormData.due_date || null,
      tags: cardFormData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      position: maxPosition,
      created_by: user.id,
    };

    if (editingCard) {
      await supabase.from('kanban_cards').update(payload).eq('id', editingCard.id);
    } else {
      await supabase.from('kanban_cards').insert(payload);
    }

    setSaving(false);
    resetCardForm();
    void fetchBoardData();
  };

  const resetCardForm = () => {
    setCardFormData({
      column_id: columns[0]?.id ?? '',
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      tags: '',
    });
    setEditingCard(null);
    setShowCardForm(false);
  };

  const handleEditCard = (card: KanbanCard) => {
    setEditingCard(card);
    setCardFormData({
      column_id: card.column_id,
      title: card.title,
      description: card.description ?? '',
      priority: card.priority,
      due_date: card.due_date ? card.due_date.split('T')[0] : '',
      tags: card.tags.join(', '),
    });
    setShowCardForm(true);
  };

  const handleDeleteCard = async (card: KanbanCard) => {
    if (!confirm(`Delete card "${card.title}"?`)) return;
    await supabase.from('kanban_cards').delete().eq('id', card.id);
    void fetchBoardData();
  };

  const handleMoveCard = async (card: KanbanCard, newColumnId: string) => {
    const maxPosition = cards.filter((c) => c.column_id === newColumnId).length;
    await supabase
      .from('kanban_cards')
      .update({ column_id: newColumnId, position: maxPosition })
      .eq('id', card.id);
    void fetchBoardData();
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="danger">High</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'low':
        return <Badge variant="neutral">Low</Badge>;
      default:
        return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Kanban Boards" subtitle="Visual project management" />
        <div style={{ padding: 'var(--itsm-space-6)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Kanban Boards"
        subtitle={selectedBoard ? selectedBoard.name : 'Visual project management'}
        actions={
          <>
            {boards.length > 0 && (
              <select
                value={selectedBoard?.id ?? ''}
                onChange={(e) => {
                  const board = boards.find((b) => b.id === e.target.value);
                  setSelectedBoard(board ?? null);
                }}
                style={{
                  height: 32,
                  padding: '0 var(--itsm-space-3)',
                  fontSize: 'var(--itsm-text-sm)',
                  border: '1px solid var(--itsm-border-default)',
                  borderRadius: 'var(--itsm-input-radius)',
                  backgroundColor: 'var(--itsm-surface-base)',
                  cursor: 'pointer',
                  minWidth: 150,
                }}
              >
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name} {board.is_shared ? '(Shared)' : ''}
                  </option>
                ))}
              </select>
            )}
            <Button variant="ghost" onClick={() => setShowBoardForm(true)}>
              New Board
            </Button>
            {selectedBoard && (
              <Button variant="primary" onClick={() => {
                setCardFormData({ ...cardFormData, column_id: columns[0]?.id ?? '' });
                setShowCardForm(true);
              }}>
                Add Card
              </Button>
            )}
          </>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Board Form */}
        {showBoardForm && (
          <Panel title="New Board" style={{ marginBottom: 'var(--itsm-space-4)' }}>
            <form onSubmit={handleCreateBoard}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Board Name"
                  value={boardFormData.name}
                  onChange={(e) => setBoardFormData({ ...boardFormData, name: e.target.value })}
                  placeholder="e.g., Project Alpha"
                  required
                />
                <Input
                  label="Description"
                  value={boardFormData.description}
                  onChange={(e) => setBoardFormData({ ...boardFormData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div style={{ marginTop: 'var(--itsm-space-3)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={boardFormData.is_shared}
                    onChange={(e) => setBoardFormData({ ...boardFormData, is_shared: e.target.checked })}
                  />
                  <span style={{ fontSize: 'var(--itsm-text-sm)' }}>Share with team</span>
                </label>
              </div>
              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)' }}>
                <Button variant="ghost" type="button" onClick={() => setShowBoardForm(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving}>
                  Create Board
                </Button>
              </div>
            </form>
          </Panel>
        )}

        {/* Card Form */}
        {showCardForm && (
          <Panel title={editingCard ? 'Edit Card' : 'New Card'} style={{ marginBottom: 'var(--itsm-space-4)' }}>
            <form onSubmit={handleCreateCard}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Title"
                  value={cardFormData.title}
                  onChange={(e) => setCardFormData({ ...cardFormData, title: e.target.value })}
                  placeholder="Card title"
                  required
                />
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Column
                  </label>
                  <select
                    value={cardFormData.column_id}
                    onChange={(e) => setCardFormData({ ...cardFormData, column_id: e.target.value })}
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      backgroundColor: 'var(--itsm-surface-base)',
                    }}
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Priority
                  </label>
                  <select
                    value={cardFormData.priority}
                    onChange={(e) => setCardFormData({ ...cardFormData, priority: e.target.value })}
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      backgroundColor: 'var(--itsm-surface-base)',
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Description
                  </label>
                  <textarea
                    value={cardFormData.description}
                    onChange={(e) => setCardFormData({ ...cardFormData, description: e.target.value })}
                    placeholder="Card description..."
                    style={{
                      width: '100%',
                      minHeight: 60,
                      padding: 'var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      resize: 'vertical',
                      backgroundColor: 'var(--itsm-surface-base)',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
                  <Input
                    label="Due Date"
                    type="date"
                    value={cardFormData.due_date}
                    onChange={(e) => setCardFormData({ ...cardFormData, due_date: e.target.value })}
                  />
                  <Input
                    label="Tags"
                    value={cardFormData.tags}
                    onChange={(e) => setCardFormData({ ...cardFormData, tags: e.target.value })}
                    placeholder="tag1, tag2"
                  />
                </div>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  {editingCard && (
                    <Button variant="ghost" type="button" onClick={() => void handleDeleteCard(editingCard)}>
                      Delete Card
                    </Button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 'var(--itsm-space-2)' }}>
                  <Button variant="ghost" type="button" onClick={resetCardForm}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" loading={saving}>
                    {editingCard ? 'Save Changes' : 'Add Card'}
                  </Button>
                </div>
              </div>
            </form>
          </Panel>
        )}

        {/* No boards */}
        {boards.length === 0 && !showBoardForm && (
          <Panel>
            <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)' }}>
              <p style={{ color: 'var(--itsm-text-tertiary)', marginBottom: 'var(--itsm-space-4)' }}>
                No kanban boards yet. Create your first board to get started.
              </p>
              <Button variant="primary" onClick={() => setShowBoardForm(true)}>
                Create Board
              </Button>
            </div>
          </Panel>
        )}

        {/* Kanban Columns */}
        {selectedBoard && columns.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
              gap: 'var(--itsm-space-4)',
              minHeight: 500,
            }}
          >
            {columns.map((column) => {
              const columnCards = cards.filter((c) => c.column_id === column.id);
              return (
                <div
                  key={column.id}
                  style={{
                    backgroundColor: 'var(--itsm-surface-sunken)',
                    borderRadius: 'var(--itsm-panel-radius)',
                    padding: 'var(--itsm-space-3)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 'var(--itsm-space-3)',
                      paddingBottom: 'var(--itsm-space-2)',
                      borderBottom: `3px solid ${column.color ?? 'var(--itsm-gray-400)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)' }}>
                      <span style={{ fontWeight: 'var(--itsm-weight-semibold)' as any, fontSize: 'var(--itsm-text-sm)' }}>
                        {column.name}
                      </span>
                      <span
                        style={{
                          fontSize: 'var(--itsm-text-xs)',
                          color: 'var(--itsm-text-tertiary)',
                          backgroundColor: 'var(--itsm-gray-200)',
                          padding: '2px 6px',
                          borderRadius: 10,
                        }}
                      >
                        {columnCards.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCardFormData({ ...cardFormData, column_id: column.id });
                        setShowCardForm(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                        color: 'var(--itsm-text-tertiary)',
                        padding: '2px 6px',
                      }}
                    >
                      +
                    </button>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-2)', overflowY: 'auto' }}>
                    {columnCards.map((card) => (
                      <div
                        key={card.id}
                        style={{
                          backgroundColor: 'var(--itsm-surface-base)',
                          borderRadius: 'var(--itsm-panel-radius)',
                          padding: 'var(--itsm-space-3)',
                          border: '1px solid var(--itsm-border-subtle)',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleEditCard(card)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--itsm-space-2)' }}>
                          <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any, fontSize: 'var(--itsm-text-sm)' }}>
                            {card.title}
                          </span>
                          {getPriorityBadge(card.priority)}
                        </div>

                        {card.description && (
                          <p style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginBottom: 'var(--itsm-space-2)', lineHeight: 1.4 }}>
                            {card.description.slice(0, 60)}{card.description.length > 60 ? '...' : ''}
                          </p>
                        )}

                        {card.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 'var(--itsm-space-2)' }}>
                            {card.tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: 10,
                                  padding: '1px 4px',
                                  backgroundColor: 'var(--itsm-primary-100)',
                                  color: 'var(--itsm-primary-700)',
                                  borderRadius: 2,
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Quick move buttons */}
                        <div
                          style={{ display: 'flex', gap: 'var(--itsm-space-1)', flexWrap: 'wrap' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {columns.filter((c) => c.id !== card.column_id).map((col) => (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => void handleMoveCard(card, col.id)}
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                border: '1px solid var(--itsm-border-subtle)',
                                borderRadius: 3,
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                color: 'var(--itsm-text-tertiary)',
                              }}
                            >
                              → {col.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {columnCards.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 'var(--itsm-space-4)', color: 'var(--itsm-text-tertiary)', fontSize: 'var(--itsm-text-xs)' }}>
                        No cards
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Board actions */}
        {selectedBoard && (
          <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={handleDeleteBoard}>
              Delete Board
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
