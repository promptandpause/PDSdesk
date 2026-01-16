import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      <Sidebar />
      <main
        className="itsm-scrollbar"
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--itsm-surface-sunken)',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
