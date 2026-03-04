import { Navigate, Route, Routes } from "react-router-dom";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import DashboardPage from "./pages/DashboardPage";
import HelpDeskPage from "./pages/HelpDeskPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import StudySessionsPage from "./pages/StudySessionsPage";
import StudySessionsProposePage from "./pages/StudySessionsProposePage";
import StudySessionsRequestPage from "./pages/StudySessionsRequestPage";
import { getDashboardPathByRole, getStoredAuth } from "./utils/auth";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const auth = getStoredAuth();
  if (!auth?.token) return <Navigate to="/login" replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(auth.user?.role)) {
    return <Navigate to={getDashboardPathByRole(auth.user?.role)} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["admin", "user"]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/helpdesk"
        element={
          <ProtectedRoute allowedRoles={["admin", "user"]}>
            <HelpDeskPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/study-sessions"
        element={
          <ProtectedRoute allowedRoles={["admin", "user"]}>
            <StudySessionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/study-sessions/propose"
        element={
          <ProtectedRoute allowedRoles={["admin", "user"]}>
            <StudySessionsProposePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/study-sessions/request"
        element={
          <ProtectedRoute allowedRoles={["admin", "user"]}>
            <StudySessionsRequestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
