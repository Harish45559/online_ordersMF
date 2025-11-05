import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Menu from "./pages/Menu";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./pages/Profile";
import OrdersHistory from "./pages/OrdersHistory";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import MasterData from "./pages/MasterData";
import VerifyOtp from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";
import StripeWrapper from "./pages/StripeWrapper";
import LiveOrders from "./pages/LiveOrders";
import LandingPage from "./pages/LandingPage";
import TotalOrders from "./pages/TotalOrders";
import Success from "./pages/Success";
import { useAuth } from "./context/AuthContext";

function App() {
  const { isAuthenticated, ready } = useAuth();

  // Prevent layout flicker until localStorage is read
  if (!ready) return null;

  return (
    <div style={{ display: "flex" }}>
      {isAuthenticated && <Sidebar />}
      <div style={{ marginLeft: isAuthenticated ? "250px" : "0", width: "100%" }}>
        <Routes>
          {/* Landing / Default */}
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu"
            element={
              <ProtectedRoute>
                <Menu />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/master-data"
            element={
              <ProtectedRoute>
                <MasterData />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <OrderTracking />
              </ProtectedRoute>
            }
          />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password/:id" element={<ResetPassword />} />

          {/* Admin / Misc */}
          <Route path="/live-orders" element={<LiveOrders />} />
          <Route path="/admin/orders" element={<TotalOrders />} />
          <Route
            path="/stripe-wrapper"
            element={
              <ProtectedRoute>
                <StripeWrapper />
              </ProtectedRoute>
            }
          />
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<h2 style={{ padding: "30px" }}>Payment Cancelled</h2>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
