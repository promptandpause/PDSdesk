import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../supabaseClient";

export type RoleKey =
  | "global_admin"
  | "service_desk_admin"
  | "operator"
  | "requester";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  azure_ad_id?: string | null;
  department?: string | null;
  job_title?: string | null;
  office_location?: string | null;
  mobile_phone?: string | null;
  business_phone?: string | null;
};

export type OperatorGroupKey = "customer_service" | "it_services";

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: RoleKey[];
  operatorGroups: OperatorGroupKey[];
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: RoleKey) => boolean;
  isInOperatorGroup: (groupKey: OperatorGroupKey) => boolean;
  isGlobalAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<RoleKey[]>([]);
  const [operatorGroups, setOperatorGroups] = useState<OperatorGroupKey[]>([]);

  const lastProviderTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session ?? null);
      setUser(session?.user ?? null);
      setLoading(false);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileAndRoles() {
      if (!user) {
        setProfile(null);
        setRoles([]);
        setOperatorGroups([]);
        return;
      }

      const [{ data: profile }, { data: userRoles }, { data: groupsData }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id,email,full_name,avatar_url,azure_ad_id,department,job_title,office_location,mobile_phone,business_phone",
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role_key")
          .eq("user_id", user.id),
        supabase
          .from("operator_group_members")
          .select("group:operator_groups(group_key)")
          .eq("user_id", user.id),
      ]);

      if (cancelled) return;

      setProfile((profile as Profile | null) ?? null);
      setRoles(
        (userRoles ?? [])
          .map((r) => r.role_key as RoleKey)
          .filter(Boolean),
      );

      const normalizedGroupKeys: OperatorGroupKey[] =
        (groupsData ?? [])
          .map((row: any) => {
            const g = row?.group;
            if (Array.isArray(g)) {
              return g[0]?.group_key as OperatorGroupKey | undefined;
            }
            return g?.group_key as OperatorGroupKey | undefined;
          })
          .filter((k): k is OperatorGroupKey =>
            k === "customer_service" || k === "it_services",
          );
      setOperatorGroups(normalizedGroupKeys);
    }

    loadProfileAndRoles();

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  useEffect(() => {
    let cancelled = false;

    async function syncMeFromGraph() {
      if (!user) return;
      const providerToken = (session as any)?.provider_token as string | undefined;
      if (!providerToken) return;
      if (lastProviderTokenRef.current === providerToken) return;
      lastProviderTokenRef.current = providerToken;

      try {
        const { error } = await supabase.functions.invoke("graph-user-sync-me", {
          body: { provider_token: providerToken },
        });
        if (cancelled) return;
        if (!error) {
          const { data: refreshed } = await supabase
            .from("profiles")
            .select(
              "id,email,full_name,avatar_url,azure_ad_id,department,job_title,office_location,mobile_phone,business_phone",
            )
            .eq("id", user.id)
            .maybeSingle();

          if (!cancelled) {
            setProfile((refreshed as Profile | null) ?? null);
          }
        }
      } catch {}
    }

    syncMeFromGraph();

    return () => {
      cancelled = true;
    };
  }, [session, supabase, user]);

  const signInWithMicrosoft = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: window.location.origin,
        scopes: "openid profile email User.Read",
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: RoleKey) => roles.includes(role);
  const isInOperatorGroup = (groupKey: OperatorGroupKey) => operatorGroups.includes(groupKey);

  const value: AuthContextValue = {
    loading,
    session,
    user,
    profile,
    roles,
    operatorGroups,
    signInWithMicrosoft,
    signOut,
    hasRole,
    isInOperatorGroup,
    isGlobalAdmin: hasRole("global_admin"),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
