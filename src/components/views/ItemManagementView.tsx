import { Plus, Search, Filter } from "lucide-react";
import { useState } from "react";

// TODO: Fetch items from Supabase
export function ItemManagementView() {
  type ItemRow = {
    id: string;
    name: string;
    category: string;
    stock: number;
    minStock: number;
    location: string;
    status: string;
    unitPrice: string;
  };

  const items: ItemRow[] = [];
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="pds-page flex-1">
      <div className="pds-page-header px-4 py-3 flex items-center justify-between">
        <h2 className="pds-page-title">Item Management</h2>
        <button
          type="button"
          className="pds-btn pds-btn--primary pds-focus"
          onClick={() => setMessage("Creating items is not implemented yet.")}
        >
          <Plus size={14} />
          New Item
        </button>
      </div>

      {message && (
        <div className="pds-panel px-4 py-2 text-sm" style={{ color: "var(--pds-danger)" }}>
          {message}
        </div>
      )}

      <div className="pds-panel">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--pds-text-muted)" }}
            />
            <input
              type="text"
              placeholder="Search items..."
              className="pds-input pds-focus w-full pl-10"
            />
          </div>
          <button
            type="button"
            className="pds-btn pds-btn--outline pds-focus"
            onClick={() => setMessage("Filters are not implemented yet.")}
          >
            <Filter size={14} />
            Filters
          </button>
        </div>
      </div>

      <div className="pds-panel flex-1 overflow-auto p-0">
        <table className="pds-table">
          <thead className="pds-thead">
            <tr>
              <th className="pds-th">Item ID</th>
              <th className="pds-th">Name</th>
              <th className="pds-th">Category</th>
              <th className="pds-th">Stock</th>
              <th className="pds-th">Min. Stock</th>
              <th className="pds-th">Location</th>
              <th className="pds-th">Status</th>
              <th className="pds-th">Unit Price</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr className="pds-row">
                <td colSpan={8} className="pds-td" style={{ color: "var(--pds-text-muted)" }}>
                  No items found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="pds-row"
                  style={{ cursor: "pointer" }}
                >
                  <td className="pds-td">
                    <span style={{ color: "var(--pds-accent)", fontWeight: 650 }}>{item.id}</span>
                  </td>
                  <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                    {item.name}
                  </td>
                  <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                    {item.category}
                  </td>
                  <td className="pds-td" style={{ color: "var(--pds-text)", fontWeight: 650 }}>
                    {item.stock}
                  </td>
                  <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                    {item.minStock}
                  </td>
                  <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                    {item.location}
                  </td>
                  <td className="pds-td">
                    <span className="pds-chip" data-tone="muted">
                      {item.status}
                    </span>
                  </td>
                  <td className="pds-td" style={{ color: "var(--pds-text)", fontWeight: 650 }}>
                    {item.unitPrice}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}