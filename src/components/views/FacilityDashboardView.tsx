import {
  Thermometer,
  Zap,
  Users,
  AlertTriangle,
} from "lucide-react";

// TODO: Fetch facility metrics from Supabase
export function FacilityDashboardView() {
  return (
    <div className="pds-page flex-1">
      <div className="pds-page-header">
        <h2 className="pds-page-title">Facility Management Dashboard</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Building Occupancy */}
          <div className="pds-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs pds-text-muted">Building Occupancy</span>
              <Users size={16} style={{ color: "var(--pds-info)" }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--pds-text)" }}>N/A</div>
            <div className="text-xs pds-text-muted mt-1">&nbsp;</div>
          </div>

          {/* Temperature */}
          <div className="pds-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs pds-text-muted">Avg Temperature</span>
              <Thermometer size={16} style={{ color: "var(--pds-warning)" }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--pds-text)" }}>N/A</div>
            <div className="text-xs pds-text-muted mt-1">&nbsp;</div>
          </div>

          {/* Energy Usage */}
          <div className="pds-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs pds-text-muted">Energy Usage</span>
              <Zap size={16} style={{ color: "var(--pds-warning)" }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--pds-text)" }}>N/A</div>
            <div className="text-xs pds-text-muted mt-1">&nbsp;</div>
          </div>

          {/* Active Requests */}
          <div className="pds-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs pds-text-muted">Active Requests</span>
              <AlertTriangle size={16} style={{ color: "var(--pds-danger)" }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--pds-danger)" }}>0</div>
            <div className="text-xs pds-text-muted mt-1">&nbsp;</div>
          </div>
        </div>

        {/* Floor Status */}
        <div className="pds-panel">
          <h3 className="font-semibold text-sm mb-4">
            Floor Status
          </h3>
          <div className="space-y-3">
            <div className="text-xs pds-text-muted">No facility telemetry connected.</div>
          </div>
        </div>

        {/* Recent Facility Requests */}
        <div className="pds-panel">
          <h3 className="font-semibold text-sm mb-3">
            Recent Facility Requests
          </h3>
          <div className="pds-table-wrap">
            <table className="pds-table">
              <thead className="pds-thead">
                <tr>
                  <th className="pds-th">Request</th>
                  <th className="pds-th">Location</th>
                  <th className="pds-th">Priority</th>
                  <th className="pds-th">Status</th>
                  <th className="pds-th">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                <tr className="pds-row">
                  <td className="pds-td pds-text-muted" colSpan={5}>
                    No facility requests found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}