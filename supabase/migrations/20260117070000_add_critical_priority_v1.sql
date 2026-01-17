-- Add 'critical' to ticket_priority enum
ALTER TYPE public.ticket_priority ADD VALUE IF NOT EXISTS 'critical';
