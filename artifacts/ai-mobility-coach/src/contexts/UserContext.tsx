import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { getUsageData, markOnboardingComplete, type Plan } from "@/lib/subscription";

export const USER_NAME_KEY = "myomap_user_name";

interface UserCtx {
  user:      User | null;
  userId:    string | null;
  userName:  string | null;
  userEmail: string | null;
  plan:      Plan;
  onboardingComplete: boolean | null;
  loading:   boolean;
  signOut:   () => Promise<void>;
  refreshPlan: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const UserContext = createContext<UserCtx>({
  user:      null,
  userId:    null,
  userName:  null,
  userEmail: null,
  plan:      "free",
  onboardingComplete: null,
  loading:   true,
  signOut:   async () => {},
  refreshPlan: async () => {},
  completeOnboarding: async () => {},
});

// Resolves a display name for the given auth user, in priority order:
// 1. `user_metadata.full_name` (set at sign up)
// 2. `user_metadata.name` (legacy sign ups, kept for backwards compatibility)
// 3. the `users.name` table column (legacy fallback for pre-metadata accounts)
// 4. the part of the account's email before the `@` (never the full email)
async function resolveUserName(authUser: User): Promise<string> {
  const metaFullName = (authUser.user_metadata?.full_name as string | undefined)?.trim();
  if (metaFullName) {
    localStorage.setItem(USER_NAME_KEY, metaFullName);
    return metaFullName;
  }

  const metaName = (authUser.user_metadata?.name as string | undefined)?.trim();
  if (metaName) {
    localStorage.setItem(USER_NAME_KEY, metaName);
    return metaName;
  }

  if (supabase) {
    const { data } = await supabase
      .from("users")
      .select("name")
      .eq("id", authUser.id)
      .maybeSingle();

    if (data?.name) {
      localStorage.setItem(USER_NAME_KEY, data.name as string);
      return data.name as string;
    }
  }

  const emailPrefix = authUser.email?.split("@")[0]?.trim();
  const fallback = emailPrefix || "there";
  localStorage.setItem(USER_NAME_KEY, fallback);
  return fallback;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [plan, setPlan]         = useState<Plan>("free");
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [loading, setLoading]   = useState(true);

  const loadPlan = async (userId: string) => {
    const usage = await getUsageData(userId);
    setPlan(usage.plan);
    setOnboardingComplete(usage.onboarding_complete);
  };

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      if (authUser) {
        setUserName(await resolveUserName(authUser));
        void loadPlan(authUser.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);

      if (!authUser) {
        setUserName(null);
        setPlan("free");
        setOnboardingComplete(null);
        return;
      }

      if (event === "SIGNED_IN") {
        void resolveUserName(authUser).then(setUserName);
        void loadPlan(authUser.id);
      } else {
        setUserName(localStorage.getItem(USER_NAME_KEY) ?? authUser.email ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
    localStorage.removeItem(USER_NAME_KEY);
    setUser(null);
    setUserName(null);
    setPlan("free");
    setOnboardingComplete(null);
  };

  const refreshPlan = async () => {
    if (user) await loadPlan(user.id);
  };

  // Marks onboarding as complete. Sets local state immediately (optimistic)
  // so gated routes unblock right away, regardless of whether the DB write
  // succeeds or the `onboarding_complete` migration has been applied yet —
  // persistence to Supabase happens in the background.
  const completeOnboarding = async () => {
    setOnboardingComplete(true);
    if (user) await markOnboardingComplete(user.id);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        userId: user?.id ?? null,
        userName,
        userEmail: user?.email ?? null,
        plan,
        onboardingComplete,
        loading,
        signOut,
        refreshPlan,
        completeOnboarding,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserCtx {
  return useContext(UserContext);
}
