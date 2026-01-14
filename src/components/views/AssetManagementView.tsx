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
    if (!q) return assets;
    return assets.filter((a) => {
      const haystack = `${a.asset_tag} ${a.name} ${a.asset_type ?? ""} ${a.serial_number ?? ""} ${a.model ?? ""} ${a.manufacturer ?? ""} ${a.location ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [assets, searchTerm]);

  return (
    <div className="flex-1 flex h-full bg-white overflow-hidden">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Asset</DialogTitle>
            <DialogDescription>Create a new asset in the CMDB.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                value={createAssetTag}
                onChange={(e) => setCreateAssetTag(e.target.value)}
                placeholder="ASSET-0001"
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Dell XPS 15"
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
                placeholder="Laptop"
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                value={createSerial}
                onChange={(e) => setCreateSerial(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                value={createModel}
                onChange={(e) => setCreateModel(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                value={createManufacturer}
                onChange={(e) => setCreateManufacturer(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                value={createLocation}
                onChange={(e) => setCreateLocation(e.target.value)}
                disabled={createSubmitting}
              />
            </div>
            {createError && (
              <div className="text-sm text-red-600">{createError}</div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors"
              onClick={() => setCreateOpen(false)}
              disabled={createSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors"
              onClick={() => void submitCreate()}
              disabled={createSubmitting}
            >
              {createSubmitting ? "Creating..." : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
        <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2d3e50]">
            Asset Management
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-1"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} />
              New Asset
            </button>
            <button className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1">
              <Download size={14} />
              Export
            </button>
            <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
              <Settings size={16} className="text-[#2d3e50]" />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-300 px-4 py-3 flex items-center gap-3 bg-white">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
            />
          </div>
          <button className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-1">
            <Filter size={14} />
            Filters
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {error && (
            <div className="m-4 bg-white border border-gray-300 rounded p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#f5f5f5] border-b border-gray-300 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                    Asset Tag
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                    Location
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-[#2d3e50]">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={`border-b border-gray-200 hover:bg-[#f9f9f9] cursor-pointer transition-colors ${
                      selectedAssetId === asset.id ? "bg-[#e6f2ff]" : ""
                    }`}
                    onClick={() => openAsset(asset.id)}
                  >
                    <td className="px-4 py-3 text-[#4a9eff] font-medium">
                      {asset.asset_tag}
                    </td>
                    <td className="px-4 py-3">{asset.name}</td>
                    <td className="px-4 py-3">{asset.asset_type ?? ""}</td>
                    <td className="px-4 py-3">{asset.location ?? ""}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {asset.updated_at ? new Date(asset.updated_at).toLocaleDateString() : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedAssetId && (
        <div className="w-[440px] border-l border-gray-300 bg-white flex flex-col">
          <div className="border-b border-gray-300 px-4 py-3 flex items-center justify-between bg-[#f5f5f5]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#2d3e50]">
                <Package size={14} className="text-[#4a9eff]" />
                Asset
              </div>
              {!selectedLoading && selectedAsset && (
                <button
                  type="button"
                  className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-100"
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
                  className="px-2 py-1 bg-[#4a9eff] text-white rounded text-xs hover:bg-[#3a8eef]"
                  onClick={() => void submitEdit()}
                  disabled={editSubmitting}
                >
                  {editSubmitting ? "Saving..." : "Save"}
                </button>
              )}
              {editMode && (
                <button
                  type="button"
                  className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-100"
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
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              onClick={closeAsset}
              title="Close"
            >
              <X size={16} className="text-[#2d3e50]" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {selectedError && (
              <div className="mb-3 bg-white border border-gray-300 rounded p-3 text-sm text-red-600">
                {selectedError}
              </div>
            )}

            {selectedLoading || !selectedAsset ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="space-y-3">
                <div>
                  {editMode ? (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Name</label>
                        <input
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Asset Tag</label>
                        <input
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          value={editAssetTag}
                          onChange={(e) => setEditAssetTag(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <input
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                        <select
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
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
                        <label className="block text-xs text-gray-500 mb-1">Serial</label>
                        <input
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          value={editSerial}
                          onChange={(e) => setEditSerial(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Model</label>
                        <input
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Manufacturer</label>
                        <input
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          value={editManufacturer}
                          onChange={(e) => setEditManufacturer(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Location</label>
                        <input
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-lg font-semibold text-[#2d3e50]">
                        {selectedAsset.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {selectedAsset.asset_tag}
                      </div>
                    </>
                  )}
                </div>

                {!editMode && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Type</div>
                      <div className="text-[#2d3e50]">{selectedAsset.asset_type ?? ""}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Status</div>
                      <div className="text-[#2d3e50]">{selectedAsset.status}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Serial</div>
                      <div className="text-[#2d3e50]">{selectedAsset.serial_number ?? ""}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Model</div>
                      <div className="text-[#2d3e50]">{selectedAsset.model ?? ""}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Manufacturer</div>
                      <div className="text-[#2d3e50]">{selectedAsset.manufacturer ?? ""}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Location</div>
                      <div className="text-[#2d3e50]">{selectedAsset.location ?? ""}</div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3 space-y-2 text-xs text-gray-600">
                  <div>
                    <span className="text-gray-500">Purchased:</span>{" "}
                    {selectedAsset.purchased_at ? new Date(selectedAsset.purchased_at).toLocaleDateString() : ""}
                  </div>
                  <div>
                    <span className="text-gray-500">Warranty expires:</span>{" "}
                    {selectedAsset.warranty_expires_at ? new Date(selectedAsset.warranty_expires_at).toLocaleDateString() : ""}
                  </div>
                  <div>
                    <span className="text-gray-500">Updated:</span>{" "}
                    {selectedAsset.updated_at ? new Date(selectedAsset.updated_at).toLocaleString() : ""}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}