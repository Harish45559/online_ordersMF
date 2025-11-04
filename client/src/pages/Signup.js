import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { requestOtp } from "../services/api";
import "../styles/Signup.css";

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!name || !email || !password) {
      setMessage("Please fill in name, email and password.");
      return;
    }

    try {
      // Request OTP (backend only needs email to create OTP, but we pass all three for consistency)
      await requestOtp(name, email, password);

      // Save for VerifyOtp step
      localStorage.setItem("signupName", name);
      localStorage.setItem("signupEmail", email);
      localStorage.setItem("signupPassword", password);

      // Go to verification screen
      navigate("/verify-otp");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to start signup");
    }
  };

  return (
    <div className="signup-container">
      <div className="top-bar">
        <div className="brand">Online Orders</div>
        <div className="actions">
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
        </div>
      </div>

      <div className="signup-box">
        <h2>Create Account</h2>
        <form onSubmit={handleSignup}>
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {message && <p className="error-message">{message}</p>}
          <button type="submit">Send OTP</button>
        </form>

        <div className="signup-links">
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
