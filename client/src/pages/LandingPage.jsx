// client/src/pages/LandingPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LandingPage.css"; // ← updated path

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Top Navigation Bar */}
      <div className="top-bar">
        <div className="brand">Mirchi Mafiya</div>
        <div className="auth-buttons">
          <button onClick={() => navigate("/login")}>Login</button>
          <button className="signup-btn" onClick={() => navigate("/signup")}>
            Sign Up
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-text">
          <h1>Order your favorite food now</h1>
          <p>Quick delivery from nearby restaurants</p>
          <button onClick={() => navigate("/menu")}>Explore Menu</button>
        </div>
      </div>
    </div>
  );
}
