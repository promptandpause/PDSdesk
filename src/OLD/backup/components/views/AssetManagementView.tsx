import {
  Plus,
  Search,
  Filter,
  Download,
  Settings,
  Package,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

// TODO: Fetch assets from Supabase
export function AssetManagementView() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [searchTerm, setSearchTerm] = useState("");

  type AssetColumn = "asset_tag" | "name" | "asset_type" | "location" | "status" | "updated_at";

  type AssetRow = {
    id: string;
    asset_tag: string;
    name: string;
    asset_type: string | null;
    status: string;
    serial_number: string | null;
    model: string | null;
    manufacturer: string | null;
    location: string | null;
    purchased_at: string | null;
    warranty_expires_at: string | null;
    created_at: string;
    updated_at: string;
  };

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("");

  const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<AssetColumn, boolean>>({
    asset_tag: true,
    name: true,
    asset_type: true,
    location: true,
    status: true,
    updated_at: true,
  });

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createAssetTag, setCreateAssetTag] = useState("");
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState("");
  const [createStatus, setCreateStatus] = useState("active");
  const [createSerial, setCreateSerial] = useState("");
  const [createModel, setCreateModel] = useState("");
  const [createManufacturer, setCreateManufacturer] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editAssetTag, setEditAssetTag] = useState("");
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editSerial, setEditSerial] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editManufacturer, setEditManufacturer] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      const res = await supabase
        .from("assets")
        .select("id,asset_tag,name,asset_type,status,serial_number,model,manufacturer,location,purchased_at,warranty_expires_at,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(300);

      if (cancelled) return;

      if (res.error) {
        setError(res.error.message);
        setAssets([]);
        setLoading(false);
        return;
      }

      setAssets((res.data ?? []) as AssetRow[]);
      setLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  useEffect(() => {
    if (!createOpen) return;
    setCreateError(null);
    setCreateSubmitting(false);
    setCreateAssetTag("");
    setCreateName("");
    setCreateType("");
    setCreateStatus("active");
    setCreateSerial("");
    setCreateModel("");
    setCreateManufacturer("");
    setCreateLocation("");
  }, [createOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromHash = () => {
      const raw = window.location.hash || "";
      const [path, query] = raw.replace(/^#\/?/, "").split("?");
      if ((path ?? "").split("/")[0] !== "asset-management") return;
      const params = new URLSearchParams(query ?? "");
      const id = params.get("assetId");
      setSelectedAssetId(id && id.trim() ? id.trim() : null);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { assetId?: string } | undefined;
      const id = detail?.assetId?.trim();
      if (!id) return;
      window.location.hash = `#/asset-management?assetId=${encodeURIComponent(id)}`;
    };
    window.addEventListener("pdsdesk:asset-management:open-asset", onOpen);
    return () => window.removeEventListener("pdsdesk:asset-management:open-asset", onOpen);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!selectedAssetId) {
      setSelectedAsset(null);
      setSelectedError(null);
      setSelectedLoading(false);
      setEditMode(false);
      setEditSubmitting(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setSelectedLoading(true);
      setSelectedError(null);

      const res = await supabase
        .from("assets")
        .select("id,asset_tag,name,asset_type,status,serial_number,model,manufacturer,location,purchased_at,warranty_expires_at,created_at,updated_at")
        .eq("id", selectedAssetId)
        .single();

      if (cancelled) return;

      if (res.error) {
        setSelectedError(res.error.message);
        setSelectedAsset(null);
        setSelectedLoading(false);
        return;
      }

      setSelectedAsset(res.data as AssetRow);
      setEditMode(false);
      setEditSubmitting(false);
      setSelectedLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedAssetId, supabase, user]);

  useEffect(() => {
    if (!selectedAsset) return;
    setEditAssetTag(selectedAsset.asset_tag ?? "");
    setEditName(selectedAsset.name ?? "");
    setEditType((selectedAsset.asset_type ?? "").trim());
    setEditStatus(selectedAsset.status ?? "active");
    setEditSerial((selectedAsset.serial_number ?? "").trim());
    setEditModel((selectedAsset.model ?? "").trim());
    setEditManufacturer((selectedAsset.manufacturer ?? "").trim());
    setEditLocation((selectedAsset.location ?? "").trim());
  }, [selectedAsset]);

  const refreshAssets = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);

    const res = await supabase
      .from("assets")
      .select("id,asset_tag,name,asset_type,status,serial_number,model,manufacturer,location,purchased_at,warranty_expires_at,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(300);

    if (res.error) {
      setError(res.error.message);
      setAssets([]);
      setLoading(false);
      return;
    }

    setAssets((res.data ?? []) as AssetRow[]);
    setLoading(false);
  };

  const submitCreate = async () => {
    if (!user) return;

    const asset_tag = createAssetTag.trim();
    const name = createName.trim();
    const asset_type = createType.trim() || null;
    const status = createStatus.trim() || "active";
    const serial_number = createSerial.trim() || null;
    const model = createModel.trim() || null;
    const manufacturer = createManufacturer.trim() || null;
    const location = createLocation.trim() || null;

    if (!asset_tag || !name) {
      setCreateError("Asset tag and name are required.");
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);

    const inserted = await supabase
      .from("assets")
      .insert({
        asset_tag,
        name,
        asset_type,
        status,
        serial_number,
        model,
        manufacturer,
        location,
      })
      .select("id")
      .single();

    if (inserted.error) {
      setCreateError(inserted.error.message);
      setCreateSubmitting(false);
      return;
    }

    setCreateSubmitting(false);
    setCreateOpen(false);
    await refreshAssets();
    openAsset(inserted.data.id as string);
  };

  const submitEdit = async () => {
    if (!user) return;
    if (!selectedAssetId) return;

    const asset_tag = editAssetTag.trim();
    const name = editName.trim();
    const asset_type = editType.trim() || null;
    const status = editStatus.trim() || "active";
    const serial_number = editSerial.trim() || null;
    const model = editModel.trim() || null;
    const manufacturer = editManufacturer.trim() || null;
    const location = editLocation.trim() || null;

    if (!asset_tag || !name) {
      setSelectedError("Asset tag and name are required.");
      return;
    }

    setEditSubmitting(true);
    setSelectedError(null);

    const upd = await supabase
      .from("assets")
      .update({
        asset_tag,
        name,
        asset_type,
        status,
        serial_number,
        model,
        manufacturer,
        location,
      })
      .eq("id", selectedAssetId);

    if (upd.error) {
      setSelectedError(upd.error.message);
      setEditSubmitting(false);
      return;
    }

    setEditMode(false);
    setEditSubmitting(false);
    await refreshAssets();
    const refreshed = await supabase
      .from("assets")
      .select("id,asset_tag,name,asset_type,status,serial_number,model,manufacturer,location,purchased_at,warranty_expires_at,created_at,updated_at")
      .eq("id", selectedAssetId)
      .single();
    if (!refreshed.error) {
      setSelectedAsset(refreshed.data as AssetRow);
    }
  };

  const openAsset = (assetId: string) => {
    if (typeof window === "undefined") return;
    const id = assetId.trim();
    if (!id) return;
    window.location.hash = `#/asset-management?assetId=${encodeURIComponent(id)}`;
  };

  const closeAsset = () => {
    if (typeof window === "undefined") return;
    window.location.hash = "#/asset-management";
  };

  const filteredAssets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const status = filterStatus.trim().toLowerCase();
    const type = filterType.trim().toLowerCase();
    const location = filterLocation.trim().toLowerCase();

    return assets.filter((a) => {
      if (status !== "all" && String(a.status ?? "").trim().toLowerCase() !== status) return false;
      if (type !== "all" && String(a.asset_type ?? "").trim().toLowerCase() !== type) return false;
      if (location) {
        const loc = String(a.location ?? "").trim().toLowerCase();
        if (!loc.includes(location)) return false;
      }

      if (!q) return true;
      const haystack = `${a.asset_tag} ${a.name} ${a.asset_type ?? ""} ${a.serial_number ?? ""} ${a.model ?? ""} ${a.manufacturer ?? ""} ${a.location ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [assets, filterLocation, filterStatus, filterType, searchTerm]);

  const exportCsv = () => {
    const colsAll: Array<{ key: AssetColumn; header: string }> = [
      { key: "asset_tag", header: "Asset Tag" },
      { key: "name", header: "Name" },
      { key: "asset_type", header: "Type" },
      { key: "location", header: "Location" },
      { key: "status", header: "Status" },
      { key: "updated_at", header: "Updated" },
    ];

    const cols = colsAll.filter((c) => columnVisibility[c.key]);

    const escape = (v: unknown) => {
      const s = String(v ?? "");
      if (s.includes("\"")) {
        return `"${s.replace(/\"/g, '""')}"`;
      }
      if (s.includes(",") || s.includes("\n") || s.includes("\r")) {
        return `"${s}"`;
      }
      return s;
    };

    const lines: string[] = [];
    lines.push(cols.map((c) => escape(c.header)).join(","));
    for (const a of filteredAssets) {
      const row = cols.map((c) => {
        switch (c.key) {
          case "asset_tag":
            return escape(a.asset_tag);
          case "name":
            return escape(a.name);
          case "asset_type":
            return escape(a.asset_type ?? "");
          case "location":
            return escape(a.location ?? "");
          case "status":
            return escape(a.status ?? "");
          case "updated_at":
            return escape(a.updated_at ? new Date(a.updated_at).toISOString() : "");
          default:
            return "";
        }
      });
      lines.push(row.join(","));
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `assets-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pds-page flex-1">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Asset</DialogTitle>
            <DialogDescription>Create a new asset in the CMDB.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Asset Tag
              </label>
              <input
                className="pds-input pds-focus"
                value={createAssetTag}
                onChange={(e) => setCreateAssetTag(e.target.value)}
                placeholder="Asset tag"
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Name
              </label>
              <input
                className="pds-input pds-focus"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Asset name"
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Type
              </label>
              <input
                className="pds-input pds-focus"
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
                placeholder="Asset type"
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Status
              </label>
              <select
                className="pds-input pds-focus"
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value)}
                disabled={createSubmitting}
              >
                <option value="active">Active</option>
                <option value="retired">Retired</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Serial
              </label>
              <input
                className="pds-input pds-focus"
                value={createSerial}
                onChange={(e) => setCreateSerial(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Model
              </label>
              <input
                className="pds-input pds-focus"
                value={createModel}
                onChange={(e) => setCreateModel(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Manufacturer
              </label>
              <input
                className="pds-input pds-focus"
                value={createManufacturer}
                onChange={(e) => setCreateManufacturer(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Location
              </label>
              <input
                className="pds-input pds-focus"
                value={createLocation}
                onChange={(e) => setCreateLocation(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            {createError && (
              <div className="text-sm" style={{ color: "var(--pds-danger)" }}>
                {createError}
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => setCreateOpen(false)}
              disabled={createSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pds-btn pds-btn--primary pds-focus"
              onClick={() => void submitCreate()}
              disabled={createSubmitting}
            >
              {createSubmitting ? "Creating..." : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>Filter assets shown in the list.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Status
              </label>
              <select
                className="pds-input pds-focus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Type
              </label>
              <input
                className="pds-input pds-focus"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                placeholder="all"
              />
              <div className="text-xs pds-text-muted mt-1">Use “all” to include all types. Matches exact type.</div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                Location contains
              </label>
              <input
                className="pds-input pds-focus"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                placeholder="HQ"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => {
                setFilterStatus("all");
                setFilterType("all");
                setFilterLocation("");
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="pds-btn pds-btn--primary pds-focus"
              onClick={() => setFiltersOpen(false)}
            >
              Apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewSettingsOpen} onOpenChange={setViewSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>View settings</DialogTitle>
            <DialogDescription>Choose which columns are visible.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {([
              ["asset_tag", "Asset Tag"],
              ["name", "Name"],
              ["asset_type", "Type"],
              ["location", "Location"],
              ["status", "Status"],
              ["updated_at", "Updated"],
            ] as Array<[AssetColumn, string]>).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 text-sm"
                style={{ color: "var(--pds-text)" }}
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  className="rounded pds-focus"
                  checked={columnVisibility[key]}
                  onChange={(e) => setColumnVisibility((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
              </label>
            ))}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => setViewSettingsOpen(false)}
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="pds-page-header px-4 py-3 flex items-center justify-between">
            <h2 className="pds-page-title">Asset Management</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="pds-btn pds-btn--primary pds-focus"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={14} />
                New Asset
              </button>
              <button
                type="button"
                className="pds-btn pds-btn--outline pds-focus"
                onClick={() => exportCsv()}
              >
                <Download size={14} />
                Export
              </button>
              <button
                type="button"
                className="pds-btn pds-btn--outline pds-btn--icon pds-focus"
                onClick={() => setViewSettingsOpen(true)}
                title="View settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          <div className="pds-panel">
            <div className="pds-actionbar">
              <div className="flex-1 relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--pds-text-muted)" }}
                />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pds-input pds-focus w-full pl-10"
                />
              </div>
              <button
                type="button"
                className="pds-btn pds-btn--outline pds-focus"
                onClick={() => setFiltersOpen(true)}
              >
                <Filter size={14} />
                Filters
              </button>
            </div>

            <div className="pds-table-wrap">
              {error && (
                <div className="pds-message" data-tone="danger">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="p-4 text-sm pds-text-muted">Loading...</div>
              ) : (
                <table className="pds-table">
                  <thead className="pds-thead">
                    <tr>
                      {columnVisibility.asset_tag && <th className="pds-th">Asset Tag</th>}
                      {columnVisibility.name && <th className="pds-th">Name</th>}
                      {columnVisibility.asset_type && <th className="pds-th">Type</th>}
                      {columnVisibility.location && <th className="pds-th">Location</th>}
                      {columnVisibility.status && <th className="pds-th">Status</th>}
                      {columnVisibility.updated_at && <th className="pds-th">Updated</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map((asset) => {
                      const selected = selectedAssetId === asset.id;
                      const tone =
                        asset.status === "active"
                          ? "success"
                          : asset.status === "maintenance"
                            ? "warning"
                            : "muted";

                      return (
                        <tr
                          key={asset.id}
                          className="pds-row"
                          data-selected={selected}
                          onClick={() => openAsset(asset.id)}
                          style={{ cursor: "pointer" }}
                        >
                          {columnVisibility.asset_tag && (
                            <td className="pds-td">
                              <span className="pds-link">{asset.asset_tag}</span>
                            </td>
                          )}
                          {columnVisibility.name && (
                            <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                              {asset.name}
                            </td>
                          )}
                          {columnVisibility.asset_type && (
                            <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                              {asset.asset_type ?? ""}
                            </td>
                          )}
                          {columnVisibility.location && (
                            <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                              {asset.location ?? ""}
                            </td>
                          )}
                          {columnVisibility.status && (
                            <td className="pds-td">
                              <span className="pds-chip" data-tone={tone}>
                                {asset.status}
                              </span>
                            </td>
                          )}
                          {columnVisibility.updated_at && (
                            <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                              {asset.updated_at ? new Date(asset.updated_at).toLocaleDateString() : ""}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {selectedAssetId && (
          <div
            className="w-[440px] pds-panel flex flex-col"
            style={{ borderRadius: 0, borderLeft: "1px solid var(--pds-border)" }}
          >
            <div className="pds-actionbar">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--pds-text)" }}>
                  <Package size={14} style={{ color: "var(--pds-accent)" }} />
                  Asset
                </div>
                {!selectedLoading && selectedAsset && (
                  <button
                    type="button"
                    className="pds-btn pds-btn--sm pds-btn--outline pds-focus"
                    onClick={() => {
                      if (editSubmitting) return;
                      setEditMode((prev) => !prev);
                    }}
                  >
                    {editMode ? "View" : "Edit"}
                  </button>
                )}
                {editMode && (
                  <button
                    type="button"
                    className="pds-btn pds-btn--sm pds-btn--primary pds-focus"
                    onClick={() => void submitEdit()}
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? "Saving..." : "Save"}
                  </button>
                )}
                {editMode && (
                  <button
                    type="button"
                    className="pds-btn pds-btn--sm pds-btn--outline pds-focus"
                    onClick={() => {
                      if (!selectedAsset) return;
                      setEditMode(false);
                      setEditAssetTag(selectedAsset.asset_tag ?? "");
                      setEditName(selectedAsset.name ?? "");
                      setEditType((selectedAsset.asset_type ?? "").trim());
                      setEditStatus(selectedAsset.status ?? "active");
                      setEditSerial((selectedAsset.serial_number ?? "").trim());
                      setEditModel((selectedAsset.model ?? "").trim());
                      setEditManufacturer((selectedAsset.manufacturer ?? "").trim());
                      setEditLocation((selectedAsset.location ?? "").trim());
                    }}
                    disabled={editSubmitting}
                  >
                    Cancel
                  </button>
                )}
              </div>
              <button
                type="button"
                className="pds-btn pds-btn--outline pds-btn--icon pds-focus"
                onClick={closeAsset}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {selectedError && (
                <div className="pds-message" data-tone="danger">
                  {selectedError}
                </div>
              )}

              {selectedLoading || !selectedAsset ? (
                <div className="text-sm pds-text-muted">Loading...</div>
              ) : (
                <div className="space-y-3">
                  <div>
                    {editMode ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs pds-text-muted mb-1">Name</label>
                          <input
                            className="pds-input pds-focus"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs pds-text-muted mb-1">Asset Tag</label>
                          <input
                            className="pds-input pds-focus"
                            value={editAssetTag}
                            onChange={(e) => setEditAssetTag(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs pds-text-muted mb-1">Type</label>
                          <input
                            className="pds-input pds-focus"
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs pds-text-muted mb-1">Status</label>
                          <select
                            className="pds-input pds-focus"
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            disabled={editSubmitting}
                          >
                            <option value="active">Active</option>
                            <option value="retired">Retired</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs pds-text-muted mb-1">Serial</label>
                          <input
                            className="pds-input pds-focus"
                            value={editSerial}
                            onChange={(e) => setEditSerial(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs pds-text-muted mb-1">Model</label>
                          <input
                            className="pds-input pds-focus"
                            value={editModel}
                            onChange={(e) => setEditModel(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs pds-text-muted mb-1">Manufacturer</label>
                          <input
                            className="pds-input pds-focus"
                            value={editManufacturer}
                            onChange={(e) => setEditManufacturer(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                        <div>
                          <label className="block text-xs pds-text-muted mb-1">Location</label>
                          <input
                            className="pds-input pds-focus"
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                            disabled={editSubmitting}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-lg font-semibold" style={{ color: "var(--pds-text)" }}>
                          {selectedAsset.name}
                        </div>
                        <div className="mt-1 text-xs pds-text-muted">{selectedAsset.asset_tag}</div>
                      </>
                    )}
                  </div>

                  {!editMode && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs pds-text-muted">Type</div>
                        <div style={{ color: "var(--pds-text)" }}>{selectedAsset.asset_type ?? ""}</div>
                      </div>
                      <div>
                        <div className="text-xs pds-text-muted">Status</div>
                        <div style={{ color: "var(--pds-text)" }}>{selectedAsset.status}</div>
                      </div>
                      <div>
                        <div className="text-xs pds-text-muted">Serial</div>
                        <div style={{ color: "var(--pds-text)" }}>{selectedAsset.serial_number ?? ""}</div>
                      </div>
                      <div>
                        <div className="text-xs pds-text-muted">Model</div>
                        <div style={{ color: "var(--pds-text)" }}>{selectedAsset.model ?? ""}</div>
                      </div>
                      <div>
                        <div className="text-xs pds-text-muted">Manufacturer</div>
                        <div style={{ color: "var(--pds-text)" }}>{selectedAsset.manufacturer ?? ""}</div>
                      </div>
                      <div>
                        <div className="text-xs pds-text-muted">Location</div>
                        <div style={{ color: "var(--pds-text)" }}>{selectedAsset.location ?? ""}</div>
                      </div>
                    </div>
                  )}

                  <div
                    className="pt-3 space-y-2 text-xs pds-text-muted"
                    style={{ borderTop: "1px solid var(--pds-border)" }}
                  >
                    <div>
                      <span className="pds-text-muted">Purchased:</span>{" "}
                      {selectedAsset.purchased_at ? new Date(selectedAsset.purchased_at).toLocaleDateString() : ""}
                    </div>
                    <div>
                      <span className="pds-text-muted">Warranty expires:</span>{" "}
                      {selectedAsset.warranty_expires_at
                        ? new Date(selectedAsset.warranty_expires_at).toLocaleDateString()
                        : ""}
                    </div>
                    <div>
                      <span className="pds-text-muted">Updated:</span>{" "}
                      {selectedAsset.updated_at ? new Date(selectedAsset.updated_at).toLocaleString() : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}