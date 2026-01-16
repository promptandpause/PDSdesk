import { useCallback, useEffect, useMemo, useState } from "react";
import {
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  Shield,
  Save,
  Upload,
  Database,
  Users as UsersIcon,
  Zap,
  Settings as SettingsIcon,
  UserCog,
} from "lucide-react";
import { OperatorGroupsManager } from "../admin/OperatorGroupsManager";
import { TicketRoutingRulesManager } from "../admin/TicketRoutingRulesManager";
import { useAuth } from "../../lib/auth/AuthProvider";
import { getSupabaseClient } from "../../lib/supabaseClient";

// TODO: Fetch user settings from Supabase
export function SettingsView() {
  const { user: authUser, profile, isGlobalAdmin, isInOperatorGroup, hasRole } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [activeSection, setActiveSection] = useState("profile");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const canManageSystemSettings = isGlobalAdmin || isInOperatorGroup("it_services");
  const canManageUsers = isGlobalAdmin || hasRole("service_desk_admin");

  const canShowSaveButton =
    activeSection === "profile" ||
    activeSection === "notifications" ||
    activeSection === "display" ||
    activeSection === "privacy" ||
    activeSection === "system" ||
    activeSection === "ai-settings";

  const [userMgmtQuery, setUserMgmtQuery] = useState("");
  const [userMgmtLoading, setUserMgmtLoading] = useState(false);
  const [userMgmtSyncing, setUserMgmtSyncing] = useState(false);
  const [userMgmtError, setUserMgmtError] = useState<string | null>(null);
  const [userMgmtNotice, setUserMgmtNotice] = useState<string | null>(null);
  const [userMgmtReloadToken, setUserMgmtReloadToken] = useState(0);

  const [userMgmtSortKey, setUserMgmtSortKey] = useState<"name" | "email" | "department" | "status">("name");
  const [userMgmtSortDir, setUserMgmtSortDir] = useState<"asc" | "desc">("asc");

  const [directoryUsers, setDirectoryUsers] = useState<
    Array<{
      azure_ad_id: string;
      email: string | null;
      full_name: string | null;
      department: string | null;
      job_title: string | null;
      account_enabled: boolean | null;
      last_synced_at: string;
    }>
  >([]);

  const [profilesByAzureId, setProfilesByAzureId] = useState<
    Record<
      string,
      {
        id: string;
        email: string | null;
        full_name: string | null;
        department: string | null;
        job_title: string | null;
      }
    >
  >({});

  const [rolesByProfileId, setRolesByProfileId] = useState<Record<string, string[]>>({});
  const [operatorGroups, setOperatorGroups] = useState<Array<{ id: string; group_key: string; name: string }>>(
    [],
  );
  const [operatorGroupIdsByKey, setOperatorGroupIdsByKey] = useState<Record<string, string>>({});
  const [operatorGroupsByProfileId, setOperatorGroupsByProfileId] = useState<Record<string, string[]>>({});

  const trimmedUserMgmtQuery = useMemo(() => userMgmtQuery.trim(), [userMgmtQuery]);

  const displayedDirectoryUsers = useMemo(() => {
    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
    const dir = userMgmtSortDir === "asc" ? 1 : -1;

    const valueFor = (du: (typeof directoryUsers)[number]) => {
      const linkedProfile = profilesByAzureId[du.azure_ad_id];
      const name = (linkedProfile?.full_name ?? du.full_name ?? "").trim();
      const email = (linkedProfile?.email ?? du.email ?? "").trim();
      const department = (linkedProfile?.department ?? du.department ?? "").trim();
      const status = du.account_enabled === false ? 1 : 0;
      return { name, email, department, status };
    };

    return [...directoryUsers].sort((a, b) => {
      const va = valueFor(a);
      const vb = valueFor(b);

      if (userMgmtSortKey === "status") {
        const na = va.status;
        const nb = vb.status;
        if (na !== nb) return (na - nb) * dir;
      } else {
        const sa = va[userMgmtSortKey];
        const sb = vb[userMgmtSortKey];
        const aEmpty = !sa;
        const bEmpty = !sb;
        if (aEmpty !== bEmpty) return (aEmpty ? 1 : -1) * dir;
        const cmp = collator.compare(sa, sb);
        if (cmp !== 0) return cmp * dir;
      }

      const fallbackA = (va.name || va.email || a.azure_ad_id || "").trim();
      const fallbackB = (vb.name || vb.email || b.azure_ad_id || "").trim();
      return collator.compare(fallbackA, fallbackB);
    });
  }, [directoryUsers, profilesByAzureId, userMgmtSortDir, userMgmtSortKey]);

  const toggleUserMgmtSort = (key: "name" | "email" | "department" | "status") => {
    setUserMgmtSortKey((prevKey) => {
      if (prevKey !== key) {
        setUserMgmtSortDir("asc");
        return key;
      }
      setUserMgmtSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
      return prevKey;
    });
  };

  const userMgmtSortIndicator = (key: "name" | "email" | "department" | "status") => {
    if (userMgmtSortKey !== key) return "";
    return userMgmtSortDir === "asc" ? " ▲" : " ▼";
  };

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [supportEmail, setSupportEmail] = useState("");
  const [noReplyEmail, setNoReplyEmail] = useState("");
  const [businessStartTime, setBusinessStartTime] = useState("");
  const [businessEndTime, setBusinessEndTime] = useState("");
  const [workingDays, setWorkingDays] = useState<string[]>([]);

  const [systemSettingsLoading, setSystemSettingsLoading] = useState(false);
  const [systemSettingsError, setSystemSettingsError] = useState<string | null>(null);

  const [aiSettingsLoading, setAiSettingsLoading] = useState(false);
  const [aiSettingsSaving, setAiSettingsSaving] = useState(false);
  const [aiSettingsError, setAiSettingsError] = useState<string | null>(null);

  const [aiAutoAssignmentEnabled, setAiAutoAssignmentEnabled] = useState(false);
  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [openAiModel, setOpenAiModel] = useState("gpt-4o-mini");
  const [autoAssignAvailableAgentsEnabled, setAutoAssignAvailableAgentsEnabled] = useState(false);
  const [crossDepartmentWorkflowsEnabled, setCrossDepartmentWorkflowsEnabled] = useState(false);

  const [aiDefaultAssignmentStrategy, setAiDefaultAssignmentStrategy] = useState<
    "manual" | "ai_auto" | "round_robin"
  >("manual");
  const [aiAutomationScope, setAiAutomationScope] = useState<"all" | "selected">("all");
  const [aiEnabledQueueGroupKeys, setAiEnabledQueueGroupKeys] = useState<string[]>([]);

  const [settings, setSettings] = useState({
    emailNotifications: true,
    browserNotifications: true,
    ticketAssigned: true,
    ticketEscalated: true,
    ticketUpdated: true,
    slaWarnings: true,
    theme: "light",
    language: "en-GB",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    showOnlineStatus: true,
    allowDirectMessages: true,
  });

  const settingsStorageKey = useMemo(() => {
    const id = authUser?.id?.trim();
    return id ? `pdsdesk.settings.${id}` : "pdsdesk.settings";
  }, [authUser?.id]);

  useEffect(() => {
    const nextEmail = (profile?.email ?? authUser?.email ?? "").trim();
    const nextName =
      (profile?.full_name ??
        (authUser?.user_metadata?.full_name as string | undefined) ??
        (authUser?.user_metadata?.name as string | undefined) ??
        ""
      ).trim();

    setEmail(nextEmail);
    setDisplayName(nextName);
  }, [authUser?.email, authUser?.user_metadata, profile?.email, profile?.full_name]);

  const initials = useMemo(() => {
    const source = (displayName || email).trim();
    if (!source) return "";
    const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
    if (parts.length === 0) return "";
    return parts.map((p) => (p[0] ?? "").toUpperCase()).join("");
  }, [displayName, email]);

  const [firstName, surname] = useMemo(() => {
    const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return ["", ""];
    const [first, ...rest] = parts;
    return [first ?? "", rest.join(" ")];
  }, [displayName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(settingsStorageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (!parsed || typeof parsed !== "object") return;
      setSettings((prev) => ({
        ...prev,
        ...(parsed as Record<string, unknown>),
      }));
    } catch {
      // ignore
    }
  }, [settingsStorageKey]);

  const handleSave = async () => {
    if (activeSection === "system") {
      if (!canManageSystemSettings) return;

      setSystemSettingsError(null);

      const value = {
        support_email: supportEmail.trim(),
        no_reply_email: noReplyEmail.trim(),
        business_hours: {
          start_time: businessStartTime,
          end_time: businessEndTime,
          working_days: workingDays,
        },
      };

      const { error } = await supabase
        .from("app_settings")
        .upsert(
          {
            setting_key: "system",
            value,
            updated_by: authUser?.id ?? null,
          },
          { onConflict: "setting_key" },
        );

      if (error) {
        setSystemSettingsError(error.message);
        return;
      }

      setSaveNotice("Saved.");
      return;
    }

    if (activeSection === "ai-settings") {
      if (!isGlobalAdmin) return;

      setAiSettingsError(null);
      setAiSettingsSaving(true);

      const value = {
        ai_auto_assignment_enabled: !!aiAutoAssignmentEnabled,
        openai_model: openAiModel,
        auto_assign_available_agents_enabled: !!autoAssignAvailableAgentsEnabled,
        cross_department_workflows_enabled: !!crossDepartmentWorkflowsEnabled,
        default_assignment_strategy: aiDefaultAssignmentStrategy,
        automation_scope: aiAutomationScope,
        enabled_queue_group_keys:
          aiAutomationScope === "selected" ? aiEnabledQueueGroupKeys : [],
      };

      const { error } = await supabase
        .from("app_settings")
        .upsert(
          {
            setting_key: "ai",
            value,
            updated_by: authUser?.id ?? null,
          },
          { onConflict: "setting_key" },
        );

      setAiSettingsSaving(false);

      if (error) {
        setAiSettingsError(error.message);
        return;
      }

      setSaveNotice("Saved.");
      return;
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
      } catch {
        // ignore
      }
    }
    setSaveNotice("Saved.");
  };

  useEffect(() => {
    let cancelled = false;

    async function loadSystemSettings() {
      if (!canManageSystemSettings) return;
      if (activeSection !== "system") return;

      setSystemSettingsLoading(true);
      setSystemSettingsError(null);

      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_key,value")
        .eq("setting_key", "system")
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setSystemSettingsError(error.message);
        setSystemSettingsLoading(false);
        return;
      }

      const value = (data as any)?.value as any;
      setSupportEmail((value?.support_email ?? "").toString());
      setNoReplyEmail((value?.no_reply_email ?? "").toString());
      setBusinessStartTime((value?.business_hours?.start_time ?? "").toString());
      setBusinessEndTime((value?.business_hours?.end_time ?? "").toString());
      setWorkingDays(
        Array.isArray(value?.business_hours?.working_days)
          ? (value.business_hours.working_days as string[])
          : [],
      );

      setSystemSettingsLoading(false);
    }

    loadSystemSettings();

    return () => {
      cancelled = true;
    };
  }, [activeSection, canManageSystemSettings, supabase]);

  const refreshOperatorGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from("operator_groups")
      .select("id,group_key,name")
      .order("name", { ascending: true });

    if (error) return;

    const rows = (data ?? []) as Array<{ id: string; group_key: string; name: string }>;
    setOperatorGroups(rows);
    const next: Record<string, string> = {};
    for (const r of rows) next[r.group_key] = r.id;
    setOperatorGroupIdsByKey(next);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function loadAiSettings() {
      if (!isGlobalAdmin) return;
      if (activeSection !== "ai-settings") return;

      setAiSettingsLoading(true);
      setAiSettingsError(null);

      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_key,value")
        .eq("setting_key", "ai")
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setAiSettingsError(error.message);
        setAiSettingsLoading(false);
        return;
      }

      const value = (data as any)?.value as any;
      setAiAutoAssignmentEnabled(!!value?.ai_auto_assignment_enabled);
      if (typeof value?.openai_model === "string" && value.openai_model.trim()) {
        setOpenAiModel(value.openai_model);
      }
      setAutoAssignAvailableAgentsEnabled(!!value?.auto_assign_available_agents_enabled);
      setCrossDepartmentWorkflowsEnabled(!!value?.cross_department_workflows_enabled);

      const nextStrategy = (value?.default_assignment_strategy ?? "manual") as string;
      if (nextStrategy === "manual" || nextStrategy === "ai_auto" || nextStrategy === "round_robin") {
        setAiDefaultAssignmentStrategy(nextStrategy);
      } else {
        setAiDefaultAssignmentStrategy("manual");
      }

      const nextScope = (value?.automation_scope ?? "all") as string;
      if (nextScope === "all" || nextScope === "selected") {
        setAiAutomationScope(nextScope);
      } else {
        setAiAutomationScope("all");
      }

      const rawEnabled = value?.enabled_queue_group_keys;
      setAiEnabledQueueGroupKeys(Array.isArray(rawEnabled) ? rawEnabled.filter((k: any) => typeof k === "string") : []);

      setAiSettingsLoading(false);
    }

    loadAiSettings();

    return () => {
      cancelled = true;
    };
  }, [activeSection, isGlobalAdmin, supabase]);

  useEffect(() => {
    if (!isGlobalAdmin) return;
    if (activeSection !== "ai-settings") return;
    void refreshOperatorGroups();
  }, [activeSection, isGlobalAdmin, refreshOperatorGroups]);

  useEffect(() => {
    if (!saveNotice) return;
    const t = window.setTimeout(() => setSaveNotice(null), 2000);
    return () => window.clearTimeout(t);
  }, [saveNotice]);

  useEffect(() => {
    if (!userMgmtNotice && !userMgmtError) return;
    const t = window.setTimeout(() => {
      setUserMgmtNotice(null);
      setUserMgmtError(null);
    }, 4000);
    return () => window.clearTimeout(t);
  }, [userMgmtError, userMgmtNotice]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      if (!canManageUsers) return;
      if (activeSection !== "user-management") return;

      setUserMgmtLoading(true);
      setUserMgmtError(null);

      const q = userMgmtQuery.trim();
      const query = supabase
        .from("directory_users")
        .select("azure_ad_id,email,full_name,department,job_title,account_enabled,last_synced_at")
        .order("full_name", { ascending: true })
        .limit(200);

      const withFilter = q
        ? query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        : query;

      const { data, error } = await withFilter;
      if (cancelled) return;

      if (error) {
        setUserMgmtError(error.message);
        setDirectoryUsers([]);
        setProfilesByAzureId({});
        setRolesByProfileId({});
        setUserMgmtLoading(false);
        return;
      }

      const rows = (data ?? []) as typeof directoryUsers;
      setDirectoryUsers(rows);

      const azureIds = rows.map((r) => r.azure_ad_id).filter(Boolean);
      if (azureIds.length === 0) {
        setProfilesByAzureId({});
        setRolesByProfileId({});
        setUserMgmtLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,email,full_name,department,job_title,azure_ad_id")
        .in("azure_ad_id", azureIds);

      if (cancelled) return;

      if (profilesError) {
        setUserMgmtError(profilesError.message);
        setProfilesByAzureId({});
        setRolesByProfileId({});
        setUserMgmtLoading(false);
        return;
      }

      const profileRows = (profiles ?? []) as Array<{
        id: string;
        email: string | null;
        full_name: string | null;
        department: string | null;
        job_title: string | null;
        azure_ad_id: string | null;
      }>;

      const nextProfilesByAzureId: Record<string, any> = {};
      const profileIds: string[] = [];
      for (const p of profileRows) {
        if (!p.azure_ad_id) continue;
        nextProfilesByAzureId[p.azure_ad_id] = {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          department: p.department,
          job_title: p.job_title,
        };
        profileIds.push(p.id);
      }
      setProfilesByAzureId(nextProfilesByAzureId);

      if (profileIds.length === 0) {
        setRolesByProfileId({});
        setOperatorGroupsByProfileId({});
        setUserMgmtLoading(false);
        return;
      }

      const { data: roleRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id,role_key")
        .in("user_id", profileIds);

      if (cancelled) return;

      if (rolesError) {
        setUserMgmtError(rolesError.message);
        setRolesByProfileId({});
        setOperatorGroupsByProfileId({});
        setUserMgmtLoading(false);
        return;
      }

      const nextRoles: Record<string, string[]> = {};
      for (const r of (roleRows ?? []) as Array<{ user_id: string; role_key: string }>) {
        nextRoles[r.user_id] = [...(nextRoles[r.user_id] ?? []), r.role_key];
      }
      setRolesByProfileId(nextRoles);

      const { data: membershipRows, error: membershipsError } = await supabase
        .from("operator_group_members")
        .select("user_id,group:operator_groups(group_key)")
        .in("user_id", profileIds)
        .limit(2000);

      if (cancelled) return;

      if (membershipsError) {
        setUserMgmtError(membershipsError.message);
        setOperatorGroupsByProfileId({});
        setUserMgmtLoading(false);
        return;
      }

      const nextGroupsByUser: Record<string, string[]> = {};
      for (const row of (membershipRows ?? []) as any[]) {
        const uid = row?.user_id as string | undefined;
        if (!uid) continue;
        const g = row?.group;
        const k = (Array.isArray(g) ? g[0]?.group_key : g?.group_key) as string | undefined;
        if (!k) continue;
        nextGroupsByUser[uid] = [...(nextGroupsByUser[uid] ?? []), k];
      }
      setOperatorGroupsByProfileId(nextGroupsByUser);
      setUserMgmtLoading(false);
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [activeSection, canManageUsers, supabase, userMgmtQuery, userMgmtReloadToken]);

  useEffect(() => {
    let cancelled = false;

    async function loadOperatorGroups() {
      if (!canManageUsers) return;
      if (activeSection !== "user-management") return;

      await refreshOperatorGroups();
      if (cancelled) return;
    }

    loadOperatorGroups();

    return () => {
      cancelled = true;
    };
  }, [activeSection, canManageUsers, refreshOperatorGroups]);

  const syncDirectoryUsers = async () => {
    if (!isGlobalAdmin) return;
    setUserMgmtSyncing(true);
    setUserMgmtError(null);
    setUserMgmtNotice(null);
    try {
      const { data, error } = await supabase.functions.invoke("graph-directory-sync", { body: {} });
      if (error) {
        let message = error.message;
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            const bodyError = (body as any)?.error;
            const bodyDetails = (body as any)?.details;
            if (typeof bodyError === "string" && bodyError.trim()) {
              message = bodyDetails ? `${bodyError}: ${bodyDetails}` : bodyError;
            }
          } catch {}
        }
        setUserMgmtError(message);
        setUserMgmtSyncing(false);
        return;
      }
      const count = (data as any)?.count as number | undefined;
      setUserMgmtNotice(typeof count === "number" ? `Synced ${count} users from Azure AD.` : "Synced users from Azure AD.");
      setUserMgmtSyncing(false);
      setUserMgmtReloadToken((v) => v + 1);
    } catch (e) {
      setUserMgmtError(e instanceof Error ? e.message : String(e));
      setUserMgmtSyncing(false);
    }
  };

  const setSingleRole = async (userId: string, roleKey: string) => {
    if (!canManageUsers) return;
    if (!userId) return;
    if (userId === authUser?.id) {
      setUserMgmtError("You cannot change your own role here.");
      return;
    }

    setUserMgmtError(null);
    setUserMgmtNotice(null);

    const { error: rpcErr } = await supabase.rpc("set_user_primary_role", {
      target_user_id: userId,
      new_role_key: roleKey,
    });

    if (rpcErr) {
      setUserMgmtError(rpcErr.message);
      return;
    }

    setUserMgmtNotice("Role updated.");
    setUserMgmtReloadToken((v) => v + 1);
  };

  const toggleAiEnabledQueue = useCallback((groupKey: string) => {
    setAiEnabledQueueGroupKeys((prev) => {
      if (prev.includes(groupKey)) return prev.filter((k) => k !== groupKey);
      return [...prev, groupKey];
    });
  }, []);

  const toggleUserOperatorGroup = async (userId: string, groupKey: string) => {
    if (!canManageUsers) return;
    if (!userId) return;

    const targetRoles = rolesByProfileId[userId] ?? [];
    if (targetRoles.includes("global_admin") && !isGlobalAdmin) {
      setUserMgmtError("Only global admins can change operator groups for a global admin user.");
      return;
    }

    const groupId = operatorGroupIdsByKey[groupKey];
    if (!groupId) return;

    setUserMgmtError(null);
    setUserMgmtNotice(null);

    const current = operatorGroupsByProfileId[userId] ?? [];
    const isMember = current.includes(groupKey);

    if (isMember) {
      const { error } = await supabase
        .from("operator_group_members")
        .delete()
        .eq("user_id", userId)
        .eq("group_id", groupId);
      if (error) {
        setUserMgmtError(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("operator_group_members")
        .insert({ user_id: userId, group_id: groupId });
      if (error) {
        setUserMgmtError(error.message);
        return;
      }
    }

    setUserMgmtNotice("Groups updated.");
    setUserMgmtReloadToken((v) => v + 1);
  };

  const baseSections = [
    { id: "profile", icon: User, label: "Profile" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    {
      id: "display",
      icon: Palette,
      label: "Display & Language",
    },
    {
      id: "privacy",
      icon: Shield,
      label: "Privacy & Security",
    },
  ];

  const adminSections = [
    ...(canManageSystemSettings
      ? [
          {
            id: "system",
            icon: Database,
            label: "System Settings",
            adminOnly: true,
          },
        ]
      : []),
    ...(canManageUsers
      ? [
          {
            id: "user-management",
            icon: UsersIcon,
            label: "User Management",
            adminOnly: true,
          },
        ]
      : []),
    ...(isGlobalAdmin
      ? [
          {
            id: "operator-groups",
            icon: UserCog,
            label: "Operator Groups",
            adminOnly: true,
          },
          {
            id: "queue-management",
            icon: SettingsIcon,
            label: "Queue Management",
            adminOnly: true,
          },
          {
            id: "ai-settings",
            icon: Zap,
            label: "AI & Automation",
            adminOnly: true,
          },
        ]
      : []),
  ];

  const sections = [...baseSections, ...adminSections];

  useEffect(() => {
    if (sections.some((s) => s.id === activeSection)) return;
    setActiveSection("profile");
  }, [activeSection, sections]);

  return (
    <div className="pds-page flex-1">
      {/* Header */}
      <div className="pds-page-header px-4 py-3 flex items-center justify-between">
        <h2 className="pds-page-title">
          Settings
        </h2>
        {saveNotice && (
          <div className="mr-3 text-sm" style={{ color: "var(--pds-success)" }}>
            {saveNotice}
          </div>
        )}
        {canShowSaveButton && (
          <button
            onClick={handleSave}
            disabled={
              (activeSection === "system" && !canManageSystemSettings) ||
              (activeSection === "system" && systemSettingsLoading) ||
              (activeSection === "ai-settings" && (!isGlobalAdmin || aiSettingsLoading || aiSettingsSaving))
            }
            className="pds-btn pds-btn--primary pds-focus"
            type="button"
          >
            <Save size={16} />
            Save Changes
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-[#f9f9f9] border-r border-gray-300 overflow-y-auto">
          <div className="p-4">
            {baseSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-colors mb-1 ${
                  activeSection === section.id
                    ? "bg-[#4a9eff] text-white"
                    : "text-[#2d3e50] hover:bg-gray-200"
                }`}
              >
                <section.icon size={18} />
                {section.label}
              </button>
            ))}

            {adminSections.length > 0 && (
              <div className="mt-4 mb-2 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Administration
              </div>
            )}

            {adminSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-colors mb-1 ${
                  activeSection === section.id
                    ? "bg-[#4a9eff] text-white"
                    : "text-[#2d3e50] hover:bg-gray-200"
                }`}
              >
                <section.icon size={18} />
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === "profile" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#2d3e50] mb-4">
                  Profile Information
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Update your personal information. Some fields
                  are synced from Microsoft Azure AD and cannot
                  be edited here.
                </p>

                <div className="bg-white border border-gray-300 rounded p-4">

                {/* Avatar Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#2d3e50] mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-[#4a9eff] flex items-center justify-center text-white text-2xl font-semibold">
                      {initials || "U"}
                    </div>
                    <button className="px-4 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <Upload size={16} />
                      Upload New Photo
                    </button>
                  </div>
                </div>

                {/* Synced from Microsoft */}
                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Managed by your identity provider
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Surname
                    </label>
                    <input
                      type="text"
                      value={surname}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Business Phone
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    />
                  </div>
                </div>

                </div>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#2d3e50] mb-4">
                  Notification Preferences
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Choose how you want to be notified about
                  updates and changes.
                </p>

                <div className="bg-white border border-gray-300 rounded">

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-300 rounded">
                    <div>
                      <div className="font-medium text-sm text-[#2d3e50]">
                        Email Notifications
                      </div>
                      <div className="text-xs text-gray-600">
                        Receive notifications via email
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            emailNotifications:
                              e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a9eff]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-300 rounded">
                    <div>
                      <div className="font-medium text-sm text-[#2d3e50]">
                        Browser Notifications
                      </div>
                      <div className="text-xs text-gray-600">
                        Show desktop notifications
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.browserNotifications}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            browserNotifications:
                              e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a9eff]"></div>
                    </label>
                  </div>

                  <div className="border-t border-gray-300 pt-4 mt-6">
                    <h4 className="font-medium text-sm text-[#2d3e50] mb-4">
                      Notification Types
                    </h4>

                    <div className="space-y-3">
                      {[
                        {
                          key: "ticketAssigned",
                          label: "Ticket Assigned to Me",
                          desc: "When a new ticket is assigned to you",
                        },
                        {
                          key: "ticketEscalated",
                          label: "Ticket Escalated",
                          desc: "When a ticket is escalated to your team",
                        },
                        {
                          key: "ticketUpdated",
                          label: "Ticket Updates",
                          desc: "When a ticket you're working on is updated",
                        },
                        {
                          key: "slaWarnings",
                          label: "SLA Warnings",
                          desc: "When a ticket is approaching SLA breach",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={
                              settings[
                                item.key as keyof typeof settings
                              ] as boolean
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                [item.key]: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-[#4a9eff] border-gray-300 rounded focus:ring-[#4a9eff]"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[#2d3e50]">
                              {item.label}
                            </div>
                            <div className="text-xs text-gray-600">
                              {item.desc}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                </div>
              </div>
            </div>
          )}

          {activeSection === "display" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#2d3e50] mb-4">
                  Display & Language
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Customize how PDSdesk looks and displays
                  information.
                </p>

                <div className="bg-white border border-gray-300 rounded p-4">

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2d3e50] mb-2">
                      Theme
                    </label>
                    <select
                      value={settings.theme}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          theme: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">
                        Auto (System)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2d3e50] mb-2">
                      Language
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          language: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    >
                      <option value="en-GB">
                        English (UK)
                      </option>
                      <option value="en-US">
                        English (US)
                      </option>
                      <option value="nl-NL">Nederlands</option>
                      <option value="de-DE">Deutsch</option>
                      <option value="fr-FR">Français</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2d3e50] mb-2">
                      Date Format
                    </label>
                    <select
                      value={settings.dateFormat}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dateFormat: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    >
                      <option value="DD/MM/YYYY">
                        DD/MM/YYYY (31/12/2024)
                      </option>
                      <option value="MM/DD/YYYY">
                        MM/DD/YYYY (12/31/2024)
                      </option>
                      <option value="YYYY-MM-DD">
                        YYYY-MM-DD (2024-12-31)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2d3e50] mb-2">
                      Time Format
                    </label>
                    <select
                      value={settings.timeFormat}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          timeFormat: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                    >
                      <option value="24h">
                        24-hour (14:30)
                      </option>
                      <option value="12h">
                        12-hour (2:30 PM)
                      </option>
                    </select>
                  </div>
                </div>

                </div>
              </div>
            </div>
          )}

          {activeSection === "privacy" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#2d3e50] mb-4">
                  Privacy & Security
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Manage your privacy and security settings.
                </p>

                <div className="bg-white border border-gray-300 rounded p-4">

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-300 rounded">
                    <div>
                      <div className="font-medium text-sm text-[#2d3e50]">
                        Show Online Status
                      </div>
                      <div className="text-xs text-gray-600">
                        Let others see when you're online
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showOnlineStatus}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            showOnlineStatus: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a9eff]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-300 rounded">
                    <div>
                      <div className="font-medium text-sm text-[#2d3e50]">
                        Allow Direct Messages
                      </div>
                      <div className="text-xs text-gray-600">
                        Let team members send you direct
                        messages
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.allowDirectMessages}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            allowDirectMessages:
                              e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a9eff]"></div>
                    </label>
                  </div>

                  <div className="border-t border-gray-300 pt-6 mt-6">
                    <h4 className="font-medium text-sm text-[#2d3e50] mb-4">
                      Session Management
                    </h4>
                    <div className="p-4 bg-gray-50 border border-gray-300 rounded">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium text-[#2d3e50]">
                          Active Sessions
                        </div>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          1 Active
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-3">
                        Current session: Chrome on Windows •
                        London, UK
                      </div>
                      <button className="text-xs text-red-600 hover:underline">
                        Sign out from all devices
                      </button>
                    </div>
                  </div>
                </div>

                </div>
              </div>
            </div>
          )}

          {/* ADMIN ONLY SECTIONS */}
          {canManageSystemSettings && activeSection === "system" && (
            <div className="max-w-4xl space-y-6">
              <div
                className="pds-panel px-4 py-3 mb-6"
                style={{
                  borderColor: "color-mix(in srgb, var(--pds-warning) 22%, var(--pds-border))",
                  background: "color-mix(in srgb, var(--pds-warning) 10%, var(--pds-surface))",
                }}
              >
                <div className="flex items-center gap-2">
                  <Shield
                    size={18}
                    style={{ color: "var(--pds-warning)" }}
                  />
                  <span className="text-sm font-medium" style={{ color: "var(--pds-text)" }}>
                    {isGlobalAdmin ? "Global Admin Settings" : "Admin Settings"}
                  </span>
                </div>
                <p className="text-xs pds-text-muted mt-1">
                  These settings affect the entire PDSdesk
                  system. Changes will apply to all users.
                </p>
              </div>

              {systemSettingsError && (
                <div className="pds-panel px-3 py-2 text-sm" style={{ color: "var(--pds-danger)" }}>
                  {systemSettingsError}
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--pds-text)" }}>
                  System Settings
                </h3>
                <p className="text-sm pds-text-muted mb-6">
                  These are organization-wide settings stored in the database. Changes affect all users.
                </p>

                <div className="space-y-6">
                  <div className="pds-panel p-4">
                    <h4 className="font-medium text-sm mb-3" style={{ color: "var(--pds-text)" }}>
                      Microsoft Azure AD Integration
                    </h4>
                    <div className="text-sm" style={{ color: "var(--pds-text)" }}>
                      Azure AD directory sync is configured via Supabase Edge Function secrets.
                    </div>
                  </div>

                  <div className="pds-panel p-4">
                    <h4 className="font-medium text-sm mb-3" style={{ color: "var(--pds-text)" }}>
                      Email Integration
                    </h4>
                    <div className="text-sm mb-4" style={{ color: "var(--pds-text)" }}>
                      These addresses are used for inbound and outbound email handling. Additional queue mailboxes are configured
                      in <span className="font-medium">Queue Management</span> using routing rules (Match Mailbox → Queue).
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs pds-text-muted mb-1">
                          Inbound support mailbox
                        </label>
                        <input
                          type="email"
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          placeholder="e.g., support@yourcompany.com"
                          disabled={systemSettingsLoading}
                          className="pds-input pds-focus"
                        />
                        <div className="mt-1 text-xs pds-text-muted">
                          Default mailbox used for customer-service tickets when no specific routing rule matches.
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs pds-text-muted mb-1">
                          Outbound no-reply address
                        </label>
                        <input
                          type="email"
                          value={noReplyEmail}
                          onChange={(e) => setNoReplyEmail(e.target.value)}
                          placeholder="e.g., no-reply@yourcompany.com"
                          disabled={systemSettingsLoading}
                          className="pds-input pds-focus"
                        />
                        <div className="mt-1 text-xs pds-text-muted">
                          Sender address for automated outbound notifications.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pds-panel p-4">
                    <h4 className="font-medium text-sm mb-3" style={{ color: "var(--pds-text)" }}>
                      Business Hours
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs pds-text-muted mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={businessStartTime}
                          onChange={(e) => setBusinessStartTime(e.target.value)}
                          disabled={systemSettingsLoading}
                          className="pds-input pds-focus"
                        />
                      </div>
                      <div>
                        <label className="block text-xs pds-text-muted mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={businessEndTime}
                          onChange={(e) => setBusinessEndTime(e.target.value)}
                          disabled={systemSettingsLoading}
                          className="pds-input pds-focus"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs pds-text-muted mb-1">
                          Working Days
                        </label>
                        <div className="pds-segmented">
                          {[
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                            "Sun",
                          ].map((day) => (
                            <button
                              key={day}
                              type="button"
                              disabled={systemSettingsLoading}
                              className="pds-segment pds-focus"
                              data-active={workingDays.includes(day)}
                              onClick={() =>
                                setWorkingDays((prev) =>
                                  prev.includes(day)
                                    ? prev.filter((d) => d !== day)
                                    : [...prev, day],
                                )
                              }
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {canManageUsers &&
            activeSection === "user-management" && (
              <div className="max-w-6xl space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--pds-text)" }}>
                    User & Role Management
                  </h3>
                  <p className="text-sm pds-text-muted mb-4">
                    Manage user roles and operator group membership. Directory users appear here after Azure AD sync.
                  </p>

                  <div className="pds-panel">
                    <div className="pds-actionbar">
                      <div className="flex items-center gap-3">
                        <UsersIcon
                          size={20}
                          style={{ color: "var(--pds-accent)" }}
                        />
                        <span className="font-medium text-sm" style={{ color: "var(--pds-text)" }}>
                          All Users
                        </span>
                        <span className="pds-chip" data-tone="muted">
                          {userMgmtLoading
                            ? "Loading..."
                            : `${directoryUsers.length} loaded`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void syncDirectoryUsers()}
                        disabled={!isGlobalAdmin || userMgmtSyncing}
                        className="pds-btn pds-btn--primary pds-focus"
                      >
                        {userMgmtSyncing ? "Syncing..." : "Sync from Azure AD"}
                      </button>
                    </div>

                    {!isGlobalAdmin && (
                      <div className="px-4 py-3 text-xs pds-text-muted" style={{ borderBottom: "1px solid var(--pds-border)", background: "var(--pds-surface-2)" }}>
                        Azure AD sync can only be run by a Global Admin.
                      </div>
                    )}

                    <div className="p-4">
                      {(userMgmtNotice || userMgmtError) && (
                        <div className="mb-3 pds-panel px-3 py-2 text-sm" style={{ color: userMgmtError ? "var(--pds-danger)" : "var(--pds-success)" }}>
                          {userMgmtError ?? userMgmtNotice}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                        <input
                          value={userMgmtQuery}
                          onChange={(e) => setUserMgmtQuery(e.target.value)}
                          placeholder="Search users by name or email"
                          className="pds-input pds-focus w-full sm:w-80"
                        />
                        <button
                          type="button"
                          className="pds-btn pds-btn--outline pds-focus"
                          onClick={() => setUserMgmtReloadToken((v) => v + 1)}
                          disabled={userMgmtLoading}
                        >
                          Refresh
                        </button>
                      </div>

                      <div className="text-xs pds-text-muted mb-3">
                        Click a column header to sort.
                      </div>

                      <div className="pds-panel">
                        <div className="pds-table-wrap">
                          <table className="pds-table">
                          <thead className="pds-thead">
                            <tr>
                              <th className="pds-th">
                                <button
                                  type="button"
                                  onClick={() => toggleUserMgmtSort("name")}
                                  className="pds-btn pds-btn--link pds-focus text-xs"
                                >
                                  Name{userMgmtSortIndicator("name")}
                                </button>
                              </th>
                              <th className="pds-th">
                                <button
                                  type="button"
                                  onClick={() => toggleUserMgmtSort("email")}
                                  className="pds-btn pds-btn--link pds-focus text-xs"
                                >
                                  Email{userMgmtSortIndicator("email")}
                                </button>
                              </th>
                              <th className="pds-th">
                                <button
                                  type="button"
                                  onClick={() => toggleUserMgmtSort("department")}
                                  className="pds-btn pds-btn--link pds-focus text-xs"
                                >
                                  Department{userMgmtSortIndicator("department")}
                                </button>
                              </th>
                              <th className="pds-th">
                                Job Title
                              </th>
                              <th className="pds-th">
                                Groups
                              </th>
                              <th className="pds-th">
                                Role
                              </th>
                              <th className="pds-th">
                                <button
                                  type="button"
                                  onClick={() => toggleUserMgmtSort("status")}
                                  className="pds-btn pds-btn--link pds-focus text-xs"
                                >
                                  Status{userMgmtSortIndicator("status")}
                                </button>
                              </th>
                              <th className="pds-th">
                                Last Synced
                              </th>
                              <th className="pds-th">
                                Link
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {!userMgmtLoading && displayedDirectoryUsers.length === 0 ? (
                              <tr className="pds-row">
                                <td className="pds-td pds-text-muted" colSpan={9}>
                                  {trimmedUserMgmtQuery
                                    ? `No results for "${trimmedUserMgmtQuery}".`
                                    : "No users found."}
                                </td>
                              </tr>
                            ) : (
                              displayedDirectoryUsers.map((du) => {
                                const linkedProfile = profilesByAzureId[du.azure_ad_id];
                                const profileId = linkedProfile?.id as string | undefined;
                                const roles = profileId ? rolesByProfileId[profileId] ?? [] : [];
                                const primaryRole = roles[0] ?? (profileId ? "requester" : "-");
                                const isTargetGlobalAdmin = roles.includes("global_admin");
                                const name = linkedProfile?.full_name ?? du.full_name ?? "-";
                                const emailVal = linkedProfile?.email ?? du.email ?? "-";
                                const deptVal = linkedProfile?.department ?? du.department ?? "-";
                                const jobTitleVal = linkedProfile?.job_title ?? du.job_title ?? "-";
                                const lastSyncedVal = du.last_synced_at
                                  ? new Date(du.last_synced_at).toLocaleString()
                                  : "-";
                                const enabled = du.account_enabled;

                                return (
                                  <tr key={du.azure_ad_id} className="pds-row">
                                    <td className="pds-td">
                                      <div className="font-medium" style={{ color: "var(--pds-text)" }}>
                                        {name}
                                      </div>
                                    </td>
                                    <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                                      {emailVal}
                                    </td>
                                    <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                                      {deptVal}
                                    </td>
                                    <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                                      {jobTitleVal}
                                    </td>
                                    <td className="pds-td">
                                      {profileId ? (
                                        <div className="flex flex-wrap gap-2">
                                          {operatorGroups.map((g) => {
                                            const keys = operatorGroupsByProfileId[profileId] ?? [];
                                            const on = keys.includes(g.group_key);
                                            return (
                                              <button
                                                key={g.group_key}
                                                type="button"
                                                onClick={() => void toggleUserOperatorGroup(profileId, g.group_key)}
                                                title={g.group_key}
                                                className={`pds-btn pds-btn--sm pds-focus ${
                                                  on ? "pds-btn--secondary" : "pds-btn--outline"
                                                }`}
                                              >
                                                {g.name}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-xs pds-text-muted">Not signed in</span>
                                      )}
                                    </td>
                                    <td className="pds-td">
                                      {profileId && canManageUsers ? (
                                        <select
                                          className="pds-input pds-focus"
                                          value={primaryRole}
                                          onChange={(e) => void setSingleRole(profileId, e.target.value)}
                                          disabled={!isGlobalAdmin && isTargetGlobalAdmin}
                                        >
                                          <option value="requester">Requester</option>
                                          <option value="operator">Operator</option>
                                          <option value="service_desk_admin">Service Desk Admin</option>
                                          {isGlobalAdmin && (
                                            <option value="global_admin">Global Admin</option>
                                          )}
                                        </select>
                                      ) : profileId ? (
                                        <span className="text-xs" style={{ color: "var(--pds-text)" }}>{primaryRole}</span>
                                      ) : (
                                        <span className="text-xs pds-text-muted">
                                          Not signed in
                                        </span>
                                      )}
                                    </td>
                                    <td className="pds-td">
                                      {enabled === false ? (
                                        <span className="pds-chip" data-tone="danger">Disabled</span>
                                      ) : (
                                        <span className="pds-chip" data-tone="success">Active</span>
                                      )}
                                    </td>
                                    <td className="pds-td" style={{ color: "var(--pds-text)" }}>
                                      <span className="text-xs">
                                        {lastSyncedVal}
                                      </span>
                                    </td>
                                    <td className="pds-td">
                                      <span className="text-xs pds-text-muted">
                                        {profileId ? "Linked" : "Not signed in"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {isGlobalAdmin &&
            activeSection === "operator-groups" && (
              <div className="max-w-6xl space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#2d3e50]">
                    Operator Groups
                  </h3>
                  <p className="text-sm text-gray-600">
                    Manage operator groups used for ticket work permissions and routing.
                  </p>
                </div>
                <OperatorGroupsManager
                  showHeader={false}
                  onChanged={() => {
                    void refreshOperatorGroups();
                    setUserMgmtReloadToken((v) => v + 1);
                  }}
                />
              </div>
            )}

          {isGlobalAdmin &&
            activeSection === "queue-management" && (
              <div className="max-w-6xl space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#2d3e50]">
                    Queue Management
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configure routing rules and assignment behavior for incoming tickets.
                  </p>
                </div>
                <TicketRoutingRulesManager
                  showHeader={false}
                  onChanged={() => {
                    setSaveNotice("Saved.");
                  }}
                />
              </div>
            )}

          {isGlobalAdmin && activeSection === "ai-settings" && (
            <div className="max-w-4xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--pds-text)" }}>
                  AI & Automation Settings
                </h3>
                <p className="text-sm pds-text-muted mb-6">
                  Configure optional automation features for categorization and assignment.
                </p>

                {aiSettingsError && (
                  <div className="pds-panel px-3 py-2 text-sm mb-4" style={{ color: "var(--pds-danger)" }}>
                    {aiSettingsError}
                  </div>
                )}

                {aiSettingsLoading && (
                  <div className="text-sm pds-text-muted mb-4">
                    Loading...
                  </div>
                )}

                <div className="space-y-4">
                  <div className="pds-panel p-4">
                    <h4 className="font-medium text-sm mb-3" style={{ color: "var(--pds-text)" }}>
                      Default Assignment Strategy
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs pds-text-muted mb-1">
                          Strategy
                        </label>
                        <select
                          className="pds-input pds-focus w-full"
                          value={aiDefaultAssignmentStrategy}
                          onChange={(e) =>
                            setAiDefaultAssignmentStrategy(
                              e.target.value as "manual" | "ai_auto" | "round_robin",
                            )
                          }
                          disabled={aiSettingsLoading || aiSettingsSaving}
                        >
                          <option value="manual">Manual</option>
                          <option value="ai_auto">AI Auto-Assignment</option>
                          <option value="round_robin">Round-robin</option>
                        </select>
                        <div className="mt-1 text-xs pds-text-muted">
                          Controls the default assignment behavior when creating or ingesting tickets.
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs pds-text-muted mb-1">
                          Apply automation to
                        </label>
                        <select
                          className="pds-input pds-focus w-full"
                          value={aiAutomationScope}
                          onChange={(e) =>
                            setAiAutomationScope(e.target.value as "all" | "selected")
                          }
                          disabled={aiSettingsLoading || aiSettingsSaving}
                        >
                          <option value="all">All queues</option>
                          <option value="selected">Selected queues</option>
                        </select>
                        <div className="mt-1 text-xs pds-text-muted">
                          Limit automation to specific queues (operator groups) if needed.
                        </div>
                      </div>
                    </div>

                    {aiAutomationScope === "selected" && (
                      <div className="mt-4">
                        <div className="text-xs pds-text-muted mb-2">
                          Enabled queues
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {operatorGroups.map((g) => {
                            const on = aiEnabledQueueGroupKeys.includes(g.group_key);
                            return (
                              <button
                                key={g.group_key}
                                type="button"
                                onClick={() => toggleAiEnabledQueue(g.group_key)}
                                disabled={aiSettingsLoading || aiSettingsSaving}
                                className={`pds-btn pds-btn--sm pds-focus disabled:opacity-50 disabled:cursor-not-allowed ${
                                  on ? "pds-btn--secondary" : "pds-btn--outline"
                                }`}
                                title={g.group_key}
                              >
                                {g.name}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-2 text-xs pds-text-muted">
                          If no queues are selected, automation will not run.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pds-panel p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-sm" style={{ color: "var(--pds-text)" }}>
                          AI Auto-Assignment
                        </h4>
                        <p className="text-xs pds-text-muted">
                          Automatically categorize and assign
                          tickets using AI
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={aiAutoAssignmentEnabled}
                        onChange={(e) => setAiAutoAssignmentEnabled(e.target.checked)}
                        disabled={aiSettingsLoading || aiSettingsSaving}
                        className="rounded pds-focus"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs pds-text-muted mb-1">
                          OpenAI API Key
                        </label>
                        <input
                          type="password"
                          value={openAiApiKey}
                          onChange={(e) => setOpenAiApiKey(e.target.value)}
                          placeholder="Enter API key"
                          disabled
                          className="pds-input w-full"
                        />
                        <div className="mt-1 text-xs pds-text-muted">
                          Managed via Supabase Edge Function secrets.
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs pds-text-muted mb-1">
                          Model
                        </label>
                        <select
                          className="pds-input pds-focus w-full"
                          value={openAiModel}
                          onChange={(e) => setOpenAiModel(e.target.value)}
                          disabled={aiSettingsLoading || aiSettingsSaving}
                        >
                          <option>gpt-4o-mini</option>
                          <option>gpt-4o</option>
                          <option>gpt-4-turbo</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pds-panel p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-sm" style={{ color: "var(--pds-text)" }}>
                          Auto-Assign to Available Agents
                        </h4>
                        <p className="text-xs pds-text-muted">
                          Distribute tickets evenly using
                          round-robin
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoAssignAvailableAgentsEnabled}
                        onChange={(e) => setAutoAssignAvailableAgentsEnabled(e.target.checked)}
                        disabled={aiSettingsLoading || aiSettingsSaving}
                        className="rounded pds-focus"
                      />
                    </div>
                  </div>

                  <div className="pds-panel p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm" style={{ color: "var(--pds-text)" }}>
                          Cross-Department Workflows
                        </h4>
                        <p className="text-xs pds-text-muted">
                          Enable multi-department ticket routing
                          (e.g., HR → IT)
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={crossDepartmentWorkflowsEnabled}
                        onChange={(e) => setCrossDepartmentWorkflowsEnabled(e.target.checked)}
                        disabled={aiSettingsLoading || aiSettingsSaving}
                        className="rounded pds-focus"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}