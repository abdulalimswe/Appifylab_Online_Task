import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "appifylab_social_auth";
const EMPTY_AUTH = { token: "", fullName: "", email: "" };

function readStorage() {
  if (typeof window === "undefined") {
    return EMPTY_AUTH;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return EMPTY_AUTH;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return EMPTY_AUTH;
  }
}

function writeStorage(auth) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

function clearStorage() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStorage);

  const value = useMemo(
    () => ({
      ...auth,
      isAuthenticated: Boolean(auth.token),
      login: (nextAuth) => {
        const normalized = { ...EMPTY_AUTH, ...nextAuth };
        setAuth(normalized);
        writeStorage(normalized);
      },
      updateAuth: (patch) => {
        setAuth((current) => {
          const normalized = { ...current, ...patch };
          writeStorage(normalized);
          return normalized;
        });
      },
      logout: () => {
        setAuth(EMPTY_AUTH);
        clearStorage();
      }
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

