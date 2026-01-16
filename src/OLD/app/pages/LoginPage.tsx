import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthProvider";

export function LoginPage() {
  const { loading, user, signInWithMicrosoft } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const state = location.state as { from?: { pathname?: string } } | null;
    const target = state?.from?.pathname ?? "/tickets";
    navigate(target, { replace: true });
  }, [loading, location.state, navigate, user]);

  return (
    <div className="pds-page flex-1" style={{ justifyContent: "center" }}>
      <div className="pds-panel" style={{ maxWidth: 520, width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h1 className="pds-page-title">Service Desk</h1>
            <div className="pds-text-muted" style={{ fontSize: 13 }}>
              Sign in to continue.
            </div>
          </div>

          <button
            type="button"
            className="pds-btn pds-btn--primary pds-focus"
            onClick={() => void signInWithMicrosoft()}
            disabled={loading}
            style={{ width: "100%" }}
          >
            Continue with Microsoft
          </button>

          <div className="pds-text-muted" style={{ fontSize: 12 }}>
            You will be redirected to Microsoft to complete sign-in.
          </div>
        </div>
      </div>
    </div>
  );
}
