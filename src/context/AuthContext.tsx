/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, apiFetch } from "../lib/api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  favorites: string[];
  createdAt?: string;
  updatedAt?: string;
};

type AuthSession = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  session: AuthSession | null;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (session: AuthSession) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
};

const STORAGE_KEY = "project3-auth";

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [loading, setLoading] = useState(Boolean(readStoredSession()?.token));

  useEffect(() => {
    const stored = readStoredSession();
    if (!stored?.token) {
      return;
    }

    let active = true;

    apiFetch<{ user: AuthUser }>("/api/auth/me", {}, stored.token)
      .then(({ user }) => {
        if (!active) {
          return;
        }

        const nextSession = { token: stored.token, user };
        setSession(nextSession);
        persistSession(nextSession);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          persistSession(null);
          setSession(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function login(nextSession: AuthSession) {
    setSession(nextSession);
    persistSession(nextSession);
  }

  function logout() {
    setSession(null);
    persistSession(null);
  }

  function updateUser(user: AuthUser) {
    setSession((current) => {
      if (!current) {
        return current;
      }

      const nextSession = { ...current, user };
      persistSession(nextSession);
      return nextSession;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        token: session?.token ?? null,
        loading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
