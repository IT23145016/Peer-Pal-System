import { BookOpenCheck, CalendarDays, CircleHelp, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getDashboardPathByRole, getStoredAuth } from "../utils/auth";

export default function Sidebar({ profile, onLogout, menuItems = [], activeMenu = "", onMenuSelect, onHomeClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const storedAuth = getStoredAuth();
  const role = profile?.role || storedAuth?.user?.role || "user";
  const avatarSrc = profile?.avatar || "";
  const initials = (profile?.name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const onHomeNavigate = () => {
    if (onHomeClick) {
      onHomeClick();
      return;
    }
    if (storedAuth?.token) {
      navigate(getDashboardPathByRole(role));
      return;
    }
    navigate("/");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BookOpenCheck size={18} />
        <span>Study Hub</span>
      </div>

      <div className="sidebar-profile">
        {avatarSrc ? (
          <img className="avatar-img" src={avatarSrc} alt="Profile" />
        ) : (
          <div className="avatar-fallback">{initials}</div>
        )}
        <div>
          <p className="sidebar-name">{profile?.name || "User"}</p>
          <p className="sidebar-role">{profile?.role || "member"}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button type="button" onClick={onHomeNavigate}>
          <LayoutDashboard size={16} />
          Dashboard
        </button>
        <Link to="/profile">
          <UserRound size={16} />
          Profile
        </Link>
        {role === "user" ? (
          <>
            <Link to="/helpdesk">
              <CircleHelp size={16} />
              Help Req
            </Link>
            <Link to="/study-sessions">
              <CalendarDays size={16} />
              Study Sessions
            </Link>
            <Link to="/calendar">
              <CalendarDays size={16} />
              Calendar
            </Link>
            <Link to="/dashboard?tab=modules">
              <BookOpenCheck size={16} />
              Modules
            </Link>
            <Link to="/dashboard?tab=tracker">
              <BookOpenCheck size={16} />
              Assignment Tracker
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/admin/dashboard?tab=assignments"
              className={
                location.pathname === "/admin/dashboard" && new URLSearchParams(location.search).get("tab") === "assignments"
                  ? "menu-btn active"
                  : "menu-btn"
              }
            >
              <BookOpenCheck size={16} />
              Assignments
            </Link>
            <Link
              to="/admin/dashboard?tab=modules"
              className={
                location.pathname === "/admin/dashboard" && new URLSearchParams(location.search).get("tab") === "modules"
                  ? "menu-btn active"
                  : "menu-btn"
              }
            >
              <BookOpenCheck size={16} />
              Modules
            </Link>
            <Link
              to="/admin/dashboard?tab=users"
              className={
                location.pathname === "/admin/dashboard" && new URLSearchParams(location.search).get("tab") === "users"
                  ? "menu-btn active"
                  : "menu-btn"
              }
            >
              <UserRound size={16} />
              Users
            </Link>
            <Link to="/helpdesk">
              <CircleHelp size={16} />
              Help Req
            </Link>
            <Link to="/study-sessions">
              <CalendarDays size={16} />
              Study Sessions
            </Link>
            <Link to="/calendar">
              <CalendarDays size={16} />
              Calendar
            </Link>
          </>
        )}
        <button type="button" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </nav>
    </aside>
  );
}
