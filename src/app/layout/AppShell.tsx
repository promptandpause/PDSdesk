import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthProvider";

function SideLink({
  to,
  label,
}: {
  to: string;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `pds-btn pds-btn--ghost pds-btn--sm pds-focus w-full ${isActive ? "pds-btn--active" : ""}`
      }
      style={({ isActive }) => ({
        justifyContent: "flex-start",
        background: isActive ? "var(--pds-accent-soft)" : undefined,
      })}
      end
    >
      <span style={{ color: "var(--pds-text)" }}>{label}</span>
    </NavLink>
  );
}

export function AppShell() {
  const { profile, signOut, roles } = useAuth();
  const navigate = useNavigate();

  const isAgent = roles.includes("operator") || roles.includes("service_desk_admin") || roles.includes("global_admin");

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <aside
        className="pds-panel"
        style={{
          width: 260,
          borderRadius: 0,
          padding: 0,
          borderRight: "1px solid var(--pds-border)",
        }}
      >
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--pds-border)" }}>
          <div className="text-sm" style={{ fontWeight: 750, color: "var(--pds-text)" }}>
            Service Desk
          </div>
          <div className="pds-text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            {profile?.full_name ?? profile?.email ?? "Signed in"}
          </div>
        </div>

        <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {isAgent ? (
            <>
              <div className="pds-text-muted" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", padding: "6px 8px" }}>
                Agent
              </div>
              <SideLink to="/tickets" label="Tickets" />
              <SideLink to="/tickets/new" label="New ticket" />
              <SideLink to="/dashboard" label="Dashboard" />
              <SideLink to="/kb" label="Knowledge Base" />
              <SideLink to="/search" label="Search" />
              <SideLink to="/customers" label="Customers" />
              <SideLink to="/contacts" label="Contacts" />
              <SideLink to="/call-logs" label="Call logs" />
            </>
          ) : null}

          <div className="pds-text-muted" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", padding: "10px 8px 6px" }}>
            Customer
          </div>
          <SideLink to="/my-tickets" label="My tickets" />
          <SideLink to="/my-tickets/new" label="New request" />
          <SideLink to="/kb-public" label="Knowledge Base" />
        </div>

        <div style={{ marginTop: "auto", padding: 12, borderTop: "1px solid var(--pds-border)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => navigate("/tickets")}
              style={{ flex: 1 }}
            >
              Home
            </button>
            <button
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => void signOut()}
              style={{ flex: 1 }}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
