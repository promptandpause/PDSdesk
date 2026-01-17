import { useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSSOLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile openid',
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background gradient */}
      <div style={styles.backgroundGradient} />
      
      {/* Content */}
      <div style={styles.content}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <img
            src="https://promptandpause.com/press-kit/logos/logo-white.svg"
            alt="Prompt & Pause"
            style={styles.logo}
            onError={(e) => {
              // Fallback if CDN logo fails
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h1 style={styles.title}>PDSdesk</h1>
            <p style={styles.subtitle}>IT Service Management Portal</p>
          </div>

          <div style={styles.cardBody}>
            <p style={styles.description}>
              Sign in with your organization account to access the service desk.
            </p>

            {error && (
              <div style={styles.errorBox}>
                {error}
              </div>
            )}

            <button
              onClick={handleSSOLogin}
              disabled={loading}
              style={{
                ...styles.ssoButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {/* Microsoft logo */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 21 21"
                style={{ marginRight: 12 }}
              >
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              {loading ? 'Signing in...' : 'Sign in with Microsoft'}
            </button>
          </div>

          <div style={styles.cardFooter}>
            <p style={styles.footerText}>
              Powered by <strong>Prompt & Pause</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerLink}>
            Need help? Contact{' '}
            <a href="mailto:support@promptandpause.com" style={styles.link}>
              support@promptandpause.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    zIndex: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
  },
  logoContainer: {
    marginBottom: '2rem',
  },
  logo: {
    height: '60px',
    width: 'auto',
    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '2rem 2rem 1rem',
    textAlign: 'center',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
    letterSpacing: '-0.025em',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0.5rem 0 0',
  },
  cardBody: {
    padding: '2rem',
  },
  description: {
    fontSize: '0.9375rem',
    color: '#4b5563',
    textAlign: 'center',
    margin: '0 0 1.5rem',
    lineHeight: 1.6,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    color: '#dc2626',
    fontSize: '0.875rem',
  },
  ssoButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.875rem 1.5rem',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
  },
  cardFooter: {
    padding: '1rem 2rem',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    margin: 0,
  },
  footer: {
    marginTop: '2rem',
  },
  footerLink: {
    fontSize: '0.875rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: 0,
  },
  link: {
    color: '#60a5fa',
    textDecoration: 'none',
  },
};
