import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthProvider";

export function RequireAuth({
  children,
  requireAgent,
}: {
  children: ReactNode;
  requireAgent?: boolean;
}) {
  const { loading, user, roles } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="pds-page flex-1" style={{ justifyContent: "center" }}>
        <div className="pds-panel" style={{ maxWidth: 520, width: "100%", margin: "0 auto" }}>
          <div className="pds-text-muted" style={{ fontSize: 13 }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isAgent = roles.includes("operator") || roles.includes("service_desk_admin") || roles.includes("global_admin");
  if (requireAgent && !isAgent) {
    return <Navigate to="/my-tickets" replace />;
  }

  return <>{children}</>;
}
