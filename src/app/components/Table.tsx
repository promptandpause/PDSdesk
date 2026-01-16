import { ReactNode, CSSProperties } from 'react';

interface TableProps {
  children: ReactNode;
  style?: CSSProperties;
}

interface TableHeadProps {
  children: ReactNode;
}

interface TableBodyProps {
  children: ReactNode;
}

interface TableRowProps {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  hoverable?: boolean;
}

interface TableCellProps {
  children: ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  mono?: boolean;
  muted?: boolean;
}

interface TableHeaderCellProps {
  children: ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export function Table({ children, style }: TableProps) {
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 'var(--itsm-text-sm)',
        ...style,
      }}
    >
      {children}
    </table>
  );
}

export function TableHead({ children }: TableHeadProps) {
  return (
    <thead
      style={{
        backgroundColor: 'var(--itsm-surface-sunken)',
        borderBottom: '1px solid var(--itsm-border-subtle)',
      }}
    >
      {children}
    </thead>
  );
}

export function TableBody({ children }: TableBodyProps) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, onClick, selected = false, hoverable = true }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: '1px solid var(--itsm-border-subtle)',
        backgroundColor: selected ? 'var(--itsm-primary-50)' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color var(--itsm-transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (hoverable && !selected) {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--itsm-surface-raised)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable && !selected) {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, width, align = 'left', mono = false, muted = false }: TableCellProps) {
  return (
    <td
      style={{
        padding: 'var(--itsm-space-3) var(--itsm-space-4)',
        width,
        textAlign: align,
        fontFamily: mono ? 'var(--itsm-font-mono)' : 'inherit',
        color: muted ? 'var(--itsm-text-tertiary)' : 'var(--itsm-text-primary)',
        verticalAlign: 'middle',
      }}
    >
      {children}
    </td>
  );
}

export function TableHeaderCell({
  children,
  width,
  align = 'left',
  sortable = false,
  sorted = null,
  onSort,
}: TableHeaderCellProps) {
  return (
    <th
      onClick={sortable ? onSort : undefined}
      style={{
        padding: 'var(--itsm-space-2) var(--itsm-space-4)',
        width,
        textAlign: align,
        fontSize: 'var(--itsm-text-xs)',
        fontWeight: 'var(--itsm-weight-medium)' as any,
        color: 'var(--itsm-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: 'var(--itsm-tracking-wider)',
        cursor: sortable ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        {sortable && sorted && (
          <span style={{ fontSize: 10 }}>{sorted === 'asc' ? '▲' : '▼'}</span>
        )}
      </span>
    </th>
  );
}
