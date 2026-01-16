import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Star,
  RotateCw,
  ArrowLeft,
  ChevronDown,
  Copy,
  Plus,
  Save,
  MoreHorizontal,
  User as UserIcon,
  Upload,
  X,
  File,
  Image as ImageIcon,
  Paperclip,
  BookOpen,
  Search,
  MessageSquare,
  Edit2,
  Trash2,
  ArrowUpRight,
  Users,
} from "lucide-react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface TicketDetailViewProps {
  ticketId?: string;
  isNewTicket?: boolean;
  onBack?: () => void;
  initialNotice?: string;
  onCreated?: (ticketId: string) => void;
  newTicketDefaults?: {
    ticket_type?: string;
    channel?: string;
    mailbox?: string;
    category?: string;
    priority?: string;
    assignment_group_id?: string;
  };
}

// TODO: Fetch ticket data from Supabase
export function TicketDetailView({
  ticketId,
  isNewTicket = false,
  onBack,
  initialNotice,
  onCreated,
  newTicketDefaults,
}: TicketDetailViewProps) {
  const { user, roles, operatorGroups: operatorGroupKeys } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const canWorkTickets =
    roles.includes("global_admin") ||
    roles.includes("service_desk_admin") ||
    roles.includes("operator") ||
    operatorGroupKeys.includes("it_services") ||
    operatorGroupKeys.includes("customer_service");

  const [activeTab, setActiveTab] = useState("general");

  type TicketDetail = {
    id: string;
    ticket_number: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    category: string;
    due_at: string;
    external_number: string | null;
    assignment_group_id: string | null;
    assignee_id: string | null;
    ticket_type: string;
    channel: string;
    mailbox: string | null;
    requester_name: string | null;
    requester_email: string | null;
    requester?: { full_name: string | null; email: string | null } | null;
    assignee?: { full_name: string | null; email: string | null } | null;
  };

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editStatus, setEditStatus] = useState("new");
  const [editCategory, setEditCategory] = useState("General");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDueTime, setEditDueTime] = useState("");
  const [editAssignmentGroupId, setEditAssignmentGroupId] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editExternalNumber, setEditExternalNumber] = useState("");
  const [durationPreset, setDurationPreset] = useState("");

  type OperatorGroupRow = {
    id: string;
    name: string;
    group_key: string;
  };

  type OperatorMemberRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };

  const [operatorGroups, setOperatorGroups] = useState<OperatorGroupRow[]>([]);
  const [operatorGroupsLoading, setOperatorGroupsLoading] = useState(false);
  const [operatorGroupsError, setOperatorGroupsError] = useState<string | null>(null);

  const [operatorMembers, setOperatorMembers] = useState<OperatorMemberRow[]>([]);
  const [operatorMembersLoading, setOperatorMembersLoading] = useState(false);
  const [operatorMembersError, setOperatorMembersError] = useState<string | null>(null);

  const isDraft = Boolean(isNewTicket && !ticket);
  const effectiveTicketId = ticket?.id ?? (isNewTicket ? null : ticketId ?? null);

  const didInitDraftRef = useRef(false);
  useEffect(() => {
    if (!isDraft) {
      didInitDraftRef.current = false;
      return;
    }
    if (didInitDraftRef.current) return;
    didInitDraftRef.current = true;

    if (newTicketDefaults?.category) setEditCategory(newTicketDefaults.category);
    if (newTicketDefaults?.priority) setEditPriority(newTicketDefaults.priority);
    if (newTicketDefaults?.assignment_group_id) setEditAssignmentGroupId(newTicketDefaults.assignment_group_id);
  }, [isDraft, newTicketDefaults?.assignment_group_id, newTicketDefaults?.category, newTicketDefaults?.priority]);

  const [isFavorite, setIsFavorite] = useState(false);

  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateGroupId, setEscalateGroupId] = useState<string>("");
  const [escalateNote, setEscalateNote] = useState("");
  const [escalateAssigneeId, setEscalateAssigneeId] = useState<string>("__keep__");
  const [escalateMakeUrgent, setEscalateMakeUrgent] = useState(true);
  const [escalateAddInternalNote, setEscalateAddInternalNote] = useState(true);
  const [escalateNotifyAssignee, setEscalateNotifyAssignee] = useState(true);
  const [escalateNotifyGroup, setEscalateNotifyGroup] = useState(false);
  const [escalateSubmitting, setEscalateSubmitting] = useState(false);
  const [escalateError, setEscalateError] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);

  useEffect(() => {
    if (!effectiveTicketId) {
      setIsFavorite(false);
      return;
    }

    try {
      const raw = localStorage.getItem("pdsdesk.ticket_favorites");
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      const ids = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
      setIsFavorite(ids.includes(effectiveTicketId));
    } catch {
      setIsFavorite(false);
    }
  }, [effectiveTicketId]);

  useEffect(() => {
    if (!escalateOpen) return;
    setEscalateError(null);
    setEscalateSubmitting(false);
    setEscalateGroupId(editAssignmentGroupId || "");
    setEscalateNote("");
    setEscalateAssigneeId("__keep__");
    setEscalateMakeUrgent(true);
    setEscalateAddInternalNote(true);
    setEscalateNotifyAssignee(true);
    setEscalateNotifyGroup(false);
  }, [editAssignmentGroupId, escalateOpen]);

  const [escalateMembers, setEscalateMembers] = useState<OperatorMemberRow[]>([]);
  const [escalateMembersLoading, setEscalateMembersLoading] = useState(false);
  const [escalateMembersError, setEscalateMembersError] = useState<string | null>(null);

  useEffect(() => {
    setNotice(initialNotice ?? null);
  }, [initialNotice]);

  const toLocalDateInputValue = (date: Date) => {
    const y = String(date.getFullYear());
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const toLocalTimeInputValue = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const buildDueAt = (dateValue: string, timeValue: string) => {
    const date = dateValue.trim();
    if (!date) return null;
    const time = (timeValue || "00:00").trim();
    const dt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  };

  const applyDurationPreset = (preset: string) => {
    setDurationPreset(preset);
    const minutes = Number(preset);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const due = new Date(Date.now() + minutes * 60 * 1000);
    setEditDueDate(toLocalDateInputValue(due));
    setEditDueTime(toLocalTimeInputValue(due));
  };

  const loadOperatorGroups = useCallback(async () => {
    if (!user) return;
    setOperatorGroupsError(null);
    setOperatorGroupsLoading(true);

    const res = await supabase
      .from("operator_groups")
      .select("id,name,group_key")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (res.error) {
      setOperatorGroups([]);
      setOperatorGroupsError(res.error.message);
      setOperatorGroupsLoading(false);
      return;
    }

    setOperatorGroups((res.data ?? []) as OperatorGroupRow[]);
    setOperatorGroupsLoading(false);
  }, [supabase, user]);

  const loadOperatorMembers = useCallback(
    async (groupId: string) => {
      if (!user) return;

      const gid = groupId.trim();
      if (!gid) {
        setOperatorMembers([]);
        setOperatorMembersError(null);
        return;
      }

      setOperatorMembersError(null);
      setOperatorMembersLoading(true);

      const res = await supabase.rpc("list_operator_group_members", {
        group_id: gid,
      });

      if (res.error) {
        setOperatorMembers([]);
        setOperatorMembersError(res.error.message);
        setOperatorMembersLoading(false);
        return;
      }

      setOperatorMembers((res.data ?? []) as OperatorMemberRow[]);
      setOperatorMembersLoading(false);
    },
    [supabase, user],
  );

  const loadEscalateMembers = useCallback(
    async (groupId: string) => {
      if (!user) return;

      const gid = groupId.trim();
      if (!gid) {
        setEscalateMembers([]);
        setEscalateMembersError(null);
        return;
      }

      setEscalateMembersError(null);
      setEscalateMembersLoading(true);

      const res = await supabase.rpc("list_operator_group_members", {
        group_id: gid,
      });

      if (res.error) {
        setEscalateMembers([]);
        setEscalateMembersError(res.error.message);
        setEscalateMembersLoading(false);
        return;
      }

      setEscalateMembers((res.data ?? []) as OperatorMemberRow[]);
      setEscalateMembersLoading(false);
    },
    [supabase, user],
  );

  const loadTicket = useCallback(async () => {
    if (!user) return;
    if (isDraft) {
      setTicket(null);
      setTicketLoading(false);
      return;
    }
    if (!ticketId) {
      setTicket(null);
      setTicketError("Missing ticket id");
      return;
    }

    setTicketError(null);
    setTicketLoading(true);

    const res = await supabase
      .from("tickets")
      .select(
        "id,ticket_number,title,description,status,priority,category,due_at,external_number,assignment_group_id,assignee_id,ticket_type,channel,mailbox,requester_name,requester_email,requester:requester_id(full_name,email),assignee:assignee_id(full_name,email)",
      )
      .eq("id", ticketId)
      .maybeSingle();

    if (res.error) {
      setTicket(null);
      setTicketError(res.error.message);
      setTicketLoading(false);
      return;
    }

    const row = res.data as any;
    const requester = Array.isArray(row?.requester) ? (row.requester[0] ?? null) : (row?.requester ?? null);
    const assignee = Array.isArray(row?.assignee) ? (row.assignee[0] ?? null) : (row?.assignee ?? null);
    const normalized: TicketDetail = {
      id: row.id,
      ticket_number: row.ticket_number,
      title: row.title,
      description: row.description ?? null,
      status: row.status,
      priority: row.priority,
      category: row.category,
      due_at: row.due_at,
      external_number: row.external_number ?? null,
      assignment_group_id: row.assignment_group_id ?? null,
      assignee_id: row.assignee_id ?? null,
      ticket_type: row.ticket_type,
      channel: row.channel,
      mailbox: row.mailbox ?? null,
      requester_name: row.requester_name ?? null,
      requester_email: row.requester_email ?? null,
      requester,
      assignee,
    };

    if (normalized) {
      setTicket(normalized);
      setEditTitle(normalized.title ?? "");
      setEditDescription(normalized.description ?? "");
      setEditPriority(normalized.priority ?? "medium");
      setEditStatus(normalized.status ?? "new");
      setEditCategory(normalized.category ?? "General");
      setEditAssignmentGroupId(normalized.assignment_group_id ?? "");
      setEditAssigneeId(normalized.assignee_id ?? "");
      setEditExternalNumber(normalized.external_number ?? "");
      if (normalized.due_at) {
        const due = new Date(normalized.due_at);
        setEditDueDate(toLocalDateInputValue(due));
        setEditDueTime(toLocalTimeInputValue(due));
      }

      if (canWorkTickets && normalized.id && normalized.status === "new") {
        const opened = await supabase.rpc("ticket_mark_opened", {
          p_ticket_id: normalized.id,
        });
        if (!opened.error && opened.data) {
          setTicket((prev) => (prev ? { ...prev, status: "open" } : prev));
          setEditStatus("open");
        }
      }
    }
    setTicketLoading(false);
  }, [canWorkTickets, isNewTicket, supabase, ticketId, user]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    void loadOperatorGroups();
  }, [loadOperatorGroups]);

  useEffect(() => {
    void loadOperatorMembers(editAssignmentGroupId);
  }, [editAssignmentGroupId, loadOperatorMembers]);

  useEffect(() => {
    if (!escalateOpen) return;
    void loadEscalateMembers(escalateGroupId);
  }, [escalateGroupId, escalateOpen, loadEscalateMembers]);

  useEffect(() => {
    const handler = () => {
      void loadTicket();
      void loadAttachments();
    };

    window.addEventListener("pdsdesk:refresh", handler as EventListener);
    return () => {
      window.removeEventListener("pdsdesk:refresh", handler as EventListener);
    };
  }, [loadTicket]);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!user) return;
    const prevTicket = ticket;
    const title = editTitle.trim();
    if (!title) {
      setSaveError("Title is required");
      return;
    }
    if (title.length > 180) {
      setSaveError("Title must be 180 characters or less");
      return;
    }

    setSaveError(null);
    setSaveLoading(true);

    const dueAt = buildDueAt(editDueDate, editDueTime);

    const changes: Array<{ field: string; from: unknown; to: unknown }> = [];
    const pushChange = (field: string, from: unknown, to: unknown) => {
      if ((from ?? null) === (to ?? null)) return;
      changes.push({ field, from, to });
    };

    if (prevTicket) {
      pushChange("title", prevTicket.title ?? null, title);
      pushChange("description", prevTicket.description ?? null, editDescription.trim() || null);
      pushChange("priority", prevTicket.priority ?? null, editPriority);
      pushChange("status", prevTicket.status ?? null, editStatus);
      pushChange("category", prevTicket.category ?? null, editCategory || "General");
      pushChange("external_number", prevTicket.external_number ?? null, editExternalNumber.trim() || null);
      pushChange("assignment_group_id", prevTicket.assignment_group_id ?? null, editAssignmentGroupId || null);
      pushChange("assignee_id", prevTicket.assignee_id ?? null, editAssigneeId || null);
      if (dueAt) {
        pushChange("due_at", prevTicket.due_at ?? null, dueAt);
      }
    }

    if (isDraft) {
      const inserted = await supabase
        .from("tickets")
        .insert({
          title,
          description: editDescription.trim() || null,
          priority: editPriority as any,
          status: editStatus as any,
          category: editCategory || "General",
          external_number: editExternalNumber.trim() || null,
          ...(dueAt ? { due_at: dueAt } : {}),
          assignment_group_id: (editAssignmentGroupId || newTicketDefaults?.assignment_group_id || null) as any,
          assignee_id: editAssigneeId || null,
          requester_id: user.id,
          created_by: user.id,
          ticket_type: (newTicketDefaults?.ticket_type ?? "itsm_incident") as any,
          channel: (newTicketDefaults?.channel ?? "manual") as any,
          mailbox: (newTicketDefaults?.mailbox ?? null) as any,
        })
        .select(
          "id,ticket_number,title,description,status,priority,category,due_at,external_number,assignment_group_id,assignee_id,ticket_type,channel,mailbox,requester_name,requester_email,requester:requester_id(full_name,email),assignee:assignee_id(full_name,email)",
        )
        .single();

      if (inserted.error) {
        setSaveError(inserted.error.message);
        setSaveLoading(false);
        return;
      }

      const row = inserted.data as any;
      const requester = Array.isArray(row?.requester) ? (row.requester[0] ?? null) : (row?.requester ?? null);
      const assignee = Array.isArray(row?.assignee) ? (row.assignee[0] ?? null) : (row?.assignee ?? null);
      setTicket({
        id: row.id,
        ticket_number: row.ticket_number,
        title: row.title,
        description: row.description ?? null,
        status: row.status,
        priority: row.priority,
        category: row.category,
        due_at: row.due_at,
        external_number: row.external_number ?? null,
        assignment_group_id: row.assignment_group_id ?? null,
        assignee_id: row.assignee_id ?? null,
        ticket_type: row.ticket_type,
        channel: row.channel,
        mailbox: row.mailbox ?? null,
        requester_name: row.requester_name ?? null,
        requester_email: row.requester_email ?? null,
        requester,
        assignee,
      });

      // Best-effort audit event (will be allowed for operators; ignored otherwise)
      await supabase
        .from("ticket_events")
        .insert({
          ticket_id: row.id,
          actor_id: user.id,
          event_type: "ticket_created",
          payload: {
            title: row.title,
          },
        });

      onCreated?.(row.id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pdsdesk:refresh"));
      }

      setSaveLoading(false);
      return;
    }

    if (!ticketId) {
      setSaveError("Missing ticket id");
      setSaveLoading(false);
      return;
    }

    const updated = await supabase
      .from("tickets")
      .update({
        title,
        description: editDescription.trim() || null,
        priority: editPriority as any,
        status: editStatus as any,
        category: editCategory || "General",
        external_number: editExternalNumber.trim() || null,
        ...(dueAt ? { due_at: dueAt } : {}),
        assignment_group_id: editAssignmentGroupId || null,
        assignee_id: editAssigneeId || null,
      })
      .eq("id", ticketId)
      .select(
        "id,ticket_number,title,description,status,priority,category,due_at,external_number,assignment_group_id,assignee_id,ticket_type,channel,mailbox,requester_name,requester_email,requester:requester_id(full_name,email),assignee:assignee_id(full_name,email)",
      )
      .maybeSingle();

    if (updated.error) {
      setSaveError(updated.error.message);
      setSaveLoading(false);
      return;
    }

    if (updated.data) {
      const row = updated.data as any;
      const requester = Array.isArray(row?.requester) ? (row.requester[0] ?? null) : (row?.requester ?? null);
      const assignee = Array.isArray(row?.assignee) ? (row.assignee[0] ?? null) : (row?.assignee ?? null);
      setTicket({
        id: row.id,
        ticket_number: row.ticket_number,
        title: row.title,
        description: row.description ?? null,
        status: row.status,
        priority: row.priority,
        category: row.category,
        due_at: row.due_at,
        external_number: row.external_number ?? null,
        assignment_group_id: row.assignment_group_id ?? null,
        assignee_id: row.assignee_id ?? null,
        ticket_type: row.ticket_type,
        channel: row.channel,
        mailbox: row.mailbox ?? null,
        requester_name: row.requester_name ?? null,
        requester_email: row.requester_email ?? null,
        requester,
        assignee,
      });

      setEditStatus(row.status);

      // Best-effort audit event
      if (changes.length > 0) {
        await supabase
          .from("ticket_events")
          .insert({
            ticket_id: row.id,
            actor_id: user.id,
            event_type: "ticket_updated",
            payload: {
              changes,
            },
          });
      }
    }

    setSaveLoading(false);
  }, [editAssigneeId, editAssignmentGroupId, editCategory, editDescription, editDueDate, editDueTime, editExternalNumber, editPriority, editStatus, editTitle, isDraft, newTicketDefaults?.assignment_group_id, newTicketDefaults?.channel, newTicketDefaults?.mailbox, newTicketDefaults?.ticket_type, onCreated, supabase, ticket, ticketId, user]);

  const copyText = async (text: string) => {
    const value = text.trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // ignore
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    } catch {
      // ignore
    }
  };

  type TicketTimeEntryRow = {
    id: string;
    minutes: number;
    note: string | null;
    created_at: string;
    user?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
  };

  const [timeEntries, setTimeEntries] = useState<TicketTimeEntryRow[]>([]);
  const [timeEntriesLoading, setTimeEntriesLoading] = useState(false);
  const [timeEntriesError, setTimeEntriesError] = useState<string | null>(null);

  const totalTimeMinutes = useMemo(() => {
    return timeEntries.reduce((acc, e) => acc + (e.minutes ?? 0), 0);
  }, [timeEntries]);

  const totalTimeHours = Math.floor(totalTimeMinutes / 60);
  const totalTimeRemainderMinutes = totalTimeMinutes % 60;

  const loadTimeEntries = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId && !isDraft) {
      setTimeEntries([]);
      setTimeEntriesError(null);
      return;
    }

    setTimeEntriesError(null);
    setTimeEntriesLoading(true);

    const res = await supabase
      .from("ticket_time_entries")
      .select("id,minutes,note,created_at,user:user_id(full_name,email,avatar_url)")
      .eq("ticket_id", effectiveTicketId)
      .order("created_at", { ascending: false });

    if (res.error) {
      setTimeEntries([]);
      setTimeEntriesError(res.error.message);
      setTimeEntriesLoading(false);
      return;
    }

    const normalized = (res.data ?? []).map((row: any) => {
      const u = Array.isArray(row.user) ? (row.user[0] ?? null) : (row.user ?? null);
      return {
        ...row,
        user: u,
      };
    });

    setTimeEntries(normalized as unknown as TicketTimeEntryRow[]);
    setTimeEntriesLoading(false);
  }, [effectiveTicketId, isDraft, supabase, user]);

  useEffect(() => {
    void loadTimeEntries();
  }, [loadTimeEntries]);

  const [newTimeMinutes, setNewTimeMinutes] = useState("");
  const [newTimeNote, setNewTimeNote] = useState("");
  const [addTimeLoading, setAddTimeLoading] = useState(false);
  const [addTimeError, setAddTimeError] = useState<string | null>(null);

  const handleAddTimeEntry = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setAddTimeError("Save the ticket before logging time.");
      return;
    }

    const minutes = Number(newTimeMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setAddTimeError("Enter minutes greater than 0");
      return;
    }

    setAddTimeError(null);
    setAddTimeLoading(true);

    const res = await supabase
      .from("ticket_time_entries")
      .insert({
        ticket_id: effectiveTicketId,
        user_id: user.id,
        minutes,
        note: newTimeNote.trim() || null,
      });

    if (res.error) {
      setAddTimeError(res.error.message);
      setAddTimeLoading(false);
      return;
    }

    setNewTimeMinutes("");
    setNewTimeNote("");
    await loadTimeEntries();
    setAddTimeLoading(false);
  }, [effectiveTicketId, loadTimeEntries, newTimeMinutes, newTimeNote, supabase, user]);

  type TicketLinkRow = {
    id: string;
    from_ticket_id: string;
    to_ticket_id: string;
    link_type: string;
    created_at: string;
    created_by: string;
    from_ticket?: { id: string; ticket_number: string; title: string } | null;
    to_ticket?: { id: string; ticket_number: string; title: string } | null;
  };

  const [links, setLinks] = useState<TicketLinkRow[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);

  const [newLinkTarget, setNewLinkTarget] = useState("");
  const [newLinkType, setNewLinkType] = useState("relates_to");
  const [addLinkLoading, setAddLinkLoading] = useState(false);
  const [addLinkError, setAddLinkError] = useState<string | null>(null);
  const [deleteLinkBusyId, setDeleteLinkBusyId] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setLinks([]);
      setLinksError(null);
      return;
    }

    setLinksError(null);
    setLinksLoading(true);

    const res = await supabase
      .from("ticket_links")
      .select(
        "id,from_ticket_id,to_ticket_id,link_type,created_by,created_at,from_ticket:from_ticket_id(id,ticket_number,title),to_ticket:to_ticket_id(id,ticket_number,title)",
      )
      .or(`from_ticket_id.eq.${effectiveTicketId},to_ticket_id.eq.${effectiveTicketId}`)
      .order("created_at", { ascending: false });

    if (res.error) {
      setLinks([]);
      setLinksError(res.error.message);
      setLinksLoading(false);
      return;
    }

    const normalized = (res.data ?? []).map((row: any) => {
      const from_ticket = Array.isArray(row.from_ticket) ? (row.from_ticket[0] ?? null) : (row.from_ticket ?? null);
      const to_ticket = Array.isArray(row.to_ticket) ? (row.to_ticket[0] ?? null) : (row.to_ticket ?? null);
      return {
        ...row,
        from_ticket,
        to_ticket,
      };
    });

    setLinks(normalized as unknown as TicketLinkRow[]);
    setLinksLoading(false);
  }, [effectiveTicketId, supabase, user]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const resolveTicketIdFromInput = useCallback(
    async (input: string) => {
      const raw = input.trim();
      if (!raw) return { id: null as string | null, error: "Enter a ticket number or id" };

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(raw)) return { id: raw, error: null as string | null };

      const byNumber = await supabase
        .from("tickets")
        .select("id")
        .eq("ticket_number", raw)
        .maybeSingle();

      if (byNumber.error) return { id: null as string | null, error: byNumber.error.message };
      if (!byNumber.data?.id) return { id: null as string | null, error: "Ticket not found" };
      return { id: byNumber.data.id as string, error: null as string | null };
    },
    [supabase],
  );

  const handleAddLink = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setAddLinkError("Save the ticket before adding links.");
      return;
    }

    setAddLinkError(null);
    setAddLinkLoading(true);

    const resolved = await resolveTicketIdFromInput(newLinkTarget);
    if (!resolved.id) {
      setAddLinkError(resolved.error ?? "Invalid target");
      setAddLinkLoading(false);
      return;
    }

    if (resolved.id === effectiveTicketId) {
      setAddLinkError("You can’t link a ticket to itself");
      setAddLinkLoading(false);
      return;
    }

    const res = await supabase
      .from("ticket_links")
      .insert({
        from_ticket_id: effectiveTicketId,
        to_ticket_id: resolved.id,
        link_type: newLinkType,
        created_by: user.id,
      });

    if (res.error) {
      setAddLinkError(res.error.message);
      setAddLinkLoading(false);
      return;
    }

    setNewLinkTarget("");
    await loadLinks();
    setAddLinkLoading(false);
  }, [effectiveTicketId, loadLinks, newLinkTarget, newLinkType, resolveTicketIdFromInput, supabase, user]);

  const handleDeleteLink = useCallback(
    async (id: string) => {
      if (!user) return;
      setDeleteLinkBusyId(id);

      const res = await supabase
        .from("ticket_links")
        .delete()
        .eq("id", id);

      if (res.error) {
        setLinksError(res.error.message);
        setDeleteLinkBusyId(null);
        return;
      }

      await loadLinks();
      setDeleteLinkBusyId(null);
    },
    [loadLinks, supabase, user],
  );

  type ProcedureArticleRow = {
    id: string;
    slug: string;
    title: string;
    tags: string[];
    updated_at: string;
  };

  const [procedureLinkedArticles, setProcedureLinkedArticles] = useState<ProcedureArticleRow[]>([]);
  const [procedureLinkedLoading, setProcedureLinkedLoading] = useState(false);
  const [procedureLinkedError, setProcedureLinkedError] = useState<string | null>(null);
  const [procedureSearchQuery, setProcedureSearchQuery] = useState("");
  const [procedureSearchResults, setProcedureSearchResults] = useState<ProcedureArticleRow[]>([]);
  const [procedureSearchLoading, setProcedureSearchLoading] = useState(false);
  const [procedureSearchError, setProcedureSearchError] = useState<string | null>(null);
  const [procedureBusyId, setProcedureBusyId] = useState<string | null>(null);

  const loadProcedureLinked = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setProcedureLinkedArticles([]);
      setProcedureLinkedError(null);
      return;
    }

    setProcedureLinkedError(null);
    setProcedureLinkedLoading(true);

    const res = await supabase
      .from("ticket_knowledge_articles")
      .select("article:article_id(id,slug,title,tags,updated_at)")
      .eq("ticket_id", effectiveTicketId)
      .order("created_at", { ascending: false });

    if (res.error) {
      setProcedureLinkedArticles([]);
      setProcedureLinkedError(res.error.message);
      setProcedureLinkedLoading(false);
      return;
    }

    const normalized = (res.data ?? [])
      .map((row: any) => {
        const article = Array.isArray(row.article) ? (row.article[0] ?? null) : (row.article ?? null);
        return article;
      })
      .filter(Boolean);

    setProcedureLinkedArticles(normalized as unknown as ProcedureArticleRow[]);
    setProcedureLinkedLoading(false);
  }, [effectiveTicketId, supabase, user]);

  const loadProcedureSearch = useCallback(
    async (query: string) => {
      if (!user) return;

      const term = query.trim();
      if (!term) {
        setProcedureSearchResults([]);
        setProcedureSearchError(null);
        return;
      }

      setProcedureSearchError(null);
      setProcedureSearchLoading(true);

      const safe = term.replace(/%/g, "\\%").replace(/_/g, "\\_");
      const res = await supabase
        .from("knowledge_articles")
        .select("id,slug,title,tags,updated_at")
        .or(`title.ilike.%${safe}%,body.ilike.%${safe}%`)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (res.error) {
        setProcedureSearchResults([]);
        setProcedureSearchError(res.error.message);
        setProcedureSearchLoading(false);
        return;
      }

      setProcedureSearchResults((res.data ?? []) as ProcedureArticleRow[]);
      setProcedureSearchLoading(false);
    },
    [supabase, user],
  );

  useEffect(() => {
    void loadProcedureLinked();
  }, [loadProcedureLinked]);

  useEffect(() => {
    if (activeTab !== "procedure") return;

    const timer = window.setTimeout(() => {
      void loadProcedureSearch(procedureSearchQuery);
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeTab, loadProcedureSearch, procedureSearchQuery]);

  const handleLinkProcedureArticle = useCallback(
    async (articleId: string) => {
      if (!user) return;
      if (!effectiveTicketId) return;

      setProcedureBusyId(articleId);
      setProcedureLinkedError(null);

      const res = await supabase
        .from("ticket_knowledge_articles")
        .insert({
          ticket_id: effectiveTicketId,
          article_id: articleId,
        });

      if (res.error) {
        setProcedureLinkedError(res.error.message);
        setProcedureBusyId(null);
        return;
      }

      await loadProcedureLinked();
      setProcedureBusyId(null);
    },
    [effectiveTicketId, loadProcedureLinked, supabase, user],
  );

  type SatisfactionRow = {
    id: string;
    ticket_id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    updated_at: string;
    user?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
  };

  const [satisfactionRows, setSatisfactionRows] = useState<SatisfactionRow[]>([]);
  const [satisfactionLoading, setSatisfactionLoading] = useState(false);
  const [satisfactionError, setSatisfactionError] = useState<string | null>(null);

  const [myRating, setMyRating] = useState<number>(0);
  const [myComment, setMyComment] = useState("");
  const [satisfactionSaving, setSatisfactionSaving] = useState(false);
  const [satisfactionSaveError, setSatisfactionSaveError] = useState<string | null>(null);

  const avgSatisfaction = useMemo(() => {
    if (satisfactionRows.length === 0) return null;
    const sum = satisfactionRows.reduce((acc, r) => acc + (r.rating ?? 0), 0);
    return sum / satisfactionRows.length;
  }, [satisfactionRows]);

  const loadSatisfaction = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setSatisfactionRows([]);
      setSatisfactionError(null);
      setMyRating(0);
      setMyComment("");
      return;
    }

    setSatisfactionError(null);
    setSatisfactionLoading(true);

    const res = await supabase
      .from("ticket_customer_satisfaction")
      .select("id,ticket_id,user_id,rating,comment,created_at,updated_at,user:user_id(full_name,email,avatar_url)")
      .eq("ticket_id", effectiveTicketId)
      .order("updated_at", { ascending: false });

    if (res.error) {
      setSatisfactionError(res.error.message);
      setSatisfactionLoading(false);
      return;
    }

    const normalized = (res.data ?? []).map((row: any) => {
      const u = Array.isArray(row.user) ? (row.user[0] ?? null) : (row.user ?? null);
      return {
        ...row,
        user: u,
      };
    });

    setSatisfactionRows(normalized as unknown as SatisfactionRow[]);

    const mine = normalized.find((r: any) => r.user_id === user.id);
    setMyRating(mine?.rating ?? 0);
    setMyComment(mine?.comment ?? "");

    setSatisfactionLoading(false);
  }, [effectiveTicketId, supabase, user]);

  useEffect(() => {
    void loadSatisfaction();
  }, [loadSatisfaction]);

  const handleSaveSatisfaction = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) return;
    if (!Number.isFinite(myRating) || myRating < 1 || myRating > 5) {
      setSatisfactionSaveError("Select a rating between 1 and 5");
      return;
    }

    setSatisfactionSaveError(null);
    setSatisfactionSaving(true);

    const res = await supabase
      .from("ticket_customer_satisfaction")
      .upsert(
        {
          ticket_id: effectiveTicketId,
          user_id: user.id,
          rating: myRating,
          comment: myComment.trim() || null,
        },
        { onConflict: "ticket_id,user_id" },
      );

    if (res.error) {
      setSatisfactionSaveError(res.error.message);
      setSatisfactionSaving(false);
      return;
    }

    await loadSatisfaction();
    setSatisfactionSaving(false);
  }, [effectiveTicketId, loadSatisfaction, myComment, myRating, supabase, user]);

  type TicketSlaRow = {
    ticket_id: string;
    sla_policy_id: string | null;
    first_response_due_at: string | null;
    resolution_due_at: string | null;
    first_response_at: string | null;
    resolved_at: string | null;
    first_response_breached?: boolean;
    first_response_breached_at?: string | null;
    resolution_breached?: boolean;
    resolution_breached_at?: string | null;
    updated_at: string;
    sla_policy?: { id: string; policy_key: string; name: string } | null;
  };

  type TicketSlaEventRow = {
    id: string;
    event_type: string;
    payload: Record<string, unknown>;
    created_at: string;
  };

  const [ticketSla, setTicketSla] = useState<TicketSlaRow | null>(null);
  const [slaEvents, setSlaEvents] = useState<TicketSlaEventRow[]>([]);
  const [slaLoading, setSlaLoading] = useState(false);
  const [slaError, setSlaError] = useState<string | null>(null);
  const [slaBusy, setSlaBusy] = useState(false);

  const loadSla = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setTicketSla(null);
      setSlaError(null);
      return;
    }

    setSlaError(null);
    setSlaLoading(true);

    const res = await supabase
      .from("ticket_slas")
      .select(
        "ticket_id,sla_policy_id,first_response_due_at,resolution_due_at,first_response_at,resolved_at,first_response_breached,first_response_breached_at,resolution_breached,resolution_breached_at,updated_at,sla_policy:sla_policy_id(id,policy_key,name)",
      )
      .eq("ticket_id", effectiveTicketId)
      .maybeSingle();

    if (res.error) {
      setTicketSla(null);
      setSlaError(res.error.message);
      setSlaLoading(false);
      return;
    }

    if (!res.data) {
      setTicketSla(null);
      setSlaLoading(false);
      return;
    }

    const row: any = res.data;
    const policy = Array.isArray(row.sla_policy) ? (row.sla_policy[0] ?? null) : (row.sla_policy ?? null);
    setTicketSla({
      ...row,
      sla_policy: policy,
    } as TicketSlaRow);
    setSlaLoading(false);
  }, [effectiveTicketId, supabase, user]);

  const loadSlaEvents = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setSlaEvents([]);
      return;
    }

    const res = await supabase
      .from("ticket_sla_events")
      .select("id,event_type,payload,created_at")
      .eq("ticket_id", effectiveTicketId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (res.error) {
      return;
    }

    setSlaEvents((res.data ?? []) as TicketSlaEventRow[]);
  }, [effectiveTicketId, supabase, user]);

  useEffect(() => {
    void loadSla();
    void loadSlaEvents();
  }, [loadSla, loadSlaEvents]);

  const formatCountdown = (iso: string | null) => {
    if (!iso) return null;
    const due = new Date(iso);
    if (Number.isNaN(due.getTime())) return null;
    const ms = due.getTime() - Date.now();
    const abs = Math.abs(ms);
    const mins = Math.floor(abs / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const base = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return ms >= 0 ? `Due in ${base}` : `Overdue by ${base}`;
  };

  const handleApplySla = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) return;
    if (!ticket) return;

    setSlaError(null);
    setSlaBusy(true);

    const policyRes = await supabase
      .from("sla_policies")
      .select("id,first_response_minutes,resolution_minutes")
      .eq("is_active", true)
      .or(
        [
          `match_ticket_type.is.null,match_ticket_type.eq.${ticket.ticket_type}`,
          `match_priority.is.null,match_priority.eq.${ticket.priority}`,
          `match_category.is.null,match_category.eq.${ticket.category}`,
        ].join(","),
      );

    if (policyRes.error) {
      setSlaError(policyRes.error.message);
      setSlaBusy(false);
      return;
    }

    const policies = (policyRes.data ?? []) as Array<{ id: string; first_response_minutes: number | null; resolution_minutes: number | null }>;

    const matching = policies
      .filter((p: any) => {
        return true;
      })
      .slice(0);

    const picked = matching[0];
    if (!picked) {
      setSlaError("No active SLA policy matched this ticket");
      setSlaBusy(false);
      return;
    }

    const now = Date.now();
    const firstDue = picked.first_response_minutes != null ? new Date(now + picked.first_response_minutes * 60000).toISOString() : null;
    const resDue = picked.resolution_minutes != null ? new Date(now + picked.resolution_minutes * 60000).toISOString() : null;

    const up = await supabase
      .from("ticket_slas")
      .upsert(
        {
          ticket_id: effectiveTicketId,
          sla_policy_id: picked.id,
          first_response_due_at: firstDue,
          resolution_due_at: resDue,
        },
        { onConflict: "ticket_id" },
      );

    if (up.error) {
      setSlaError(up.error.message);
      setSlaBusy(false);
      return;
    }

    await loadSla();
    setSlaBusy(false);
  }, [effectiveTicketId, loadSla, supabase, ticket, user]);

  const handleMarkFirstResponse = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) return;

    setSlaError(null);
    setSlaBusy(true);

    const res = await supabase
      .from("ticket_slas")
      .update({ first_response_at: new Date().toISOString() })
      .eq("ticket_id", effectiveTicketId);

    if (res.error) {
      setSlaError(res.error.message);
      setSlaBusy(false);
      return;
    }

    await supabase
      .from("ticket_sla_events")
      .insert({ ticket_id: effectiveTicketId, event_type: "first_response_marked", payload: {} });

    await loadSla();
    await loadSlaEvents();
    setSlaBusy(false);
  }, [effectiveTicketId, loadSla, loadSlaEvents, supabase, user]);

  const handleMarkResolved = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) return;

    setSlaError(null);
    setSlaBusy(true);

    const res = await supabase
      .from("ticket_slas")
      .update({ resolved_at: new Date().toISOString() })
      .eq("ticket_id", effectiveTicketId);

    if (res.error) {
      setSlaError(res.error.message);
      setSlaBusy(false);
      return;
    }

    await supabase
      .from("ticket_sla_events")
      .insert({ ticket_id: effectiveTicketId, event_type: "resolved_marked", payload: {} });

    await loadSla();
    await loadSlaEvents();
    setSlaBusy(false);
  }, [effectiveTicketId, loadSla, loadSlaEvents, supabase, user]);

  const handleUnlinkProcedureArticle = useCallback(
    async (articleId: string) => {
      if (!user) return;
      if (!effectiveTicketId) return;

      setProcedureBusyId(articleId);
      setProcedureLinkedError(null);

      const res = await supabase
        .from("ticket_knowledge_articles")
        .delete()
        .eq("ticket_id", effectiveTicketId)
        .eq("article_id", articleId);

      if (res.error) {
        setProcedureLinkedError(res.error.message);
        setProcedureBusyId(null);
        return;
      }

      await loadProcedureLinked();
      setProcedureBusyId(null);
    },
    [effectiveTicketId, loadProcedureLinked, supabase, user],
  );

  type AttachmentRow = {
    id: string;
    file_name: string;
    mime_type: string | null;
    size_bytes: number | null;
    storage_path: string;
    created_at: string;
  };

  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [attachmentsBusyId, setAttachmentsBusyId] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setAttachments([]);
      setAttachmentsError(null);
      return;
    }

    setAttachmentsError(null);
    setAttachmentsLoading(true);

    const res = await supabase
      .from("ticket_attachments")
      .select("id,file_name,mime_type,size_bytes,storage_path,created_at")
      .eq("ticket_id", effectiveTicketId)
      .order("created_at", { ascending: false });

    if (res.error) {
      setAttachmentsError(res.error.message);
      setAttachmentsLoading(false);
      return;
    }

    setAttachments((res.data ?? []) as AttachmentRow[]);
    setAttachmentsLoading(false);
  }, [effectiveTicketId, supabase, user]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  const formatBytes = (sizeBytes: number | null) => {
    const bytes = sizeBytes ?? 0;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const isAllowedMime = (mime: string) => {
    if (mime.startsWith("image/")) return true;
    return [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ].includes(mime);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    if (!user) return;
    if (!effectiveTicketId) {
      setAttachmentsError("Save the ticket before uploading attachments.");
      return;
    }

    setAttachmentsError(null);

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setAttachmentsError(`File too large: ${file.name} (max 10MB)`);
        continue;
      }
      if (!isAllowedMime(file.type)) {
        setAttachmentsError(`Unsupported file type: ${file.name}`);
        continue;
      }

      setAttachmentsBusyId(file.name);

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const storagePath = `tickets/${effectiveTicketId}/${Date.now()}_${safeName}`;

      const upload = await supabase
        .storage
        .from("ticket-attachments")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (upload.error) {
        setAttachmentsError(upload.error.message);
        setAttachmentsBusyId(null);
        continue;
      }

      const insertRow = await supabase
        .from("ticket_attachments")
        .insert({
          ticket_id: effectiveTicketId,
          uploader_id: user.id,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          storage_path: storagePath,
        });

      if (insertRow.error) {
        setAttachmentsError(insertRow.error.message);
        await supabase.storage.from("ticket-attachments").remove([storagePath]);
        setAttachmentsBusyId(null);
        continue;
      }

      await loadAttachments();
      setAttachmentsBusyId(null);
    }
  };

  const openAttachment = async (row: AttachmentRow) => {
    setAttachmentsBusyId(row.id);
    setAttachmentsError(null);

    const signed = await supabase
      .storage
      .from("ticket-attachments")
      .createSignedUrl(row.storage_path, 60 * 30);

    if (signed.error) {
      setAttachmentsError(signed.error.message);
      setAttachmentsBusyId(null);
      return;
    }

    window.open(signed.data.signedUrl, "_blank", "noopener,noreferrer");
    setAttachmentsBusyId(null);
  };

  const deleteAttachment = async (row: AttachmentRow) => {
    if (!user) return;
    setAttachmentsBusyId(row.id);
    setAttachmentsError(null);

    const storageRes = await supabase
      .storage
      .from("ticket-attachments")
      .remove([row.storage_path]);

    if (storageRes.error) {
      setAttachmentsError(storageRes.error.message);
      setAttachmentsBusyId(null);
      return;
    }

    const del = await supabase
      .from("ticket_attachments")
      .delete()
      .eq("id", row.id);

    if (del.error) {
      setAttachmentsError(del.error.message);
      setAttachmentsBusyId(null);
      return;
    }

    await loadAttachments();
    setAttachmentsBusyId(null);
  };

  type TicketCommentRow = {
    id: string;
    body: string;
    is_internal: boolean;
    created_at: string;
    author?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
  };

  type WorklogRow = {
    id: string;
    event_type: string;
    payload: Record<string, unknown>;
    created_at: string;
    actor?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
  };

  type AuditEventRow = {
    id: string;
    event_type: string;
    payload: Record<string, unknown>;
    created_at: string;
    actor?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
  };

  const [auditIdLabelMap, setAuditIdLabelMap] = useState<Record<string, string>>({});

  const [comments, setComments] = useState<TicketCommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const [worklogs, setWorklogs] = useState<WorklogRow[]>([]);
  const [worklogsLoading, setWorklogsLoading] = useState(false);
  const [worklogsError, setWorklogsError] = useState<string | null>(null);

  const [auditEvents, setAuditEvents] = useState<AuditEventRow[]>([]);
  const [auditEventsLoading, setAuditEventsLoading] = useState(false);
  const [auditEventsError, setAuditEventsError] = useState<string | null>(null);

  const [messageText, setMessageText] = useState("");
  const [composerMode, setComposerMode] = useState<"message" | "worklog">("message");
  const [invisibleToCaller, setInvisibleToCaller] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "worklog") {
      setComposerMode("worklog");
      return;
    }
    // Keep existing mode unless we're on the Worklog tab.
  }, [activeTab]);

  const loadComments = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setComments([]);
      setCommentsError(null);
      return;
    }

    setCommentsError(null);
    setCommentsLoading(true);

    const res = await supabase
      .from("ticket_comments")
      .select("id,body,is_internal,created_at,author:author_id(full_name,email,avatar_url)")
      .eq("ticket_id", effectiveTicketId)
      .order("created_at", { ascending: true });

    if (res.error) {
      setCommentsError(res.error.message);
      setCommentsLoading(false);
      return;
    }

    const normalized = (res.data ?? []).map((row: any) => {
      const author = Array.isArray(row.author) ? (row.author[0] ?? null) : (row.author ?? null);
      return {
        ...row,
        author,
      };
    });

    setComments(normalized as unknown as TicketCommentRow[]);
    setCommentsLoading(false);
  }, [effectiveTicketId, supabase, user]);

  const loadWorklogs = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setWorklogs([]);
      setWorklogsError(null);
      return;
    }

    setWorklogsError(null);
    setWorklogsLoading(true);

    const res = await supabase
      .from("ticket_events")
      .select("id,event_type,payload,created_at,actor:actor_id(full_name,email,avatar_url)")
      .eq("ticket_id", effectiveTicketId)
      .eq("event_type", "worklog")
      .order("created_at", { ascending: true });

    if (res.error) {
      setWorklogsError(res.error.message);
      setWorklogsLoading(false);
      return;
    }

    const normalized = (res.data ?? []).map((row: any) => {
      const actor = Array.isArray(row.actor) ? (row.actor[0] ?? null) : (row.actor ?? null);
      return {
        ...row,
        actor,
      };
    });

    setWorklogs(normalized as unknown as WorklogRow[]);
    setWorklogsLoading(false);
  }, [effectiveTicketId, supabase, user]);

  const loadAuditEvents = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setAuditEvents([]);
      setAuditEventsError(null);
      setAuditIdLabelMap({});
      return;
    }

    setAuditEventsError(null);
    setAuditEventsLoading(true);

    const res = await supabase
      .from("ticket_events")
      .select("id,event_type,payload,created_at,actor:actor_id(full_name,email,avatar_url)")
      .eq("ticket_id", effectiveTicketId)
      .neq("event_type", "worklog")
      .order("created_at", { ascending: false });

    if (res.error) {
      setAuditEventsError(res.error.message);
      setAuditEventsLoading(false);
      return;
    }

    const normalized = (res.data ?? []).map((row: any) => {
      const actor = Array.isArray(row.actor) ? (row.actor[0] ?? null) : (row.actor ?? null);
      return {
        ...row,
        actor,
      };
    });

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const profileIds = new Set<string>();
    const groupIds = new Set<string>();
    const ticketIds = new Set<string>();

    const collectUuid = (key: string, value: unknown) => {
      if (typeof value !== "string" || !UUID_RE.test(value)) return;
      const k = key.toLowerCase();
      if (k.includes("group") && k.endsWith("_id")) {
        groupIds.add(value);
        return;
      }
      if (k.includes("ticket") && k.endsWith("_id")) {
        ticketIds.add(value);
        return;
      }
      if (k.endsWith("_id")) {
        profileIds.add(value);
      }
    };

    const scanPayload = (payload: unknown, depth: number) => {
      if (!payload || depth <= 0) return;
      if (Array.isArray(payload)) {
        for (const v of payload) scanPayload(v, depth - 1);
        return;
      }
      if (typeof payload !== "object") return;
      for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
        collectUuid(k, v);
        if (typeof v === "object" && v !== null) {
          scanPayload(v, depth - 1);
        }
      }
    };

    for (const e of normalized as any[]) {
      const changesArr = (e?.payload as any)?.changes as
        | Array<{ field: string; from: unknown; to: unknown }>
        | undefined;
      if (!Array.isArray(changesArr)) continue;

      for (const c of changesArr) {
        const field = String((c as any)?.field ?? "");
        if (!field.endsWith("_id")) continue;

        for (const v of [c.from, c.to]) {
          if (typeof v !== "string" || !UUID_RE.test(v)) continue;
          if (field === "assignment_group_id") {
            groupIds.add(v);
          } else {
            profileIds.add(v);
          }
        }
      }
    }

    for (const e of normalized as any[]) {
      scanPayload(e?.payload, 3);
    }

    const idMap: Record<string, string> = {};
    if (profileIds.size) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", Array.from(profileIds));

      for (const p of (profiles ?? []) as any[]) {
        const name = String(p?.full_name ?? "").trim();
        const email = String(p?.email ?? "").trim();
        idMap[String(p.id)] = name || email || "Unknown";
      }
    }

    if (groupIds.size) {
      const { data: groups } = await supabase
        .from("operator_groups")
        .select("id,name,group_key")
        .in("id", Array.from(groupIds));

      for (const g of (groups ?? []) as any[]) {
        const name = String(g?.name ?? "").trim();
        const key = String(g?.group_key ?? "").trim();
        idMap[String(g.id)] = name || key || "Unknown";
      }
    }

    if (ticketIds.size) {
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id,ticket_number,title")
        .in("id", Array.from(ticketIds));

      for (const t of (tickets ?? []) as any[]) {
        const num = String(t?.ticket_number ?? "").trim();
        const title = String(t?.title ?? "").trim();
        idMap[String(t.id)] = num || title || "Ticket";
      }
    }

    setAuditIdLabelMap(idMap);

    setAuditEvents(normalized as unknown as AuditEventRow[]);
    setAuditEventsLoading(false);
  }, [effectiveTicketId, supabase, user]);

  useEffect(() => {
    void loadComments();
    void loadWorklogs();
    void loadAuditEvents();
  }, [loadAuditEvents, loadComments, loadWorklogs]);

  useEffect(() => {
    if (!effectiveTicketId) return;

    const channel = supabase
      .channel(`pdsdesk:ticket-detail:${effectiveTicketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `id=eq.${effectiveTicketId}` },
        () => {
          void loadTicket();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_comments", filter: `ticket_id=eq.${effectiveTicketId}` },
        () => {
          void loadComments();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_events", filter: `ticket_id=eq.${effectiveTicketId}` },
        () => {
          void loadWorklogs();
          void loadAuditEvents();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_attachments", filter: `ticket_id=eq.${effectiveTicketId}` },
        () => {
          void loadAttachments();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_time_entries", filter: `ticket_id=eq.${effectiveTicketId}` },
        () => {
          void loadTimeEntries();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_links", filter: `from_ticket_id=eq.${effectiveTicketId}` },
        () => {
          void loadLinks();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_links", filter: `to_ticket_id=eq.${effectiveTicketId}` },
        () => {
          void loadLinks();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_knowledge_articles", filter: `ticket_id=eq.${effectiveTicketId}` },
        () => {
          void loadProcedureLinked();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_customer_satisfaction", filter: `ticket_id=eq.${effectiveTicketId}` },
        () => {
          void loadSatisfaction();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_slas", filter: `ticket_id=eq.${effectiveTicketId}` },
        () => {
          void loadSla();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_sla_events", filter: `ticket_id=eq.${effectiveTicketId}` },
        () => {
          void loadSlaEvents();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [effectiveTicketId, loadAttachments, loadAuditEvents, loadComments, loadLinks, loadProcedureLinked, loadSatisfaction, loadSla, loadSlaEvents, loadTicket, loadTimeEntries, loadWorklogs, supabase]);

  const handleSend = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setSendError("Save the ticket before sending.");
      return;
    }

    const body = messageText.trim();
    if (!body) {
      setSendError("Message is required");
      return;
    }

    setSendError(null);
    setSendLoading(true);

    if (composerMode === "worklog") {
      const res = await supabase
        .from("ticket_events")
        .insert({
          ticket_id: effectiveTicketId,
          actor_id: user.id,
          event_type: "worklog",
          payload: {
            message: body,
            is_internal: invisibleToCaller,
          },
        });

      if (res.error) {
        setSendError(res.error.message);
        setSendLoading(false);
        return;
      }

      setMessageText("");
      setInvisibleToCaller(false);
      await loadWorklogs();
      setSendLoading(false);
      return;
    }

    const res = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: effectiveTicketId,
        author_id: user.id,
        body,
        is_internal: invisibleToCaller,
      });

    if (res.error) {
      setSendError(res.error.message);
      setSendLoading(false);
      return;
    }

    setMessageText("");
    setInvisibleToCaller(false);
    await loadComments();
    setSendLoading(false);
  }, [composerMode, effectiveTicketId, invisibleToCaller, loadComments, loadWorklogs, messageText, supabase, user]);

  // Knowledge Base State
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState("");

  type KnowledgeArticleRow = {
    id: string;
    title: string;
    body: string;
    tags: string[];
    updated_at: string;
  };

  const [kbArticles, setKbArticles] = useState<KnowledgeArticleRow[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);

  // Message Templates State
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");

  type UserMessageTemplateRow = {
    id: string;
    name: string;
    content: string;
    updated_at: string;
  };

  // TODO: Fetch from Supabase user_preferences table
  const [savedTemplates, setSavedTemplates] = useState<UserMessageTemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [templatesBusyId, setTemplatesBusyId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!user) return;

    setTemplatesError(null);
    setTemplatesLoading(true);

    const res = await supabase
      .from("user_message_templates")
      .select("id,name,content,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (res.error) {
      setTemplatesError(res.error.message);
      setTemplatesLoading(false);
      return;
    }

    setSavedTemplates((res.data ?? []) as UserMessageTemplateRow[]);
    setTemplatesLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    if (!showTemplates) return;
    void loadTemplates();
  }, [loadTemplates, showTemplates]);

  const loadKnowledgeArticles = useCallback(
    async (query: string) => {
      if (!user) return;

      setKbError(null);
      setKbLoading(true);

      let q = supabase
        .from("knowledge_articles")
        .select("id,title,body,tags,updated_at")
        .order("updated_at", { ascending: false })
        .limit(20);

      const term = query.trim();
      if (term) {
        const safe = term.replace(/%/g, "\\%").replace(/_/g, "\\_");
        q = q.or(`title.ilike.%${safe}%,body.ilike.%${safe}%`);
      }

      const res = await q;
      if (res.error) {
        setKbError(res.error.message);
        setKbLoading(false);
        return;
      }

      setKbArticles((res.data ?? []) as KnowledgeArticleRow[]);
      setKbLoading(false);
    },
    [supabase, user],
  );

  useEffect(() => {
    if (!showKnowledgeBase) return;

    const timer = window.setTimeout(() => {
      void loadKnowledgeArticles(kbSearchQuery);
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [kbSearchQuery, loadKnowledgeArticles, showKnowledgeBase]);

  const handleUseKbArticle = useCallback(
    (article: KnowledgeArticleRow) => {
      setMessageText((prev) => {
        const next = prev.trim();
        return next ? `${next}\n\n${article.body}` : article.body;
      });
      setShowKnowledgeBase(false);
    },
    [],
  );

  const handleInsertTemplate = (template: { id: string; name: string; content: string }) => {
    setMessageText(template.content);
    setShowTemplates(false);
  };

  const handleSaveNewTemplate = async () => {
    if (!user) return;
    if (savedTemplates.length >= 5) {
      setTemplatesError("Maximum of 5 templates allowed. Please delete one to add a new template.");
      return;
    }

    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      setTemplatesError("Please enter both template name and content.");
      return;
    }

    setTemplatesError(null);
    setTemplatesLoading(true);

    const res = await supabase
      .from("user_message_templates")
      .insert({
        user_id: user.id,
        name: newTemplateName.trim(),
        content: newTemplateContent.trim(),
      });

    if (res.error) {
      setTemplatesError(res.error.message);
      setTemplatesLoading(false);
      return;
    }

    setNewTemplateName("");
    setNewTemplateContent("");
    setEditingTemplate(null);

    await loadTemplates();
    setTemplatesLoading(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!user) return;
    setTemplatesBusyId(id);
    setTemplatesError(null);

    const res = await supabase
      .from("user_message_templates")
      .delete()
      .eq("id", id);

    if (res.error) {
      setTemplatesError(res.error.message);
      setTemplatesBusyId(null);
      return;
    }

    await loadTemplates();
    setTemplatesBusyId(null);
  };

  const removeFile = async (id: string) => {
    const row = attachments.find((a) => a.id === id);
    if (!row) return;
    await deleteAttachment(row);
  };

  const refreshAll = useCallback(() => {
    void loadTicket();
    void loadComments();
    void loadWorklogs();
    void loadAttachments();
    void loadTimeEntries();
    void loadLinks();
    void loadAuditEvents();
    void loadProcedureLinked();
    void loadSatisfaction();
    void loadSla();
    void loadSlaEvents();
  }, [loadAttachments, loadAuditEvents, loadComments, loadLinks, loadProcedureLinked, loadSatisfaction, loadSla, loadSlaEvents, loadTicket, loadTimeEntries, loadWorklogs]);

  const toggleFavorite = useCallback(() => {
    if (!effectiveTicketId) return;
    try {
      const raw = localStorage.getItem("pdsdesk.ticket_favorites");
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      const prevIds = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
      const next = prevIds.includes(effectiveTicketId)
        ? prevIds.filter((id) => id !== effectiveTicketId)
        : [...prevIds, effectiveTicketId];
      localStorage.setItem("pdsdesk.ticket_favorites", JSON.stringify(next));
      setIsFavorite(next.includes(effectiveTicketId));
    } catch {
      // ignore
    }
  }, [effectiveTicketId]);

  const handleEscalate = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) {
      setSaveError("Save the ticket before escalating.");
      return;
    }

    setEscalateOpen(true);
  }, [effectiveTicketId, user]);

  const submitEscalation = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId) return;

    const currentGroupId = ticket?.assignment_group_id ?? null;
    const targetGroupId = escalateGroupId || null;
    const note = escalateNote.trim() || null;

    const willChangeGroup = currentGroupId !== targetGroupId;
    const willChangePriority = Boolean(escalateMakeUrgent && (ticket?.priority ?? "") !== "urgent");
    const willCreateInternalNote = Boolean(note && escalateAddInternalNote);

    const assigneeAction = escalateAssigneeId;
    const nextAssigneeId = assigneeAction === "__keep__" ? null : (assigneeAction || null);
    const willChangeAssignee = assigneeAction !== "__keep__" && (ticket?.assignee_id ?? null) !== nextAssigneeId;

    if (!willChangeGroup && !willChangePriority && !willChangeAssignee && !note) {
      setEscalateError("Select a new queue, change assignee, mark urgent, or add a note.");
      return;
    }

    setEscalateError(null);
    setEscalateSubmitting(true);

    const selectedGroup = operatorGroups.find((g) => g.id === targetGroupId) ?? null;
    const selectedAssignee =
      assigneeAction === "__keep__"
        ? null
        : (escalateMembers.find((m) => m.id === (nextAssigneeId ?? "")) ?? null);

    const shouldNotifyAssignee = Boolean(escalateNotifyAssignee && willChangeAssignee && nextAssigneeId);
    const shouldNotifyGroup = Boolean(escalateNotifyGroup && willChangeGroup && targetGroupId);

    if (willChangeGroup || willChangePriority || willChangeAssignee) {
      const updateFields: Record<string, unknown> = {
        ...(willChangeGroup ? { assignment_group_id: targetGroupId } : null),
        ...(willChangeAssignee ? { assignee_id: nextAssigneeId } : null),
      };
      if (willChangePriority) {
        updateFields.priority = "urgent";
      }

      const upd = await supabase
        .from("tickets")
        .update(updateFields)
        .eq("id", effectiveTicketId);

      if (upd.error) {
        setEscalateError(upd.error.message);
        setEscalateSubmitting(false);
        return;
      }
    }

    const ev = await supabase.from("ticket_events").insert({
      ticket_id: effectiveTicketId,
      actor_id: user.id,
      event_type: "escalation",
      payload: {
        note,
        to_assignment_group_id: targetGroupId,
        to_assignment_group_name: selectedGroup?.name ?? null,
        to_assignee_id: assigneeAction === "__keep__" ? undefined : nextAssigneeId,
        to_assignee_name: selectedAssignee?.full_name ?? selectedAssignee?.email ?? null,
        priority_set_to_urgent: !!escalateMakeUrgent,
      },
    });

    if (ev.error) {
      setEscalateError(ev.error.message);
      setEscalateSubmitting(false);
      return;
    }

    if (willCreateInternalNote) {
      const commentRes = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: effectiveTicketId,
          author_id: user.id,
          body: `Escalation: ${note}`,
          is_internal: true,
        });

      if (commentRes.error) {
        setEscalateError(commentRes.error.message);
        setEscalateSubmitting(false);
        return;
      }
    }

    // Best-effort SLA event.
    await supabase.from("ticket_sla_events").insert({
      ticket_id: effectiveTicketId,
      event_type: "manual_escalation",
      payload: {
        note,
        to_assignment_group_id: targetGroupId,
      },
    });

    if (shouldNotifyAssignee || shouldNotifyGroup) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          throw new Error("Missing access token");
        }

        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ticket-escalation-email`;
        const notifyRes = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            ticketId: effectiveTicketId,
            toAssignmentGroupId: targetGroupId,
            toAssigneeId: nextAssigneeId,
            note,
            notifyAssignee: shouldNotifyAssignee,
            notifyGroup: shouldNotifyGroup,
            excludeActor: true,
          }),
        });
        if (!notifyRes.ok) {
          throw new Error(`ticket-escalation-email failed: ${notifyRes.status}`);
        }
      } catch {
        // Don't block escalation if notify fails
      }
    }

    if (willChangeGroup) {
      setEditAssignmentGroupId(targetGroupId ?? "");
    }
    if (willChangePriority) {
      setEditPriority("urgent");
    }
    if (willChangeAssignee) {
      setEditAssigneeId(nextAssigneeId ?? "");
    }
    setTicket((prev) =>
      prev
        ? {
            ...prev,
            ...(willChangeGroup ? { assignment_group_id: targetGroupId } : null),
            ...(willChangeAssignee ? { assignee_id: nextAssigneeId } : null),
            ...(willChangePriority ? { priority: "urgent" } : null),
          }
        : prev,
    );

    setEscalateSubmitting(false);
    setEscalateOpen(false);
    void refreshAll();
  }, [effectiveTicketId, escalateAddInternalNote, escalateAssigneeId, escalateGroupId, escalateMakeUrgent, escalateMembers, escalateNote, escalateNotifyAssignee, escalateNotifyGroup, operatorGroups, refreshAll, supabase, ticket, user]);

  const createFollowUpTicket = useCallback(async () => {
    if (!user) return;
    if (!effectiveTicketId || !ticket) {
      setSaveError("Save the ticket before creating a follow-up.");
      return;
    }

    setSaveError(null);

    const inserted = await supabase
      .from("tickets")
      .insert({
        title: `Follow-up: ${ticket.title}`,
        description: null,
        status: "new",
        priority: ticket.priority,
        requester_id: user.id,
        created_by: user.id,
        assignee_id: null,
        ticket_type: ticket.ticket_type,
        category: ticket.category,
        channel: "manual",
      })
      .select("id")
      .single();

    if (inserted.error) {
      setSaveError(inserted.error.message);
      return;
    }

    const newId = inserted.data.id as string;

    const linkRes = await supabase.from("ticket_links").insert({
      from_ticket_id: newId,
      to_ticket_id: effectiveTicketId,
      link_type: "child_of",
      created_by: user.id,
    });

    if (linkRes.error) {
      setSaveError(linkRes.error.message);
      return;
    }

    await supabase.from("ticket_events").insert({
      ticket_id: effectiveTicketId,
      actor_id: user.id,
      event_type: "follow_up_created",
      payload: {
        follow_up_ticket_id: newId,
      },
    });

    window.dispatchEvent(new CustomEvent("pdsdesk:call-management:open-ticket", { detail: { ticketId: newId } }));
    window.dispatchEvent(new CustomEvent("pdsdesk:refresh"));
  }, [effectiveTicketId, supabase, ticket, user]);

  const createNewTicket = useCallback(() => {
    window.dispatchEvent(new CustomEvent("pdsdesk:call-management:new-ticket"));
  }, []);

  const quickSetStatus = useCallback(
    async (nextStatus: string) => {
      if (!user) return;
      if (!effectiveTicketId || !ticket) {
        setSaveError("Save the ticket before changing status.");
        return;
      }

      const current = String(ticket.status || "");
      if (current === nextStatus) return;

      setSaveError(null);

      const upd = await supabase.from("tickets").update({ status: nextStatus }).eq("id", effectiveTicketId);
      if (upd.error) {
        setSaveError(upd.error.message);
        return;
      }

      await supabase.from("ticket_events").insert({
        ticket_id: effectiveTicketId,
        actor_id: user.id,
        event_type: "ticket_status_changed",
        payload: {
          from: current,
          to: nextStatus,
        },
      });

      setEditStatus(nextStatus);
      setTicket((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      void loadAuditEvents();
    },
    [effectiveTicketId, loadAuditEvents, supabase, ticket, user],
  );

  const tabs = [
    { id: "general", label: "GENERAL" },
    { id: "information", label: "INFORMATION" },
    { id: "links", label: "LINKS" },
    { id: "worklog", label: "WORKLOG" },
    {
      id: "customer-satisfaction",
      label: "CUSTOMER SATISFACTION",
    },
    { id: "sla", label: "SLA" },
    { id: "procedure", label: "PROCEDURE" },
    { id: "attachments", label: "ATTACHMENTS" },
    { id: "audit-trail", label: "AUDIT TRAIL" },
    { id: "time-registration", label: "TIME REGISTRATION" },
  ];

  return (
    <div className="pds-page flex-1 overflow-hidden">
      {/* Header */}
      <div className="pds-page-header flex-shrink-0">
        <div className="pds-toolbar">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="pds-icon-btn pds-focus"
                title="Back"
              >
                <ArrowLeft size={16} className="pds-header-icon" />
              </button>
            )}
            <h2 className="pds-page-title">
              {isDraft
                ? "New Incident"
                : ticketLoading
                  ? "Loading..."
                  : ticket
                    ? `${ticket.ticket_number} ${ticket.title}`
                    : ticketId
                      ? `Ticket ${ticketId}`
                      : "Ticket"}
            </h2>
          </div>
          <div className="pds-toolbar-actions">
          <button
            type="button"
            className="pds-btn pds-btn--primary pds-focus"
            onClick={() => void handleSave()}
            disabled={saveLoading}
          >
            <Save size={14} />
            {saveLoading ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="pds-icon-btn pds-focus"
            onClick={toggleFavorite}
            title={isFavorite ? "Unfavorite" : "Favorite"}
            disabled={!effectiveTicketId}
          >
            <Star size={16} className={isFavorite ? "text-yellow-600" : "pds-header-icon"} />
          </button>
          <button
            type="button"
            className="pds-icon-btn pds-focus"
            onClick={refreshAll}
            title="Refresh"
          >
            <RotateCw size={16} className="pds-header-icon" />
          </button>
          <button
            type="button"
            className="pds-btn pds-btn--outline pds-focus"
            onClick={() => void handleEscalate()}
            disabled={!effectiveTicketId}
          >
            <span className="flex items-center gap-1">
              <ArrowUpRight size={14} />
              Escalate
            </span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="pds-btn pds-btn--outline pds-focus"
              >
                Create <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Create</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => createNewTicket()}>
                  <Plus className="size-4" />
                  New ticket
                  <DropdownMenuShortcut>N</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => void createFollowUpTicket()}
                  disabled={!effectiveTicketId}
                >
                  <Copy className="size-4" />
                  Follow-up (linked)
                  <DropdownMenuShortcut>F</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="pds-btn pds-btn--outline pds-focus"
              >
                <MoreHorizontal size={14} />
                <ChevronDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>More</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={() => void copyText(ticket?.ticket_number ?? "")}
                  disabled={!ticket?.ticket_number}
                >
                  <Copy className="size-4" />
                  Copy ticket number
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => void copyText(effectiveTicketId ?? "")}
                  disabled={!effectiveTicketId}
                >
                  <Copy className="size-4" />
                  Copy ticket id
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => void quickSetStatus("open")} disabled={!effectiveTicketId}>
                  Set to Open
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void quickSetStatus("resolved")} disabled={!effectiveTicketId}>
                  Set to Resolved
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void quickSetStatus("closed")} disabled={!effectiveTicketId}>
                  Set to Closed
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>

      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate</DialogTitle>
            <DialogDescription>
              Route this ticket to another team queue and optionally raise priority.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="pds-panel p-3" style={{ background: "var(--pds-surface-2)" }}>
              <div className="text-xs pds-text-muted">Routing</div>
              <div className="mt-1 text-sm" style={{ color: "var(--pds-text)" }}>
                <span className="font-medium">From:</span>{" "}
                {ticket?.assignment_group_id
                  ? operatorGroups.find((g) => g.id === ticket.assignment_group_id)?.name ?? "Current queue"
                  : "Unassigned"}
                {" "}
                <span className="pds-text-muted">→</span>{" "}
                <span className="font-medium">To:</span>{" "}
                {escalateGroupId
                  ? operatorGroups.find((g) => g.id === escalateGroupId)?.name ?? "Selected queue"
                  : "Unassigned"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium" style={{ color: "var(--pds-text)" }}>
                Escalate to
              </label>
              <select
                className="pds-input pds-focus w-full"
                value={escalateGroupId}
                onChange={(e) => {
                  const next = e.target.value;
                  setEscalateGroupId(next);
                  const currentGroup = ticket?.assignment_group_id ?? "";
                  if (next && next !== currentGroup) {
                    setEscalateAssigneeId("");
                  } else {
                    setEscalateAssigneeId("__keep__");
                  }
                }}
                disabled={operatorGroupsLoading || escalateSubmitting}
              >
                <option value="">Unassigned</option>
                {operatorGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {operatorGroupsError && (
                <div className="mt-1 text-xs" style={{ color: "var(--pds-danger)" }}>{operatorGroupsError}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium" style={{ color: "var(--pds-text)" }}>Assign to</label>
              <select
                className="pds-input pds-focus w-full"
                value={escalateAssigneeId}
                onChange={(e) => setEscalateAssigneeId(e.target.value)}
                disabled={escalateSubmitting || !escalateGroupId || escalateMembersLoading}
              >
                <option value="__keep__">Keep current assignee</option>
                <option value="">Unassigned</option>
                {user?.id && <option value={user.id}>Me ({user.email ?? ""})</option>}
                {escalateMembers
                  .filter((m) => m.id !== user?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email || m.id}
                    </option>
                  ))}
              </select>
              {escalateMembersError && <div className="mt-1 text-xs" style={{ color: "var(--pds-danger)" }}>{escalateMembersError}</div>}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--pds-text)" }}>
                <input
                  type="checkbox"
                  checked={escalateNotifyAssignee}
                  onChange={(e) => setEscalateNotifyAssignee(e.target.checked)}
                  disabled={
                    escalateSubmitting ||
                    !(escalateAssigneeId && escalateAssigneeId !== "__keep__")
                  }
                />
                Notify new assignee by email
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--pds-text)" }}>
                <input
                  type="checkbox"
                  checked={escalateNotifyGroup}
                  onChange={(e) => setEscalateNotifyGroup(e.target.checked)}
                  disabled={escalateSubmitting || !escalateGroupId || escalateGroupId === (ticket?.assignment_group_id ?? "")}
                />
                Notify target queue by email
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium" style={{ color: "var(--pds-text)" }}>
                Note
              </label>
              <textarea
                className="pds-input pds-focus w-full"
                rows={4}
                value={escalateNote}
                onChange={(e) => setEscalateNote(e.target.value)}
                placeholder="Add context for the receiving team (optional)"
                disabled={escalateSubmitting}
              />
              <label className="flex items-center gap-2 text-sm mt-2" style={{ color: "var(--pds-text)" }}>
                <input
                  type="checkbox"
                  checked={escalateAddInternalNote}
                  onChange={(e) => setEscalateAddInternalNote(e.target.checked)}
                  disabled={escalateSubmitting || !escalateNote.trim()}
                />
                Save note as internal message
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--pds-text)" }}>
              <input
                type="checkbox"
                checked={escalateMakeUrgent}
                onChange={(e) => setEscalateMakeUrgent(e.target.checked)}
                disabled={escalateSubmitting}
              />
              Mark as urgent (P1)
            </label>

            {escalateError && (
              <div className="text-sm" style={{ color: "var(--pds-danger)" }}>{escalateError}</div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="pds-btn pds-btn--outline pds-focus"
              onClick={() => setEscalateOpen(false)}
              disabled={escalateSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pds-btn pds-btn--primary pds-focus"
              onClick={() => void submitEscalation()}
              disabled={
                escalateSubmitting ||
                (!ticket ||
                  (() => {
                    const currentGroupId = ticket?.assignment_group_id ?? null;
                    const targetGroupId = escalateGroupId || null;
                    const willChangeGroup = currentGroupId !== targetGroupId;
                    const willChangePriority = Boolean(escalateMakeUrgent && (ticket?.priority ?? "") !== "urgent");
                    const note = escalateNote.trim() || null;
                    const assigneeAction = escalateAssigneeId;
                    const nextAssigneeId = assigneeAction === "__keep__" ? null : (assigneeAction || null);
                    const willChangeAssignee = assigneeAction !== "__keep__" && (ticket?.assignee_id ?? null) !== nextAssigneeId;
                    return !willChangeGroup && !willChangePriority && !willChangeAssignee && !note;
                  })())
              }
            >
              <Users size={14} />
              {escalateSubmitting ? "Escalating..." : "Escalate"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {notice && (
        <div className="pds-message" data-tone="success">
          <div className="flex-1">{notice}</div>
          <button
            type="button"
            className="pds-icon-btn pds-focus"
            onClick={() => setNotice(null)}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="pds-subtabs flex-shrink-0 relative z-20 pointer-events-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="pds-subtab pds-focus"
            data-active={activeTab === tab.id ? "true" : "false"}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Form Fields */}
        <div className="w-96 border-r border-[var(--pds-border)] overflow-y-auto p-4" style={{ background: "var(--pds-surface)" }}>
          {ticketError && (
            <div
              className="pds-panel mb-4 p-3 text-sm"
              style={{ background: "rgba(180, 35, 24, 0.06)", color: "var(--pds-danger)" }}
            >
              {ticketError}
            </div>
          )}
          {saveError && (
            <div
              className="pds-panel mb-4 p-3 text-sm"
              style={{ background: "rgba(180, 35, 24, 0.06)", color: "var(--pds-danger)" }}
            >
              {saveError}
            </div>
          )}
          {/* Caller Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>
                Caller
              </h3>
              <button className="pds-btn pds-btn--link pds-focus" type="button">
                Share with others
              </button>
            </div>
            <div className="pds-panel flex items-start gap-3 p-3" style={{ background: "var(--pds-surface-2)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(17, 20, 24, 0.10)" }}>
                <UserIcon size={24} className="pds-text-muted" />
              </div>
              <div className="flex-1 text-sm">
                <div className="font-semibold mb-1" style={{ color: "var(--pds-text)" }}>
                  {ticket?.requester?.full_name ?? ticket?.requester_name ?? ticket?.requester?.email ?? ticket?.requester_email ?? "-"}
                </div>
                <div className="text-xs pds-text-muted space-y-0.5">
                  {!ticket?.requester && (ticket?.requester_name || ticket?.requester_email) && (
                    <div>External requester</div>
                  )}

                  {(ticket?.requester?.email ?? ticket?.requester_email) && (
                    <div style={{ color: "var(--pds-accent)" }}>
                      {ticket?.requester?.email ?? ticket?.requester_email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Incident Details */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>
                {editTitle || "Incident"}
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  Failure
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="pds-input pds-focus w-full"
                />
              </div>
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  Software
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="pds-input pds-focus w-full"
                />
              </div>
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  External Number
                </label>
                <input
                  type="text"
                  value={editExternalNumber}
                  onChange={(e) => setEditExternalNumber(e.target.value)}
                  className="pds-input pds-focus w-full"
                />
              </div>
            </div>
          </div>

          {/* Planning Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>
              Planning
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  Priority
                </label>
                <select
                  className="pds-input pds-focus w-full"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  Duration
                </label>
                <select
                  className="pds-input pds-focus w-full"
                  value={durationPreset}
                  onChange={(e) => applyDurationPreset(e.target.value)}
                >
                  <option value="">Set due by...</option>
                  <option value={(2 * 60).toString()}>2 hours</option>
                  <option value={(4 * 60).toString()}>4 hours</option>
                  <option value={(24 * 60).toString()}>1 day</option>
                  <option value={(7 * 24 * 60).toString()}>1 week</option>
                </select>
              </div>
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  Target Date
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="pds-input pds-focus flex-1"
                  />
                  <input
                    type="time"
                    value={editDueTime}
                    onChange={(e) => setEditDueTime(e.target.value)}
                    className="pds-input pds-focus w-24"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="on-hold"
                  className="pds-focus"
                  checked={editStatus === "pending"}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEditStatus("pending");
                      return;
                    }
                    if (editStatus === "pending") {
                      setEditStatus("open");
                    }
                  }}
                />
                <label
                  htmlFor="on-hold"
                  className="text-sm"
                  style={{ color: "var(--pds-text)" }}
                >
                  On Hold
                </label>
              </div>
            </div>
          </div>

          {/* Processing Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>
              Processing
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  Operator Group
                </label>
                <select
                  className="pds-input pds-focus w-full"
                  value={editAssignmentGroupId}
                  onChange={(e) => setEditAssignmentGroupId(e.target.value)}
                  disabled={operatorGroupsLoading}
                >
                  <option value="">Unassigned</option>
                  {operatorGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                {operatorGroupsError && (
                  <div className="mt-1 text-xs" style={{ color: "var(--pds-danger)" }}>{operatorGroupsError}</div>
                )}
              </div>
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  Operator
                </label>
                <select
                  className="pds-input pds-focus w-full"
                  value={editAssigneeId}
                  onChange={(e) => setEditAssigneeId(e.target.value)}
                  disabled={operatorMembersLoading}
                >
                  <option value="">Unassigned</option>
                  {operatorMembersLoading ? (
                    <option value="" disabled>
                      Loading...
                    </option>
                  ) : (
                    <>
                      {user?.id && (
                        <option value={user.id}>Me ({user.email ?? ""})</option>
                      )}
                      {operatorMembers
                        .filter((m) => m.id !== user?.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name ?? m.email ?? m.id}
                          </option>
                        ))}
                      {ticket?.assignee_id &&
                        !operatorMembers.some((m) => m.id === ticket.assignee_id) &&
                        ticket.assignee_id !== user?.id &&
                        (ticket?.assignee?.full_name || ticket?.assignee?.email) && (
                          <option value={ticket.assignee_id}>
                            {ticket.assignee.full_name ?? ticket.assignee.email}
                          </option>
                        )}
                    </>
                  )}
                </select>
                {operatorMembersError && (
                  <div className="mt-1 text-xs" style={{ color: "var(--pds-danger)" }}>{operatorMembersError}</div>
                )}
              </div>
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  Status
                </label>
                <select
                  className="pds-input pds-focus w-full"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="new">new</option>
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="pending">pending</option>
                  <option value="resolved">resolved</option>
                  <option value="closed">closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  Closed
                </label>
                <input
                  type="checkbox"
                  className="pds-focus"
                  checked={editStatus === "closed"}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEditStatus("closed");
                      return;
                    }
                    if (editStatus === "closed") {
                      setEditStatus("open");
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-xs pds-text-muted mb-1">
                  Time Spent
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={String(totalTimeHours)}
                    readOnly
                    className="pds-input pds-focus w-20"
                  />
                  <span className="pds-text-muted">:</span>
                  <input
                    type="text"
                    value={String(totalTimeRemainderMinutes).padStart(2, "0")}
                    readOnly
                    className="pds-input pds-focus w-20"
                  />
                </div>
                {timeEntriesError && (
                  <div className="mt-1 text-xs" style={{ color: "var(--pds-danger)" }}>{timeEntriesError}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Messages/Activity */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--pds-bg)" }}>
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "audit-trail" ? (
              <div className="space-y-4">
                {!effectiveTicketId ? (
                  <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                    Save the ticket to view audit trail.
                  </div>
                ) : (
                  <>
                    {auditEventsError && (
                      <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                        {auditEventsError}
                      </div>
                    )}
                    {auditEventsLoading && (
                      <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                        Loading audit trail...
                      </div>
                    )}

                    {!auditEventsLoading && !auditEventsError && auditEvents.length === 0 && (
                      <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                        No audit events yet.
                      </div>
                    )}

                    {auditEvents.length > 0 && (
                      <div className="space-y-3">
                        {auditEvents.map((e) => {
                          const who = e.actor?.full_name ?? e.actor?.email ?? "Unknown";
                          const changesArr = (e.payload as any)?.changes as Array<{ field: string; from: unknown; to: unknown }> | undefined;
                          const payload = (e.payload ?? null) as any;

                          const formatAuditValue = (field: string, value: unknown) => {
                            if (value === null || value === undefined) return "-";
                            if (field.endsWith("_id") && typeof value === "string") {
                              if (auditIdLabelMap[value]) return auditIdLabelMap[value];
                              const UUID_RE =
                                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                              if (UUID_RE.test(value)) return "Unknown";
                            }
                            return String(value);
                          };

                          const payloadDetails = (() => {
                            if (!payload || typeof payload !== "object") return [] as Array<{ key: string; value: string }>;

                            const push = (key: string, val: unknown) => {
                              if (val === null || val === undefined) return;
                              if (typeof val === "object") return;
                              const rendered = formatAuditValue(key, val);
                              if (!rendered || rendered === "-") return;
                              if (rendered.length > 220) return;
                              return { key, value: rendered };
                            };

                            if (e.event_type === "ticket_status_changed") {
                              return [
                                push("from", payload.from),
                                push("to", payload.to),
                              ].filter(Boolean) as Array<{ key: string; value: string }>;
                            }

                            if (e.event_type === "escalation") {
                              return [
                                push("to_assignment_group_id", payload.to_assignment_group_id),
                                push("to_assignment_group_name", payload.to_assignment_group_name),
                                push("to_assignee_id", payload.to_assignee_id),
                                push("to_assignee_name", payload.to_assignee_name),
                                push("priority_set_to_urgent", payload.priority_set_to_urgent),
                                push("note", payload.note),
                              ].filter(Boolean) as Array<{ key: string; value: string }>;
                            }

                            if (e.event_type === "follow_up_created") {
                              return [
                                push("follow_up_ticket_id", payload.follow_up_ticket_id),
                              ].filter(Boolean) as Array<{ key: string; value: string }>;
                            }

                            if (e.event_type === "ticket_auto_closed") {
                              return [
                                push("closed_reason", payload.closed_reason),
                                push("closed_by", payload.closed_by),
                              ].filter(Boolean) as Array<{ key: string; value: string }>;
                            }

                            const ignored = new Set(["changes"]);
                            const out: Array<{ key: string; value: string }> = [];
                            for (const [k, v] of Object.entries(payload)) {
                              if (ignored.has(k)) continue;
                              const row = push(k, v);
                              if (row) out.push(row);
                              if (out.length >= 6) break;
                            }
                            return out;
                          })();

                          return (
                            <div key={e.id} className="pds-panel p-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{e.event_type}</div>
                                  <div className="text-xs pds-text-muted">{who}</div>
                                </div>
                                <div className="text-xs pds-text-muted">{new Date(e.created_at).toLocaleString()}</div>
                              </div>

                              {Array.isArray(changesArr) && changesArr.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {changesArr.map((c, idx) => (
                                    <div key={idx} className="text-xs" style={{ color: "var(--pds-text)" }}>
                                      <span className="font-semibold">{c.field}</span>: {formatAuditValue(c.field, c.from)} → {formatAuditValue(c.field, c.to)}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {(!Array.isArray(changesArr) || changesArr.length === 0) && payloadDetails.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {payloadDetails.map((d) => (
                                    <div key={d.key} className="text-xs" style={{ color: "var(--pds-text)" }}>
                                      <span className="font-semibold">{d.key}</span>: {d.value}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : activeTab === "procedure" ? (
              <div className="space-y-4">
                {!effectiveTicketId ? (
                  <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                    Save the ticket to manage procedure articles.
                  </div>
                ) : (
                  <>
                    {procedureLinkedError && (
                      <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                        {procedureLinkedError}
                      </div>
                    )}

                    <div className="pds-panel p-4">
                      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>Linked knowledge articles</h3>

                      {procedureLinkedLoading && (
                        <div className="text-sm pds-text-muted">Loading...</div>
                      )}

                      {!procedureLinkedLoading && procedureLinkedArticles.length === 0 && (
                        <div className="text-sm pds-text-muted">No linked articles yet.</div>
                      )}

                      {procedureLinkedArticles.length > 0 && (
                        <div className="space-y-2">
                          {procedureLinkedArticles.map((a) => (
                            <div key={a.id} className="pds-panel flex items-start justify-between p-3" style={{ background: "var(--pds-surface-2)" }}>
                              <div>
                                <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{a.title}</div>
                                <div className="text-xs pds-text-muted">{a.slug}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleUnlinkProcedureArticle(a.id)}
                                disabled={procedureBusyId === a.id}
                                className="pds-btn pds-btn--outline pds-btn--sm pds-focus"
                              >
                                {procedureBusyId === a.id ? "Working..." : "Unlink"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pds-panel p-4">
                      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>Search knowledge base</h3>
                      <input
                        type="text"
                        value={procedureSearchQuery}
                        onChange={(e) => setProcedureSearchQuery(e.target.value)}
                        placeholder="Search articles to link..."
                        className="pds-input pds-focus w-full"
                      />

                      {procedureSearchError && (
                        <div className="mt-2 text-sm" style={{ color: "var(--pds-danger)" }}>{procedureSearchError}</div>
                      )}

                      {procedureSearchLoading && (
                        <div className="mt-2 text-sm pds-text-muted">Searching...</div>
                      )}

                      {!procedureSearchLoading && !procedureSearchError && procedureSearchQuery.trim() && procedureSearchResults.length === 0 && (
                        <div className="mt-2 text-sm pds-text-muted">No results.</div>
                      )}

                      {procedureSearchResults.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {procedureSearchResults.map((a) => {
                            const isLinked = procedureLinkedArticles.some((l) => l.id === a.id);
                            return (
                              <div key={a.id} className="pds-panel flex items-start justify-between p-3" style={{ background: "var(--pds-surface-2)" }}>
                                <div>
                                  <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{a.title}</div>
                                  <div className="text-xs pds-text-muted">{a.slug}</div>
                                </div>
                                {isLinked ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleUnlinkProcedureArticle(a.id)}
                                    disabled={procedureBusyId === a.id}
                                    className="pds-btn pds-btn--outline pds-btn--sm pds-focus"
                                  >
                                    {procedureBusyId === a.id ? "Working..." : "Unlink"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => void handleLinkProcedureArticle(a.id)}
                                    disabled={procedureBusyId === a.id}
                                    className="pds-btn pds-btn--primary pds-btn--sm pds-focus"
                                  >
                                    {procedureBusyId === a.id ? "Working..." : "Link"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : activeTab === "customer-satisfaction" ? (
              <div className="space-y-4">
                {!effectiveTicketId ? (
                  <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                    Save the ticket to submit customer satisfaction.
                  </div>
                ) : (
                  <>
                    {satisfactionError && (
                      <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                        {satisfactionError}
                      </div>
                    )}
                    {satisfactionSaveError && (
                      <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                        {satisfactionSaveError}
                      </div>
                    )}

                    <div className="pds-panel p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>Your rating</h3>
                        {avgSatisfaction !== null && (
                          <div className="text-xs pds-text-muted">
                            Average: {avgSatisfaction.toFixed(1)} / 5 ({satisfactionRows.length})
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setMyRating(n)}
                            className="p-1"
                            title={`${n}`}
                          >
                            <Star
                              size={18}
                              style={{
                                color: n <= myRating ? "var(--pds-warning)" : "var(--pds-text-muted)",
                              }}
                            />
                          </button>
                        ))}
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs pds-text-muted mb-1">Comment (optional)</label>
                        <textarea
                          value={myComment}
                          onChange={(e) => setMyComment(e.target.value)}
                          className="pds-input pds-focus w-full"
                          rows={3}
                        />
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleSaveSatisfaction()}
                          disabled={satisfactionSaving}
                          className="pds-btn pds-btn--primary pds-focus"
                        >
                          {satisfactionSaving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>

                    {satisfactionLoading && (
                      <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                        Loading ratings...
                      </div>
                    )}

                    {!satisfactionLoading && !satisfactionError && satisfactionRows.length === 0 && (
                      <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                        No ratings yet.
                      </div>
                    )}

                    {satisfactionRows.length > 0 && (
                      <div className="pds-panel p-4">
                        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>All ratings</h3>
                        <div className="space-y-2">
                          {satisfactionRows.map((r) => {
                            const who = r.user?.full_name ?? r.user?.email ?? "Unknown";
                            return (
                              <div key={r.id} className="pds-panel p-3" style={{ background: "var(--pds-surface-2)" }}>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{who}</div>
                                    <div className="text-xs pds-text-muted">{new Date(r.updated_at).toLocaleString()}</div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                      <Star
                                        key={n}
                                        size={14}
                                        style={{
                                          color: n <= r.rating ? "var(--pds-warning)" : "var(--pds-text-muted)",
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                                {r.comment && <div className="text-sm mt-2" style={{ color: "var(--pds-text)" }}>{r.comment}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : activeTab === "sla" ? (
              <div className="space-y-4">
                {!effectiveTicketId ? (
                  <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                    Save the ticket to view SLA.
                  </div>
                ) : (
                  <>
                    {slaError && (
                      <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                        {slaError}
                      </div>
                    )}

                    {slaLoading && (
                      <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                        Loading SLA...
                      </div>
                    )}

                    {!slaLoading && !ticketSla && (
                      <div className="pds-panel p-4">
                        <div className="text-sm" style={{ color: "var(--pds-text)" }}>No SLA is currently applied to this ticket.</div>
                        <button
                          type="button"
                          onClick={() => void handleApplySla()}
                          disabled={slaBusy}
                          className="pds-btn pds-btn--primary pds-focus mt-3"
                        >
                          {slaBusy ? "Applying..." : "Apply SLA"}
                        </button>
                      </div>
                    )}

                    {ticketSla && (
                      <>
                        <div className="pds-panel p-4">
                          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>SLA</h3>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="pds-text-muted">Policy:</span>{" "}
                              <span className="font-semibold" style={{ color: "var(--pds-text)" }}>{ticketSla.sla_policy?.name ?? ticketSla.sla_policy_id ?? "-"}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="pds-panel p-3" style={{ background: "var(--pds-surface-2)" }}>
                                <div className="text-xs pds-text-muted mb-1">First response</div>
                                <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>
                                  {ticketSla.first_response_at ? "Completed" : ticketSla.first_response_due_at ? formatCountdown(ticketSla.first_response_due_at) : "Not configured"}
                                </div>
                                <div className="text-xs pds-text-muted mt-1">
                                  Due: {ticketSla.first_response_due_at ? new Date(ticketSla.first_response_due_at).toLocaleString() : "-"}
                                </div>
                                <div className="text-xs pds-text-muted">
                                  At: {ticketSla.first_response_at ? new Date(ticketSla.first_response_at).toLocaleString() : "-"}
                                </div>
                                {ticketSla.first_response_breached && (
                                  <div className="mt-1 text-xs" style={{ color: "var(--pds-danger)" }}>
                                    Breached{ticketSla.first_response_breached_at ? ` at ${new Date(ticketSla.first_response_breached_at).toLocaleString()}` : ""}
                                  </div>
                                )}
                              </div>

                              <div className="pds-panel p-3" style={{ background: "var(--pds-surface-2)" }}>
                                <div className="text-xs pds-text-muted mb-1">Resolution</div>
                                <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>
                                  {ticketSla.resolved_at ? "Completed" : ticketSla.resolution_due_at ? formatCountdown(ticketSla.resolution_due_at) : "Not configured"}
                                </div>
                                <div className="text-xs pds-text-muted mt-1">
                                  Due: {ticketSla.resolution_due_at ? new Date(ticketSla.resolution_due_at).toLocaleString() : "-"}
                                </div>
                                <div className="text-xs pds-text-muted">
                                  At: {ticketSla.resolved_at ? new Date(ticketSla.resolved_at).toLocaleString() : "-"}
                                </div>
                                {ticketSla.resolution_breached && (
                                  <div className="mt-1 text-xs" style={{ color: "var(--pds-danger)" }}>
                                    Breached{ticketSla.resolution_breached_at ? ` at ${new Date(ticketSla.resolution_breached_at).toLocaleString()}` : ""}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex gap-2 justify-end">
                            {!ticketSla.first_response_at && (
                              <button
                                type="button"
                                onClick={() => void handleMarkFirstResponse()}
                                disabled={slaBusy}
                                className="pds-btn pds-btn--outline pds-focus"
                              >
                                {slaBusy ? "Working..." : "Mark first response"}
                              </button>
                            )}
                            {!ticketSla.resolved_at && (
                              <button
                                type="button"
                                onClick={() => void handleMarkResolved()}
                                disabled={slaBusy}
                                className="pds-btn pds-btn--primary pds-focus"
                              >
                                {slaBusy ? "Working..." : "Mark resolved"}
                              </button>
                            )}
                          </div>
                        </div>

                        {slaEvents.length > 0 && (
                          <div className="pds-panel p-4">
                            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>SLA events</h3>
                            <div className="space-y-2">
                              {slaEvents.map((e) => (
                                <div key={e.id} className="pds-panel p-3" style={{ background: "var(--pds-surface-2)" }}>
                                  <div className="flex items-start justify-between">
                                    <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{e.event_type}</div>
                                    <div className="text-xs pds-text-muted">{new Date(e.created_at).toLocaleString()}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            ) : activeTab === "links" ? (
              <div className="space-y-4">
                {!effectiveTicketId ? (
                  <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                    Save the ticket before adding links.
                  </div>
                ) : (
                  <>
                    {addLinkError && (
                      <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                        {addLinkError}
                      </div>
                    )}
                    {linksError && (
                      <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                        {linksError}
                      </div>
                    )}

                    <div className="pds-panel p-4">
                      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>Add link</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs pds-text-muted mb-1">Type</label>
                          <select
                            className="pds-input pds-focus w-full"
                            value={newLinkType}
                            onChange={(e) => setNewLinkType(e.target.value)}
                          >
                            <option value="relates_to">relates_to</option>
                            <option value="duplicates">duplicates</option>
                            <option value="blocks">blocks</option>
                            <option value="caused_by">caused_by</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs pds-text-muted mb-1">Target (ticket number or id)</label>
                          <input
                            type="text"
                            value={newLinkTarget}
                            onChange={(e) => setNewLinkTarget(e.target.value)}
                            className="pds-input pds-focus w-full"
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleAddLink()}
                          disabled={addLinkLoading}
                          className="pds-btn pds-btn--primary pds-focus"
                        >
                          {addLinkLoading ? "Adding..." : "Add"}
                        </button>
                      </div>
                    </div>

                    {linksLoading && (
                      <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                        Loading links...
                      </div>
                    )}

                    {!linksLoading && !linksError && links.length === 0 && (
                      <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                        No links yet.
                      </div>
                    )}

                    {links.length > 0 && (
                      <div className="pds-panel p-4">
                        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>Links ({links.length})</h3>
                        <div className="space-y-2">
                          {links.map((l) => {
                            const isFrom = l.from_ticket_id === effectiveTicketId;
                            const other = isFrom ? l.to_ticket : l.from_ticket;
                            const otherLabel = other ? `${other.ticket_number} ${other.title}` : (isFrom ? l.to_ticket_id : l.from_ticket_id);
                            return (
                              <div
                                key={l.id}
                                className="pds-panel flex items-start justify-between p-3"
                                style={{ background: "var(--pds-surface-2)" }}
                              >
                                <div>
                                  <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{otherLabel}</div>
                                  <div className="text-xs pds-text-muted">
                                    {l.link_type} · {new Date(l.created_at).toLocaleString()}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteLink(l.id)}
                                  disabled={deleteLinkBusyId === l.id}
                                  className="pds-btn pds-btn--outline pds-btn--sm pds-focus"
                                >
                                  {deleteLinkBusyId === l.id ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : activeTab === "time-registration" ? (
              <div className="space-y-4">
                {!effectiveTicketId ? (
                  <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                    Save the ticket before logging time.
                  </div>
                ) : (
                  <>
                    {addTimeError && (
                      <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                        {addTimeError}
                      </div>
                    )}

                    <div className="pds-panel p-4">
                      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>
                        Log time
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs pds-text-muted mb-1">Minutes</label>
                          <input
                            type="number"
                            min={1}
                            value={newTimeMinutes}
                            onChange={(e) => setNewTimeMinutes(e.target.value)}
                            className="pds-input pds-focus w-full"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs pds-text-muted mb-1">Note</label>
                          <input
                            type="text"
                            value={newTimeNote}
                            onChange={(e) => setNewTimeNote(e.target.value)}
                            className="pds-input pds-focus w-full"
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs pds-text-muted">
                          Total: {totalTimeHours}:{String(totalTimeRemainderMinutes).padStart(2, "0")}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleAddTimeEntry()}
                          disabled={addTimeLoading}
                          className="pds-btn pds-btn--primary pds-focus"
                        >
                          {addTimeLoading ? "Logging..." : "Log time"}
                        </button>
                      </div>
                    </div>

                    {timeEntriesError && (
                      <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                        {timeEntriesError}
                      </div>
                    )}

                    {timeEntriesLoading && (
                      <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                        Loading time entries...
                      </div>
                    )}

                    {!timeEntriesLoading && !timeEntriesError && timeEntries.length === 0 && (
                      <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                        No time entries yet.
                      </div>
                    )}

                    {timeEntries.length > 0 && (
                      <div className="pds-panel p-4">
                        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>
                          Time entries ({timeEntries.length})
                        </h3>
                        <div className="space-y-2">
                          {timeEntries.map((e) => {
                            const who = e.user?.full_name ?? e.user?.email ?? "Unknown";
                            return (
                              <div key={e.id} className="pds-panel p-3" style={{ background: "var(--pds-surface-2)" }}>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{who}</div>
                                    <div className="text-xs pds-text-muted">{new Date(e.created_at).toLocaleString()}</div>
                                  </div>
                                  <div className="text-sm font-semibold" style={{ color: "var(--pds-text)" }}>{e.minutes}m</div>
                                </div>
                                {e.note && (
                                  <div className="text-sm mt-2" style={{ color: "var(--pds-text)" }}>{e.note}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : activeTab === "attachments" ? (
              <div className="space-y-4">
                {/* Upload Area */}
                <div
                  className="pds-panel p-8"
                  style={{ borderStyle: "dashed", borderWidth: 2 }}
                >
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.txt,.xlsx"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload
                      size={48}
                      className="mb-3"
                      style={{ color: "var(--pds-text-muted)" }}
                    />
                    <p className="text-sm font-medium mb-1" style={{ color: "var(--pds-text)" }}>
                      Click to upload files
                    </p>
                    <p className="text-xs pds-text-muted">
                      or drag and drop
                    </p>
                    <p className="text-xs pds-text-muted mt-2">
                      Images, PDFs, Documents (Max 10MB each)
                    </p>
                  </label>
                </div>

                {/* Uploaded Files */}
                {attachmentsError && (
                  <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                    {attachmentsError}
                  </div>
                )}

                {attachmentsLoading && (
                  <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                    Loading attachments...
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="pds-panel p-4">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--pds-text)" }}>
                      Attachments ({attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {attachments.map((file) => (
                        <div
                          key={file.id}
                          className="pds-panel flex items-center justify-between p-3"
                          style={{ background: "var(--pds-surface-2)" }}
                        >
                          <div className="flex items-center gap-3">
                            {(file.mime_type ?? "").startsWith("image/") ? (
                              <div
                                className="w-12 h-12 rounded flex items-center justify-center"
                                style={{ background: "var(--pds-accent-soft)" }}
                              >
                                <ImageIcon
                                  size={20}
                                  style={{ color: "var(--pds-accent)" }}
                                />
                              </div>
                            ) : (
                              <div
                                className="w-12 h-12 rounded flex items-center justify-center"
                                style={{ background: "var(--pds-surface)" }}
                              >
                                <File
                                  size={20}
                                  style={{ color: "var(--pds-text-muted)" }}
                                />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium" style={{ color: "var(--pds-text)" }}>
                                {file.file_name}
                              </p>
                              <p className="text-xs pds-text-muted">
                                {formatBytes(file.size_bytes)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="pds-btn pds-btn--link pds-focus text-xs"
                              onClick={() => void openAttachment(file)}
                              disabled={attachmentsBusyId === file.id}
                            >
                              {attachmentsBusyId === file.id ? "Opening..." : "View"}
                            </button>
                            <button
                              className="pds-btn pds-btn--ghost pds-btn--icon pds-focus"
                              onClick={() => void removeFile(file.id)}
                              title="Remove file"
                              disabled={attachmentsBusyId === file.id}
                            >
                              <X
                                size={14}
                                style={{ color: "var(--pds-danger)" }}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!attachmentsLoading && !attachmentsError && attachments.length === 0 && (
                  <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                    No attachments yet.
                  </div>
                )}
              </div>
            ) : !isNewTicket ? (
              <div className="space-y-4">
                {(activeTab === "worklog" ? worklogsError : commentsError) && (
                  <div className="pds-panel px-4 py-3 text-sm" style={{ color: "var(--pds-danger)" }}>
                    {activeTab === "worklog" ? worklogsError : commentsError}
                  </div>
                )}

                {(activeTab === "worklog" ? worklogsLoading : commentsLoading) && (
                  <div className="pds-panel px-4 py-3 text-sm pds-text-muted">
                    Loading...
                  </div>
                )}

                {activeTab === "worklog" ? (
                  worklogs.map((w) => {
                    const authorLabel = w.actor?.full_name ?? w.actor?.email ?? "Unknown";
                    const message = (w.payload?.message as string | undefined) ?? "";
                    const isInternal = Boolean(w.payload?.is_internal);
                    return (
                      <div
                        key={w.id}
                        className="pds-panel p-3"
                        style={
                          isInternal
                            ? {
                                borderLeftWidth: 4,
                                borderLeftStyle: "solid",
                                borderLeftColor: "var(--pds-accent)",
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--pds-surface-2)" }}>
                              <UserIcon size={16} style={{ color: "var(--pds-text-muted)" }} />
                            </div>
                            <div>
                              <div className="font-semibold text-sm" style={{ color: "var(--pds-text)" }}>
                                {authorLabel}
                              </div>
                              {isInternal && (
                                <span className="text-xs pds-text-muted">
                                  Invisible to caller
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs pds-text-muted">
                            {new Date(w.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--pds-text)" }}>{message}</p>
                      </div>
                    );
                  })
                ) : (
                  comments.map((c) => {
                    const authorLabel = c.author?.full_name ?? c.author?.email ?? "Unknown";
                    const isInternal = Boolean(c.is_internal);
                    return (
                      <div
                        key={c.id}
                        className="pds-panel p-3"
                        style={
                          isInternal
                            ? {
                                borderLeftWidth: 4,
                                borderLeftStyle: "solid",
                                borderLeftColor: "var(--pds-accent)",
                              }
                            : { background: "var(--pds-surface-2)" }
                        }
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--pds-surface)" }}>
                              <UserIcon size={16} style={{ color: "var(--pds-text-muted)" }} />
                            </div>
                            <div>
                              <div className="font-semibold text-sm" style={{ color: "var(--pds-text)" }}>
                                {authorLabel}
                              </div>
                              {isInternal && (
                                <span className="text-xs pds-text-muted">
                                  Invisible to caller
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs pds-text-muted">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--pds-text)" }}>{c.body}</p>
                      </div>
                    );
                  })
                )}

                {!commentsLoading && !commentsError && activeTab !== "worklog" && comments.length === 0 && (
                  <div className="text-center pds-text-muted py-8">No messages yet.</div>
                )}
                {!worklogsLoading && !worklogsError && activeTab === "worklog" && worklogs.length === 0 && (
                  <div className="text-center pds-text-muted py-8">No worklog entries yet.</div>
                )}
              </div>
            ) : (
              <div className="text-center pds-text-muted py-8">
                Enter ticket details in the form on the left
              </div>
            )}
          </div>

          {/* Message Input */}
          <div
            className="pds-panel p-3 flex-shrink-0"
            style={{ borderLeft: "none", borderRight: "none", borderBottom: "none", borderRadius: 0 }}
          >
            {/* Helper Tools Bar */}
            <div className="pds-subtoolbar mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKnowledgeBase(!showKnowledgeBase)}
                  className="pds-btn pds-btn--secondary pds-btn--sm pds-focus"
                  type="button"
                >
                  <BookOpen size={14} style={{ color: "var(--pds-accent)" }} />
                  Knowledge Base
                </button>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="pds-btn pds-btn--secondary pds-btn--sm pds-focus"
                  type="button"
                >
                  <MessageSquare size={14} style={{ color: "var(--pds-accent)" }} />
                  Templates ({savedTemplates.length}/5)
                </button>
              </div>
            </div>

            {/* Knowledge Base Panel */}
            {showKnowledgeBase && (
              <div className="mb-3 pds-panel p-3" style={{ borderColor: "color-mix(in srgb, var(--pds-accent) 22%, var(--pds-border))", background: "var(--pds-accent-soft)" }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--pds-text)" }}>
                    <BookOpen size={16} style={{ color: "var(--pds-accent)" }} />
                    Knowledge Base Search
                  </h4>
                  <button
                    onClick={() => setShowKnowledgeBase(false)}
                    className="pds-btn pds-btn--ghost pds-btn--icon pds-focus"
                    type="button"
                  >
                    <X size={14} style={{ color: "var(--pds-text-muted)" }} />
                  </button>
                </div>
                
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-2 top-2.5" style={{ color: "var(--pds-text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search knowledge base articles..."
                    value={kbSearchQuery}
                    onChange={(e) => setKbSearchQuery(e.target.value)}
                    className="pds-input pds-focus w-full pl-8"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {kbError && (
                    <div className="text-center py-4 text-xs" style={{ color: "var(--pds-danger)" }}>{kbError}</div>
                  )}

                  {kbLoading && (
                    <div className="text-center py-4 text-xs pds-text-muted">Loading...</div>
                  )}

                  {!kbLoading && !kbError && kbArticles.length > 0 ? (
                    kbArticles.map((article) => (
                      <div
                        key={article.id}
                        className="pds-panel p-2 cursor-pointer"
                        style={{ background: "var(--pds-surface)" }}
                        onClick={() => {
                          handleUseKbArticle(article);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-semibold" style={{ color: "var(--pds-text)" }}>
                              {article.title}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--pds-text)" }}>
                              {article.body.length > 120 ? `${article.body.slice(0, 120)}...` : article.body}
                            </p>
                          </div>
                          {article.tags?.[0] && (
                            <span className="text-xs pds-text-muted px-2 py-0.5 rounded ml-2 whitespace-nowrap" style={{ background: "var(--pds-surface-2)" }}>
                              {article.tags[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs pds-text-muted">
                            Updated {new Date(article.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs pds-text-muted">
                      No articles found
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Message Templates Panel */}
            {showTemplates && (
              <div className="mb-3 pds-panel p-3" style={{ borderColor: "color-mix(in srgb, var(--pds-accent) 22%, var(--pds-border))", background: "var(--pds-surface-2)" }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--pds-text)" }}>
                    <MessageSquare size={16} style={{ color: "var(--pds-accent)" }} />
                    Quick Message Templates
                  </h4>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="pds-btn pds-btn--ghost pds-btn--icon pds-focus"
                    type="button"
                  >
                    <X size={14} style={{ color: "var(--pds-text-muted)" }} />
                  </button>
                </div>

                {templatesError && (
                  <div className="mb-2 pds-panel px-3 py-2 text-xs" style={{ background: "var(--pds-surface)", color: "var(--pds-danger)" }}>
                    {templatesError}
                  </div>
                )}

                {templatesLoading && (
                  <div className="mb-2 pds-panel px-3 py-2 text-xs pds-text-muted" style={{ background: "var(--pds-surface)" }}>
                    Loading templates...
                  </div>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto mb-2">
                  {savedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="pds-panel p-2"
                      style={{ background: "var(--pds-surface)" }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-semibold" style={{ color: "var(--pds-text)" }}>
                          {template.name}
                        </p>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="pds-btn pds-btn--ghost pds-btn--icon pds-focus"
                          type="button"
                          title="Delete template"
                          disabled={templatesBusyId === template.id}
                        >
                          <Trash2 size={12} style={{ color: "var(--pds-danger)" }} />
                        </button>
                      </div>
                      <p className="text-xs mb-2" style={{ color: "var(--pds-text)" }}>
                        {template.content}
                      </p>
                      <button
                        onClick={() => handleInsertTemplate(template)}
                        className="pds-btn pds-btn--link pds-focus text-xs"
                        type="button"
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Template */}
                {savedTemplates.length < 5 && (
                  <div className="pt-2 mt-2" style={{ borderTop: "1px solid var(--pds-border)" }}>
                    {editingTemplate === "new" ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Template name..."
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          className="pds-input pds-focus w-full"
                        />
                        <textarea
                          placeholder="Template content..."
                          value={newTemplateContent}
                          onChange={(e) => setNewTemplateContent(e.target.value)}
                          className="pds-input pds-focus w-full resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleSaveNewTemplate()}
                            className="pds-btn pds-btn--primary pds-btn--sm pds-focus"
                            type="button"
                            disabled={templatesLoading}
                          >
                            {templatesLoading ? "Saving..." : "Save Template"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(null);
                              setNewTemplateName("");
                              setNewTemplateContent("");
                            }}
                            className="pds-btn pds-btn--outline pds-btn--sm pds-focus"
                            type="button"
                            disabled={templatesLoading}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingTemplate("new")}
                        className="pds-btn pds-btn--outline pds-focus w-full"
                        style={{ borderStyle: "dashed" }}
                        type="button"
                      >
                        <Plus size={14} />
                        Add New Template
                      </button>
                    )}
                  </div>
                )}

                {savedTemplates.length >= 5 && (
                  <p className="text-xs pds-text-muted text-center mt-2 italic">
                    Maximum templates reached (5/5). Delete one to add new.
                  </p>
                )}
              </div>
            )}

            {sendError && (
              <div className="mb-2 text-xs" style={{ color: "var(--pds-danger)" }}>{sendError}</div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <div className="pds-segmented">
                <button
                  type="button"
                  onClick={() => setComposerMode("message")}
                  className="pds-segment pds-focus"
                  data-active={composerMode === "message"}
                  disabled={activeTab === "worklog"}
                  title={activeTab === "worklog" ? "Switch to a non-worklog tab to send messages" : undefined}
                >
                  Message
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode("worklog")}
                  className="pds-segment pds-focus"
                  data-active={composerMode === "worklog"}
                >
                  Worklog
                </button>
              </div>

              <div className="text-xs pds-text-muted">
                {composerMode === "worklog" ? "Internal log entry" : "Message thread"}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="invisible"
                className="rounded pds-focus"
                checked={invisibleToCaller}
                onChange={(e) => setInvisibleToCaller(e.target.checked)}
              />
              <label
                htmlFor="invisible"
                className="text-xs"
                style={{ color: "var(--pds-text)" }}
              >
                Make invisible to caller
              </label>
            </div>
            <textarea
              placeholder={
                composerMode === "worklog"
                  ? "Add a worklog entry..."
                  : "Type your message here..."
              }
              className="pds-input pds-focus w-full resize-none"
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                className="pds-btn pds-btn--link pds-focus text-xs disabled:opacity-50"
                onClick={() => void copyText(messageText)}
                disabled={!messageText.trim()}
              >
                <Copy size={12} />
                Copy
              </button>
              <button
                className="pds-btn pds-btn--primary pds-focus"
                onClick={() => void handleSend()}
                disabled={sendLoading || !messageText.trim()}
                type="button"
              >
                {sendLoading
                  ? "Sending..."
                  : composerMode === "worklog"
                    ? "Log"
                    : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}