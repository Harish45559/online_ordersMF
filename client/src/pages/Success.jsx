import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("confirming");

  useEffect(() => {
    const confirmPayment = async () => {
      const session_id = searchParams.get("session_id");
      const order_id = searchParams.get("order_id");

      if (!session_id || !order_id) {
        setStatus("error");
        return;
      }

      try {
        // ✅ Call backend to mark payment as paid
        const { data } = await api.post("/api/orders/mark-paid", {
          orderId: order_id,
          stripeSessionId: session_id,
        });

        if (data?.status === "paid") {
          setStatus("paid");
          localStorage.removeItem("cart"); // Clear cart after payment
        } else {
          setStatus("notpaid");
        }
      } catch (err) {
        console.error("Payment confirmation error:", err);
        setStatus("error");
      }
    };

    confirmPayment();
  }, [searchParams]);

  const goToMenu = () => navigate("/menu");

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      {status === "confirming" && (
        <>
          <h2>Confirming Payment…</h2>
          <p>Please wait while we verify your order.</p>
        </>
      )}

      {status === "paid" && (
        <>
          <h2>✅ Payment Successful!</h2>
          <p>Your order has been confirmed and is being prepared.</p>
          <button onClick={goToMenu}>Go to Menu</button>
        </>
      )}

      {status === "notpaid" && (
        <>
          <h2>⚠️ Payment not completed</h2>
          <p>Please contact support with your Order ID.</p>
          <button onClick={goToMenu}>Back to Menu</button>
        </>
      )}

      {status === "error" && (
        <>
          <h2>❌ Something went wrong</h2>
          <p>Unable to verify payment. Please try again.</p>
          <button onClick={goToMenu}>Back to Menu</button>
        </>
      )}
    </div>
  );
}
