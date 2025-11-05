/* client/src/context/AuthContext.js */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Default shape ensures useContext(AuthContext) never returns undefined,
 * so destructuring like `const { isAuthenticated } = useContext(AuthContext)`
 * will not crash even if the provider isn't mounted yet.
 */
export const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  setUser: () => {},
  setToken: () => {},
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // hydrate from storage on first mount
  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      const u = localStorage.getItem("user");
      if (t) setToken(t);
      if (u) {
        try {
          setUser(JSON.parse(u));
        } catch {
          setUser(null);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const login = (nextToken, nextUser) => {
    setToken(nextToken || null);
    setUser(nextUser || null);
    try {
      if (nextToken) localStorage.setItem("token", nextToken);
      else localStorage.removeItem("token");
      if (nextUser) localStorage.setItem("user", JSON.stringify(nextUser));
      else localStorage.removeItem("user");
    } catch {}
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
  };

  const value = useMemo(
    () => ({
      isAuthenticated: !!token,
      token,
      user,
      login,
      logout,
      setUser,
      setToken,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Optional convenience hook. If some files import `useAuth()`, they'll get
 * a safe fallback even when the provider is not mounted for any reason.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return ctx || {
    isAuthenticated: false,
    user: null,
    token: null,
    login: () => {},
    logout: () => {},
    setUser: () => {},
    setToken: () => {},
  };
};
