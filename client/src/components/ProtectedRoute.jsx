import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, ready } = useContext(AuthContext);

  // Wait until auth has hydrated so we don't flash unauth state
  if (!ready) return null; // or a small loading indicator

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
