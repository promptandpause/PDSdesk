import { useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button, Input, Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell, Badge } from '../components';

interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  asset_type: string | null;
  status: string;
  serial_number: string | null;
  model: string | null;
  manufacturer: string | null;
  purchased_at: string | null;
  warranty_expires_at: string | null;
  assigned_user_id: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export function AssetsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    asset_tag: '',
    name: '',
    asset_type: '',
    status: 'active',
    serial_number: '',
    model: '',
    manufacturer: '',
    location: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('assets')
      .select('*')
      .order('asset_tag');

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setAssets(data as Asset[]);
    }
    setLoading(false);
  }, [supabase, statusFilter]);

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  const filteredAssets = assets.filter((asset) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      asset.asset_tag.toLowerCase().includes(searchLower) ||
      asset.name.toLowerCase().includes(searchLower) ||
      (asset.serial_number?.toLowerCase().includes(searchLower) ?? false) ||
      (asset.model?.toLowerCase().includes(searchLower) ?? false) ||
      (asset.location?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const resetForm = () => {
    setFormData({
      asset_tag: '',
      name: '',
      asset_type: '',
      status: 'active',
      serial_number: '',
      model: '',
      manufacturer: '',
      location: '',
    });
    setEditingAsset(null);
    setShowForm(false);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      asset_tag: asset.asset_tag,
      name: asset.name,
      asset_type: asset.asset_type ?? '',
      status: asset.status,
      serial_number: asset.serial_number ?? '',
      model: asset.model ?? '',
      manufacturer: asset.manufacturer ?? '',
      location: asset.location ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_tag.trim() || !formData.name.trim()) return;

    setSaving(true);

    const payload = {
      asset_tag: formData.asset_tag.trim(),
      name: formData.name.trim(),
      asset_type: formData.asset_type.trim() || null,
      status: formData.status,
      serial_number: formData.serial_number.trim() || null,
      model: formData.model.trim() || null,
      manufacturer: formData.manufacturer.trim() || null,
      location: formData.location.trim() || null,
    };

    if (editingAsset) {
      await supabase.from('assets').update(payload).eq('id', editingAsset.id);
    } else {
      await supabase.from('assets').insert(payload);
    }

    setSaving(false);
    resetForm();
    void fetchAssets();
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Delete asset "${asset.name}" (${asset.asset_tag})?`)) return;
    await supabase.from('assets').delete().eq('id', asset.id);
    void fetchAssets();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="neutral">Inactive</Badge>;
      case 'retired':
        return <Badge variant="red">Retired</Badge>;
      case 'maintenance':
        return <Badge variant="yellow">Maintenance</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div>
      <PageHeader
        title="Assets"
        subtitle="IT asset inventory and CMDB"
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Add Asset
          </Button>
        }
      />

      <div style={{ padding: 'var(--itsm-space-6)' }}>
        {showForm && (
          <Panel
            title={editingAsset ? 'Edit Asset' : 'New Asset'}
            style={{ marginBottom: 'var(--itsm-space-4)' }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Asset Tag"
                  value={formData.asset_tag}
                  onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                  placeholder="e.g., LAPTOP-001"
                  required
                />
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Dell Latitude 5520"
                  required
                />
                <Input
                  label="Asset Type"
                  value={formData.asset_type}
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                  placeholder="e.g., Laptop, Monitor, Phone"
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Serial Number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="e.g., ABC123XYZ"
                />
                <Input
                  label="Model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., Latitude 5520"
                />
                <Input
                  label="Manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., Dell, HP, Lenovo"
                />
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--itsm-space-4)' }}>
                <Input
                  label="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Building A, Floor 2"
                />
                <div>
                  <label className="itsm-label" style={{ display: 'block', marginBottom: 'var(--itsm-space-2)' }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '0 var(--itsm-space-3)',
                      fontSize: 'var(--itsm-text-sm)',
                      border: '1px solid var(--itsm-border-default)',
                      borderRadius: 'var(--itsm-input-radius)',
                      backgroundColor: 'var(--itsm-surface-base)',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 'var(--itsm-space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-2)' }}>
                <Button variant="ghost" type="button" onClick={resetForm}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                  {editingAsset ? 'Save Changes' : 'Create Asset'}
                </Button>
              </div>
            </form>
          </Panel>
        )}

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--itsm-space-3)',
            marginBottom: 'var(--itsm-space-4)',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, maxWidth: 300 }}>
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 32,
              padding: '0 var(--itsm-space-3)',
              fontSize: 'var(--itsm-text-sm)',
              border: '1px solid var(--itsm-border-default)',
              borderRadius: 'var(--itsm-input-radius)',
              backgroundColor: 'var(--itsm-surface-base)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>

        <Panel noPadding>
          {loading ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              Loading...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center', color: 'var(--itsm-text-tertiary)' }}>
              No assets found
            </div>
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell width={120}>Asset Tag</TableHeaderCell>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell width={100}>Type</TableHeaderCell>
                  <TableHeaderCell width={120}>Serial</TableHeaderCell>
                  <TableHeaderCell width={120}>Location</TableHeaderCell>
                  <TableHeaderCell width={100}>Status</TableHeaderCell>
                  <TableHeaderCell width={100} align="right">Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {filteredAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell mono>{asset.asset_tag}</TableCell>
                    <TableCell>
                      <div style={{ fontWeight: 'var(--itsm-weight-medium)' as any }}>
                        {asset.name}
                      </div>
                      {asset.manufacturer && (
                        <div style={{ fontSize: 'var(--itsm-text-xs)', color: 'var(--itsm-text-tertiary)' }}>
                          {asset.manufacturer} {asset.model && `• ${asset.model}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell muted>{asset.asset_type ?? '—'}</TableCell>
                    <TableCell mono muted>{asset.serial_number ?? '—'}</TableCell>
                    <TableCell muted>{asset.location ?? '—'}</TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell align="right">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--itsm-space-1)' }}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(asset)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDelete(asset)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
    </div>
  );
}
