import React, { useState } from "react";
import api, { verifyOtp } from "../services/api"; // we can use api for resend and verifyOtp helper
import "../styles/VerifyOtp.css";
import { useNavigate } from "react-router-dom";

const VerifyOtp = () => {
  const navigate = useNavigate();

  // Values saved by Signup page
  const email = (localStorage.getItem("signupEmail") || "").trim().toLowerCase();
  const name = (localStorage.getItem("signupName") || "").trim();
  const password = localStorage.getItem("signupPassword") || "";

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleVerify = async () => {
    setMessage("");
    if (!email) {
      setMessage("Missing signup email. Please start again.");
      return;
    }
    if (!otp || otp.trim().length < 4) {
      setMessage("Please enter the OTP.");
      return;
    }
    setBusy(true);
    try {
      // Send name/password along with email/otp — backend ignores them for existing users
      const res = await verifyOtp({ email, otp: otp.trim(), name, password });
      if (res?.token) {
        localStorage.setItem("token", res.token);
      }
      setMessage("Account verified successfully");
      setVerified(true);

      // cleanup temporary signup values
      localStorage.removeItem("signupEmail");
      localStorage.removeItem("signupName");
      localStorage.removeItem("signupPassword");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setMessage("");
    if (!email) {
      setMessage("Missing signup email. Please start again.");
      return;
    }
    setBusy(true);
    try {
      // Your frontend already expects this route; ensure backend has /api/auth/resend-otp
      await api.post("/api/auth/resend-otp", { email });
      setMessage("OTP resent to your email");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Error resending OTP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="verify-container">
      <h2>Verify OTP</h2>

      <input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
      />

      <button onClick={handleVerify} disabled={busy}>
        {busy ? "Verifying..." : "Verify"}
      </button>

      <button onClick={handleResend} className="resend-btn" disabled={busy}>
        {busy ? "Resending..." : "Resend OTP"}
      </button>

      {verified && (
        <button className="continue-btn" onClick={() => navigate("/login")}>
          Continue to Login
        </button>
      )}

      {message && <p>{message}</p>}
    </div>
  );
};

export default VerifyOtp;
