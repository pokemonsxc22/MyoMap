import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { getUsageData, type Plan } from "@/lib/subscription";

export const USER_NAME_KEY = "myomap_user_name";

interface UserCtx {
  user:      User | null;
  userId:    string | null;
  userName:  string | null;
  userEmail: string | null;
  plan:      Plan;
  loading:   boolean;
  signOut:   () => Promise<void>;
  refreshPlan: () => Promise<void>;
}

const UserContext = createContext<UserCtx>({
  user:      null,
  userId:    null,
  userName:  null,
  userEmail: null,
  plan:      "free",
  loading:   true,
  signOut:   async () => {},
  refreshPlan: async () => {},
});

// Resolves a display name for the given auth user: cached localStorage value,
// else the `users.name` column, else falls back to the account's email.
async function resolveUserName(authUser: User): Promise<string> {
  const cached = localStorage.getItem(USER_NAME_KEY);
  if (cached) return cached;

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

  const fallback = authUser.email ?? "there";
  localStorage.setItem(USER_NAME_KEY, fallback);
  return fallback;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [plan, setPlan]         = useState<Plan>("free");
  const [loading, setLoading]   = useState(true);

  const loadPlan = async (userId: string) => {
    const usage = await getUsageData(userId);
    setPlan(usage.plan);
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
  };

  const refreshPlan = async () => {
    if (user) await loadPlan(user.id);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        userId: user?.id ?? null,
        userName,
        userEmail: user?.email ?? null,
        plan,
        loading,
        signOut,
        refreshPlan,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserCtx {
  return useContext(UserContext);
}
