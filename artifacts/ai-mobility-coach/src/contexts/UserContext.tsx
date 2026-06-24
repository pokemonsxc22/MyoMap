import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const USER_ID_KEY   = "myomap_user_id";
export const USER_NAME_KEY = "myomap_user_name";

interface UserCtx {
  userId:   string | null;
  userName: string | null;
  loading:  boolean;
  setUser:  (id: string, name: string) => void;
  signOut:  () => void;
}

const UserContext = createContext<UserCtx>({
  userId:  null,
  userName: null,
  loading: true,
  setUser: () => {},
  signOut: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId,   setUserId]   = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setUserId(localStorage.getItem(USER_ID_KEY));
    setUserName(localStorage.getItem(USER_NAME_KEY));
    setLoading(false);
  }, []);

  const setUser = (id: string, name: string) => {
    localStorage.setItem(USER_ID_KEY, id);
    localStorage.setItem(USER_NAME_KEY, name);
    setUserId(id);
    setUserName(name);
  };

  const signOut = () => {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    setUserId(null);
    setUserName(null);
  };

  return (
    <UserContext.Provider value={{ userId, userName, loading, setUser, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserCtx {
  return useContext(UserContext);
}
