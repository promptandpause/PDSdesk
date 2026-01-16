import {
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { useState } from "react";

// TODO: Fetch contracts from Supabase
export function ContractsManagementView() {
  const contracts: never[] = [];
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="pds-page flex-1">
      <div className="pds-page-header px-4 py-3 flex items-center justify-between">
        <h2 className="pds-page-title">
          Contract Management & SLM
        </h2>
        <button
          type="button"
          className="pds-btn pds-btn--primary pds-focus"
          onClick={() => setMessage("Creating contracts is not implemented yet.")}
        >
          <Plus size={14} />
          New Contract
        </button>
      </div>

      {message && (
        <div className="pds-message" data-tone="danger">
          {message}
        </div>
      )}

      {/* Search */}
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
              placeholder="Search contracts..."
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

        <div className="pds-table-wrap">
          <table className="pds-table">
            <thead className="pds-thead">
              <tr>
                <th className="pds-th">Contract ID</th>
                <th className="pds-th">Name</th>
                <th className="pds-th">Supplier</th>
                <th className="pds-th">Start Date</th>
                <th className="pds-th">End Date</th>
                <th className="pds-th">Value</th>
                <th className="pds-th">Status</th>
                <th className="pds-th">SLA</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr className="pds-row">
                  <td className="pds-td pds-text-muted" colSpan={8}>
                    No contracts found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}