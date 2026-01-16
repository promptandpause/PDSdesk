import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

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
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <TopBar />
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
    </div>
  );
}
