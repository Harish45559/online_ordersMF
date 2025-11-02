import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { requestOtp, verifyOtp } from "../services/api";
import "../styles/Login.css";

const Signup = () => {
  const [step, setStep] = useState("form"); // form -> otp
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { setIsAuthenticated } = useContext(AuthContext);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setMessage("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!name || !email || !password) {
      setMessage("All fields are required.");
      return;
    }

    try {
      const res = await requestOtp(name, email, password);
      setMessage(res.message || "OTP sent to your email.");
      setStep("otp");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to send OTP");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await verifyOtp(form.email.trim().toLowerCase(), otp.trim());
      // Save auth and go home
      localStorage.setItem("token", res.token);
      localStorage.setItem("role", (res.user?.role || "").toLowerCase());
      setIsAuthenticated(true);
      navigate("/");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Invalid or expired OTP");
    }
  };

  return (
    <div className="login-container">
      <div className="top-bar">
        <div className="brand">Online Orders</div>
        <div className="actions">
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
        </div>
      </div>

      <div className="login-box">
        <h2>{step === "form" ? "Create Account" : "Verify OTP"}</h2>

        {step === "form" ? (
          <form onSubmit={sendOtp}>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
            {message && <p className="error-message">{message}</p>}
            <button type="submit">Send OTP</button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            {message && <p className="error-message">{message}</p>}
            <button type="submit">Verify & Sign Up</button>
          </form>
        )}

        <div className="login-links">
          {step === "otp" && (
            <button
              type="button"
              className="link-btn"
              onClick={() => setStep("form")}
            >
              Resend / Edit Details
            </button>
          )}
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
