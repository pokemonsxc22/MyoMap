import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export const USER_NAME_KEY = "myomap_user_name";

interface UserCtx {
  user:     User | null;
  userId:   string | null;
  userName: string | null;
  loading:  boolean;
  signOut:  () => Promise<void>;
}

const UserContext = createContext<UserCtx>({
  user:     null,
  userId:   null,
  userName: null,
  loading:  true,
  signOut:  async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setUserName(localStorage.getItem(USER_NAME_KEY));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setUserName(session?.user ? localStorage.getItem(USER_NAME_KEY) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
    localStorage.removeItem(USER_NAME_KEY);
    setUser(null);
    setUserName(null);
  };

  return (
    <UserContext.Provider value={{ user, userId: user?.id ?? null, userName, loading, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserCtx {
  return useContext(UserContext);
}
