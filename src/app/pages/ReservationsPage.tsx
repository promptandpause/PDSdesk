import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthProvider';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Badge } from '../components';

interface Facility {
  id: string;
  name: string;
  description: string | null;
  facility_type: string;
  location: string | null;
  capacity: number | null;
  amenities: string[];
  is_active: boolean;
}

interface Reservation {
  id: string;
  facility_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  attendees: string[];
  reserved_by: string;
  created_at: string;
  facility?: Facility;
}

export function ReservationsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { user, isGlobalAdmin } = useAuth();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Reservation form
  const [showForm, setShowForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [formData, setFormData] = useState({
    facility_id: '',
    title: '',
    description: '',
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '10:00',
    attendees: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Facility form (admin)
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [facilityFormData, setFacilityFormData] = useState({
    name: '',
    description: '',
    facility_type: 'room',
    location: '',
    capacity: '',
    amenities: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);

    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const [{ data: facilitiesData }, { data: reservationsData }] = await Promise.all([
      supabase.from('facilities').select('*').order('name'),
      supabase
        .from('reservations')
        .select('*, facility:facilities(*)')
        .gte('start_time', startOfWeek.toISOString())
        .lte('start_time', endOfWeek.toISOString())
        .order('start_time'),
    ]);

    if (facilitiesData) setFacilities(facilitiesData as Facility[]);
    if (reservationsData) setReservations(reservationsData as Reservation[]);
    setLoading(false);
  }, [supabase, selectedDate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      facility_id: facilities[0]?.id ?? '',
      title: '',
      description: '',
      start_date: selectedDate,
      start_time: '09:00',
      end_date: selectedDate,
      end_time: '10:00',
      attendees: '',
    });
    setEditingReservation(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (reservation: Reservation) => {
    const startDate = new Date(reservation.start_time);
    const endDate = new Date(reservation.end_time);

    setEditingReservation(reservation);
    setFormData({
      facility_id: reservation.facility_id,
      title: reservation.title,
      description: reservation.description ?? '',
      start_date: startDate.toISOString().split('T')[0],
      start_time: startDate.toTimeString().slice(0, 5),
      end_date: endDate.toISOString().split('T')[0],
      end_time: endDate.toTimeString().slice(0, 5),
      attendees: reservation.attendees.join(', '),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.facility_id || !user) return;

    setSaving(true);
    setError('');

    const startTime = new Date(`${formData.start_date}T${formData.start_time}`);
    const endTime = new Date(`${formData.end_date}T${formData.end_time}`);

    if (endTime <= startTime) {
      setError('End time must be after start time');
      setSaving(false);
      return;
    }

    const payload = {
      facility_id: formData.facility_id,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      attendees: formData.attendees.split(',').map((a) => a.trim()).filter(Boolean),
    };

    let result;
    if (editingReservation) {
      result = await supabase.from('reservations').update(payload).eq('id', editingReservation.id);
    } else {
      result = await supabase.from('reservations').insert({
        ...payload,
        reserved_by: user.id,
      });
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    resetForm();
    void fetchData();
  };

  const handleCancel = async (reservation: Reservation) => {
    if (!confirm(`Cancel reservation "${reservation.title}"?`)) return;
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', reservation.id);
    void fetchData();
  };

  const handleDelete = async (reservation: Reservation) => {
    if (!confirm(`Delete reservation "${reservation.title}"?`)) return;
    await supabase.from('reservations').delete().eq('id', reservation.id);
    void fetchData();
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityFormData.name.trim() || !user) return;

    setSaving(true);

    await supabase.from('facilities').insert({
      name: facilityFormData.name.trim(),
      description: facilityFormData.description.trim() || null,
      facility_type: facilityFormData.facility_type,
      location: facilityFormData.location.trim() || null,
      capacity: facilityFormData.capacity ? parseInt(facilityFormData.capacity) : null,
      amenities: facilityFormData.amenities.split(',').map((a) => a.trim()).filter(Boolean),
      created_by: user.id,
    });

    setSaving(false);
    setShowFacilityForm(false);
    setFacilityFormData({
      name: '',
      description: '',
      facility_type: 'room',
      location: '',
      capacity: '',
      amenities: '',
    });
    void fetchData();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getFacilityTypeBadge = (type: string) => {
    switch (type) {
      case 'room':
        return <Badge variant="info">Room</Badge>;
      case 'vehicle':
        return <Badge variant="warning">Vehicle</Badge>;
      case 'equipment':
        return <Badge variant="neutral">Equipment</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  // Get week days for calendar view
  const weekDays = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return day;
    });
  }, [selectedDate]);

  const getReservationsForDay = (date: Date, facilityId: string) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return reservations.filter((r) => {
      const start = new Date(r.start_time);
      return r.facility_id === facilityId && start >= dayStart && start <= dayEnd && r.status !== 'cancelled';
    });
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Reservations" subtitle="Book rooms, vehicles, and equipment" />
        <div style={{ padding: 'var(--itsm-space-6)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reservations"
        subtitle="Book rooms, vehicles, and equipment"
        actions={
          <>
            {isGlobalAdmin && (
              <Button variant="ghost" onClick={() => setShowFacilityForm(true)}>
                Add Facility
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => {
                setFormData({ ...formData, facility_id: facilities[0]?.id ?? '', start_date: selectedDate, end_date: selectedDate });
                setShowForm(true);
              }}
            >
              New Reservation
            </Button>
          </>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {/* Facility Form (Admin) */}
        {showFacilityForm && isGlobalAdmin && (
          <Panel title="Add Facility" style={{ marginBottom: 'var(--itsm-space-4)' }}>
            <form onSubmit={handleCreateFacility}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Name"
                  value={facilityFormData.name}
                  onChange={(e) => setFacilityFormData({ ...facilityFormData, name: e.target.value })}
                  placeholder="Conference Room A"
                  required
                />
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Type
                  </label>
                  <select
                    value={facilityFormData.facility_type}
                    onChange={(e) => setFacilityFormData({ ...facilityFormData, facility_type: e.target.value })}
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
                    <option value="room">Room</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="equipment">Equipment</option>
                  </select>
                </div>
                <Input
                  label="Capacity"
                  type="number"
                  value={facilityFormData.capacity}
                  onChange={(e) => setFacilityFormData({ ...facilityFormData, capacity: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Location"
                  value={facilityFormData.location}
                  onChange={(e) => setFacilityFormData({ ...facilityFormData, location: e.target.value })}
                  placeholder="Building 1, Floor 2"
                />
                <Input
                  label="Amenities (comma-separated)"
                  value={facilityFormData.amenities}
                  onChange={(e) => setFacilityFormData({ ...facilityFormData, amenities: e.target.value })}
                  placeholder="projector, whiteboard, phone"
                />
              </div>
              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <Input
                  label="Description"
                  value={facilityFormData.description}
                  onChange={(e) => setFacilityFormData({ ...facilityFormData, description: e.target.value })}
                  placeholder="Description of the facility"
                />
              </div>
              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)' }}>
                <Button variant="ghost" type="button" onClick={() => setShowFacilityForm(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving}>
                  Add Facility
                </Button>
              </div>
            </form>
          </Panel>
        )}

        {/* Reservation Form */}
        {showForm && (
          <Panel title={editingReservation ? 'Edit Reservation' : 'New Reservation'} style={{ marginBottom: 'var(--itsm-space-4)' }}>
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ marginBottom: 'var(--itsm-space-3)', padding: 'var(--itsm-space-3)', backgroundColor: 'var(--itsm-danger-100)', color: 'var(--itsm-danger-700)', borderRadius: 'var(--itsm-panel-radius)', fontSize: 'var(--itsm-text-sm)' }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Team meeting"
                  required
                />
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Facility
                  </label>
                  <select
                    value={formData.facility_id}
                    onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      backgroundColor: 'var(--itsm-surface-base)',
                    }}
                    required
                  >
                    <option value="">Select facility...</option>
                    {facilities.filter((f) => f.is_active).map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name} ({facility.facility_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value, end_date: e.target.value })}
                  required
                />
                <Input
                  label="Start Time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
                <Input
                  label="End Date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
                <Input
                  label="End Time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <Input
                  label="Attendees (comma-separated emails)"
                  value={formData.attendees}
                  onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                  placeholder="john@example.com, jane@example.com"
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)' }}>
                <Input
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Meeting agenda or notes"
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)' }}>
                <Button variant="ghost" type="button" onClick={resetForm}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving}>
                  {editingReservation ? 'Save Changes' : 'Book'}
                </Button>
              </div>
            </form>
          </Panel>
        )}

        {/* Date Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-3)', marginBottom: 'var(--itsm-space-4)' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const prev = new Date(selectedDate);
              prev.setDate(prev.getDate() - 7);
              setSelectedDate(prev.toISOString().split('T')[0]);
            }}
          >
            ← Prev Week
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: 150 }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = new Date(selectedDate);
              next.setDate(next.getDate() + 7);
              setSelectedDate(next.toISOString().split('T')[0]);
            }}
          >
            Next Week →
          </Button>
          <div style={{ flex: 1 }} />
          <Button
            variant={viewMode === 'calendar' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>

        {facilities.length === 0 ? (
          <Panel>
            <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)', color: 'var(--itsm-text-tertiary)' }}>
              No facilities available. {isGlobalAdmin && 'Add a facility to get started.'}
            </div>
          </Panel>
        ) : viewMode === 'calendar' ? (
          /* Calendar View */
          <Panel noPadding>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 'var(--itsm-space-3)', borderBottom: '1px solid var(--itsm-border-subtle)', textAlign: 'left', width: 150, fontSize: 'var(--itsm-text-sm)', fontWeight: 'var(--itsm-weight-semibold)' as any }}>
                      Facility
                    </th>
                    {weekDays.map((day) => (
                      <th
                        key={day.toISOString()}
                        style={{
                          padding: 'var(--itsm-space-3)',
                          borderBottom: '1px solid var(--itsm-border-subtle)',
                          textAlign: 'center',
                          fontSize: 'var(--itsm-text-xs)',
                          fontWeight: 'var(--itsm-weight-medium)' as any,
                          backgroundColor: day.toDateString() === new Date().toDateString() ? 'var(--itsm-primary-50)' : undefined,
                        }}
                      >
                        <div>{day.toLocaleDateString([], { weekday: 'short' })}</div>
                        <div style={{ fontSize: 'var(--itsm-text-sm)', fontWeight: 'var(--itsm-weight-semibold)' as any }}>
                          {day.getDate()}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {facilities.filter((f) => f.is_active).map((facility) => (
                    <tr key={facility.id}>
                      <td style={{ padding: 'var(--itsm-space-3)', borderBottom: '1px solid var(--itsm-border-subtle)', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any, fontSize: 'var(--itsm-text-sm)' }}>
                          {facility.name}
                        </div>
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                          {facility.location}
                        </div>
                      </td>
                      {weekDays.map((day) => {
                        const dayReservations = getReservationsForDay(day, facility.id);
                        return (
                          <td
                            key={day.toISOString()}
                            style={{
                              padding: 'var(--itsm-space-2)',
                              borderBottom: '1px solid var(--itsm-border-subtle)',
                              borderLeft: '1px solid var(--itsm-border-subtle)',
                              verticalAlign: 'top',
                              backgroundColor: day.toDateString() === new Date().toDateString() ? 'var(--itsm-primary-50)' : undefined,
                              minHeight: 60,
                            }}
                          >
                            {dayReservations.map((res) => (
                              <div
                                key={res.id}
                                onClick={() => handleEdit(res)}
                                style={{
                                  padding: '4px 6px',
                                  marginBottom: 4,
                                  backgroundColor: 'var(--itsm-primary-100)',
                                  borderLeft: '3px solid var(--itsm-primary-500)',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  cursor: 'pointer',
                                }}
                              >
                                <div style={{ fontWeight: 500 }}>{res.title}</div>
                                <div style={{ color: 'var(--itsm-text-tertiary)' }}>
                                  {formatTime(res.start_time)} - {formatTime(res.end_time)}
                                </div>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          /* List View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--itsm-space-3)' }}>
            {reservations.length === 0 ? (
              <Panel>
                <div style={{ textAlign: 'center', padding: 'var(--itsm-space-8)', color: 'var(--itsm-text-tertiary)' }}>
                  No reservations this week
                </div>
              </Panel>
            ) : (
              reservations.map((reservation) => (
                <Panel key={reservation.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', marginBottom: 'var(--itsm-space-2)' }}>
                        <span style={{ fontWeight: 'var(--itsm-weight-semibold)' as any }}>{reservation.title}</span>
                        {getStatusBadge(reservation.status)}
                      </div>
                      <div style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-secondary)', marginBottom: 'var(--itsm-space-1)' }}>
                        <strong>{reservation.facility?.name}</strong> • {reservation.facility?.location}
                      </div>
                      <div style={{ fontSize: 'var(--itsm-text-sm)', color: 'var(--itsm-text-tertiary)' }}>
                        {formatDate(reservation.start_time)} {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                      </div>
                      {reservation.attendees.length > 0 && (
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)', marginTop: 'var(--itsm-space-2)' }}>
                          Attendees: {reservation.attendees.join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--itsm-space-1)' }}>
                      {reservation.status !== 'cancelled' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(reservation)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => void handleCancel(reservation)}>
                            Cancel
                          </Button>
                        </>
                      )}
                      {(reservation.reserved_by === user?.id || isGlobalAdmin) && (
                        <Button variant="ghost" size="sm" onClick={() => void handleDelete(reservation)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </Panel>
              ))
            )}
          </div>
        )}

        {/* Facilities List */}
        {isGlobalAdmin && (
          <div style={{ marginTop: 'var(--itsm-space-6)' }}>
            <h3 style={{ fontSize: 'var(--itsm-text-base)', fontWeight: 'var(--itsm-weight-semibold)' as any, marginBottom: 'var(--itsm-space-3)' }}>
              Manage Facilities
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--itsm-space-3)' }}>
              {facilities.map((facility) => (
                <Panel key={facility.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--itsm-space-2)', marginBottom: 'var(--itsm-space-1)' }}>
                        <span style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>{facility.name}</span>
                        {getFacilityTypeBadge(facility.facility_type)}
                        {!facility.is_active && <Badge variant="danger">Inactive</Badge>}
                      </div>
                      {facility.location && (
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                          {facility.location}
                        </div>
                      )}
                      {facility.capacity && (
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                          Capacity: {facility.capacity}
                        </div>
                      )}
                      {facility.amenities.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'var(--itsm-space-2)' }}>
                          {facility.amenities.map((amenity) => (
                            <span
                              key={amenity}
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                backgroundColor: 'var(--itsm-gray-100)',
                                borderRadius: 4,
                              }}
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
