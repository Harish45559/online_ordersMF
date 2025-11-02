import React from "react";
import { Link } from "react-router-dom";
import "../styles/AuthPage.css";

export default function AuthPage({ title, children, footer }) {
  return (
    <div className="auth-bg">
      <div className="auth-overlay" />
      <header className="auth-topbar">
        <div className="brand">Mirchi Mafiya</div>
        <nav className="auth-actions">
          <Link to="/login" className="btn btn-ghost">Login</Link>
          <Link to="/signup" className="btn btn-primary">Sign Up</Link>
        </nav>
      </header>

      <main className="auth-center">
        <section className="auth-card">
          <h2 className="auth-title">{title}</h2>
          {children}
          {footer ? <div className="auth-footer">{footer}</div> : null}
        </section>
      </main>
    </div>
  );
}
