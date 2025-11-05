import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";

// ⬇️ Make sure this path matches your project
import { AuthProvider } from "./context/AuthContext";

// Simple error boundary so blank screens show an explanation instead of nothing
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Helpful in Render logs
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error || "Unknown error")}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    {/* HashRouter ensures refreshes work on static hosting */}
    <HashRouter>
      {/* ⬇️ Restore AuthProvider so useContext(AuthContext) is defined */}
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
