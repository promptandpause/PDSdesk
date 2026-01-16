import { Badge } from './Badge';

type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
type Priority = 'critical' | 'high' | 'medium' | 'low';

const statusConfig: Record<TicketStatus, { variant: 'danger' | 'warning' | 'purple' | 'success' | 'neutral'; label: string }> = {
  open: { variant: 'danger', label: 'Open' },
  in_progress: { variant: 'warning', label: 'In Progress' },
  pending: { variant: 'purple', label: 'Pending' },
  resolved: { variant: 'success', label: 'Resolved' },
  closed: { variant: 'neutral', label: 'Closed' },
};

const priorityConfig: Record<Priority, { variant: 'danger' | 'warning' | 'info' | 'success'; label: string }> = {
  critical: { variant: 'danger', label: 'Critical' },
  high: { variant: 'warning', label: 'High' },
  medium: { variant: 'info', label: 'Medium' },
  low: { variant: 'success', label: 'Low' },
};

interface StatusBadgeProps {
  status: string;
  showDot?: boolean;
}

interface PriorityBadgeProps {
  priority: string;
}

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status as TicketStatus] ?? { variant: 'neutral' as const, label: status };
  return (
    <Badge variant={config.variant} dot={showDot}>
      {config.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority as Priority] ?? { variant: 'neutral' as const, label: priority };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
