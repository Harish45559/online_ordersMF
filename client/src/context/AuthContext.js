import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * SAFE default so destructuring never crashes
 * even if provider isn't mounted yet.
 */
export const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  token: null,
  ready: false,
  login: () => {},
  logout: () => {},
  setUser: () => {},
  setToken: () => {},
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // hydrate from storage once
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
    } catch {}
    setReady(true);
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
      ready,
      login,
      logout,
      setUser,
      setToken,
    }),
    [token, user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** convenience hook so destructuring is always safe */
export const useAuth = () =>
  useContext(AuthContext) || {
    isAuthenticated: false,
    user: null,
    token: null,
    ready: true,
    login: () => {},
    logout: () => {},
    setUser: () => {},
    setToken: () => {},
  };
