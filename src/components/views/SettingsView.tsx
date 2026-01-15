import { useEffect, useMemo, useState } from "react";
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

// TODO: Fetch user settings from Supabase
export function SettingsView() {
  const { user: authUser, profile, isGlobalAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

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

  const [aiAutoAssignmentEnabled, setAiAutoAssignmentEnabled] = useState(false);
  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [openAiModel, setOpenAiModel] = useState("gpt-4o-mini");
  const [autoAssignAvailableAgentsEnabled, setAutoAssignAvailableAgentsEnabled] = useState(false);
  const [crossDepartmentWorkflowsEnabled, setCrossDepartmentWorkflowsEnabled] = useState(false);

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
    if (!saveNotice) return;
    const t = window.setTimeout(() => setSaveNotice(null), 2000);
    return () => window.clearTimeout(t);
  }, [saveNotice]);

  const sections = [
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
    // Admin-only sections
    ...(isGlobalAdmin
      ? [
          {
            id: "system",
            icon: Database,
            label: "System Settings",
            adminOnly: true,
          },
          {
            id: "user-management",
            icon: UsersIcon,
            label: "User Management",
            adminOnly: true,
          },
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

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-[#f5f5f5] border-b border-gray-300 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2d3e50]">
          Settings
        </h2>
        {saveNotice && (
          <div className="mr-3 text-sm text-green-700">
            {saveNotice}
          </div>
        )}
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors flex items-center gap-2"
        >
          <Save size={16} />
          Save Changes
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-[#f9f9f9] border-r border-gray-300 overflow-y-auto">
          <div className="p-4">
            {sections.map((section) => (
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
          )}

          {/* ADMIN ONLY SECTIONS */}
          {isGlobalAdmin && activeSection === "system" && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-orange-50 border border-orange-200 px-4 py-3 rounded mb-6">
                <div className="flex items-center gap-2">
                  <Shield
                    size={18}
                    className="text-orange-600"
                  />
                  <span className="text-sm font-medium text-orange-900">
                    Global Admin Settings
                  </span>
                </div>
                <p className="text-xs text-orange-700 mt-1">
                  These settings affect the entire PDSdesk
                  system. Changes will apply to all users.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#2d3e50] mb-4">
                  System Configuration
                </h3>

                <div className="space-y-6">
                  <div className="p-4 border border-gray-300 rounded">
                    <h4 className="font-medium text-sm text-[#2d3e50] mb-3">
                      Microsoft Azure AD Integration
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Azure Tenant ID
                        </label>
                        <input
                          type="text"
                          placeholder="your-tenant-id"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Client ID
                        </label>
                        <input
                          type="text"
                          placeholder="your-client-id"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Client Secret
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                        />
                      </div>
                      <div className="flex items-end">
                        <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                          Test Connection
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-300 rounded">
                    <h4 className="font-medium text-sm text-[#2d3e50] mb-3">
                      Email Integration
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Support Email
                        </label>
                        <input
                          type="email"
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          placeholder="Support email"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          No-Reply Email
                        </label>
                        <input
                          type="email"
                          value={noReplyEmail}
                          onChange={(e) => setNoReplyEmail(e.target.value)}
                          placeholder="No-reply email"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-300 rounded">
                    <h4 className="font-medium text-sm text-[#2d3e50] mb-3">
                      Business Hours
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={businessStartTime}
                          onChange={(e) => setBusinessStartTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={businessEndTime}
                          onChange={(e) => setBusinessEndTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">
                          Working Days
                        </label>
                        <div className="flex gap-2">
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
                              className={`px-3 py-1.5 text-xs rounded ${
                                workingDays.includes(day)
                                  ? "bg-[#4a9eff] text-white"
                                  : "bg-gray-200 text-gray-600"
                              }`}
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

          {isGlobalAdmin &&
            activeSection === "user-management" && (
              <div className="max-w-6xl space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#2d3e50] mb-4">
                    User & Role Management
                  </h3>

                  <div className="bg-white border border-gray-300 rounded">
                    <div className="p-4 border-b border-gray-300 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UsersIcon
                          size={20}
                          className="text-[#4a9eff]"
                        />
                        <span className="font-medium text-sm">
                          All Users
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          Not loaded
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled
                        title="Azure AD sync is not configured"
                        className="px-4 py-2 bg-gray-200 text-gray-600 text-sm rounded cursor-not-allowed"
                      >
                        Sync from Azure AD
                      </button>
                    </div>

                    <div className="p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-300">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold">
                                Name
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                Email
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                Department
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                Role
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                Status
                              </th>
                              <th className="px-4 py-2 text-left font-semibold">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-gray-200">
                              <td className="px-4 py-6 text-center text-sm text-gray-600" colSpan={6}>
                                No users loaded.
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {isGlobalAdmin &&
            activeSection === "operator-groups" && (
              <OperatorGroupsManager />
            )}

          {isGlobalAdmin &&
            activeSection === "queue-management" && (
              <TicketRoutingRulesManager />
            )}

          {isGlobalAdmin && activeSection === "ai-settings" && (
            <div className="max-w-4xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#2d3e50] mb-4">
                  AI & Automation Settings
                </h3>

                <div className="space-y-4">
                  <div className="p-4 border border-gray-300 rounded">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-sm text-[#2d3e50]">
                          AI Auto-Assignment
                        </h4>
                        <p className="text-xs text-gray-600">
                          Automatically categorize and assign
                          tickets using AI
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiAutoAssignmentEnabled}
                          onChange={(e) => setAiAutoAssignmentEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a9eff]"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          OpenAI API Key
                        </label>
                        <input
                          type="password"
                          value={openAiApiKey}
                          onChange={(e) => setOpenAiApiKey(e.target.value)}
                          placeholder="Enter API key"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Model
                        </label>
                        <select
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-[#4a9eff]"
                          value={openAiModel}
                          onChange={(e) => setOpenAiModel(e.target.value)}
                        >
                          <option>gpt-4o-mini</option>
                          <option>gpt-4o</option>
                          <option>gpt-4-turbo</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-300 rounded">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-sm text-[#2d3e50]">
                          Auto-Assign to Available Agents
                        </h4>
                        <p className="text-xs text-gray-600">
                          Distribute tickets evenly using
                          round-robin
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoAssignAvailableAgentsEnabled}
                          onChange={(e) => setAutoAssignAvailableAgentsEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a9eff]"></div>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-300 rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm text-[#2d3e50]">
                          Cross-Department Workflows
                        </h4>
                        <p className="text-xs text-gray-600">
                          Enable multi-department ticket routing
                          (e.g., HR → IT)
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={crossDepartmentWorkflowsEnabled}
                          onChange={(e) => setCrossDepartmentWorkflowsEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a9eff]"></div>
                      </label>
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