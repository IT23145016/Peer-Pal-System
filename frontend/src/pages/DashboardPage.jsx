import { useEffect, useMemo, useState } from "react";
import { BookMarked, CheckCircle2, ClipboardList, UserRound, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { clearStoredAuth, getStoredAuth } from "../utils/auth";

const getRemainingDays = (deadline) => {
  const end = new Date(deadline);
  const now = new Date();
  const ms = end.setHours(23, 59, 59, 999) - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const getUrgencyEmoji = (item) => {
  if (item.overdue) return "🚨";
  if (item.dueSoon) return "😰";
  return "📘";
};

export default function DashboardPage() {
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [modules, setModules] = useState([]);
  const [trackerFilter, setTrackerFilter] = useState("all");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = getStoredAuth();
  const activeSection =
    searchParams.get("tab") === "modules" ? "modules" : searchParams.get("tab") === "tracker" ? "tracker" : "dashboard";

  const loadData = async () => {
    try {
      const [meResponse, userAccessResponse, assignmentsResponse, modulesResponse] = await Promise.all([
        api.get("/auth/me"),
        api.get("/auth/user/dashboard"),
        api.get("/assignments"),
        api.get("/modules"),
      ]);

      setProfile(meResponse.data);
      setAssignments(assignmentsResponse.data);
      setModules(modulesResponse.data);

      if (userAccessResponse.data.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load user dashboard");
    }
  };

  useEffect(() => {
    loadData();
  }, [navigate]);

  const onLogout = () => {
    clearStoredAuth();
    navigate("/");
  };

  const onSetTrackerStatus = async (assignmentId, nextStatus) => {
    try {
      setError("");
      setStatus("");
      await api.patch(`/assignments/${assignmentId}/progress`, { status: nextStatus });
      setStatus("Assignment tracker updated");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update assignment tracker");
    }
  };

  const trackerCards = useMemo(
    () =>
      assignments.map((item) => {
        const remainingDays = getRemainingDays(item.deadline);
        const dueSoon = remainingDays <= 2 && item.trackerStatus !== "done";
        const overdue = remainingDays < 0 && item.trackerStatus !== "done";
        return { ...item, remainingDays, dueSoon, overdue };
      }),
    [assignments]
  );

  const pendingCount = useMemo(
    () => trackerCards.filter((item) => item.trackerStatus !== "done").length,
    [trackerCards]
  );

  const doneCount = useMemo(
    () => trackerCards.filter((item) => item.trackerStatus === "done").length,
    [trackerCards]
  );

  const dueSoonItems = useMemo(
    () =>
      trackerCards
        .filter((item) => item.remainingDays >= 0 && item.remainingDays <= 2 && item.trackerStatus !== "done")
        .sort((a, b) => a.remainingDays - b.remainingDays),
    [trackerCards]
  );

  const filteredTrackerCards = useMemo(() => {
    if (trackerFilter === "soon_due") {
      return trackerCards
        .filter((item) => item.remainingDays >= 0 && item.remainingDays <= 2)
        .sort((a, b) => a.remainingDays - b.remainingDays);
    }

    if (trackerFilter === "newly_published") {
      const now = new Date();
      return trackerCards
        .filter((item) => {
          const publishedDate = new Date(item.publishedDate);
          const diffDays = Math.ceil((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 7;
        })
        .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
    }

    return trackerCards;
  }, [trackerCards, trackerFilter]);

  return (
    <div className="app-layout">
      <Sidebar profile={profile || auth?.user} onLogout={onLogout} />
      <main className="page-shell">
        <header className="topbar">
          <h2>
            <UserRound size={18} />
            User Dashboard
          </h2>
        </header>

        <section className="welcome-card">
          <h1>Welcome, {profile?.name || auth?.user?.name || "User"}</h1>
          <p className="muted">Role: user</p>
        </section>

        {error ? <p className="error">{error}</p> : null}
        {status ? <p className="success">{status}</p> : null}

        {activeSection === "dashboard" ? (
          <section className="core-grid">
            <article className="panel">
              <div className="panel-head">
                <ClipboardList size={18} />
                <h3>Pending Assignments</h3>
              </div>
              <p className="metric">{pendingCount}</p>
            </article>
            <article className="panel">
              <div className="panel-head">
                <CheckCircle2 size={18} />
                <h3>Done Assignments</h3>
              </div>
              <p className="metric">{doneCount}</p>
            </article>
            <article className="panel due-soon">
              <div className="panel-head">
                <XCircle size={18} />
                <h3>Soon Due 🚨</h3>
              </div>
              {dueSoonItems.length ? (
                <ul className="list compact">
                  {dueSoonItems.slice(0, 5).map((item) => (
                    <li key={item._id}>
                      <strong>
                        <span className="urgency-emoji">😰</span> {item.moduleCode} - {item.assignmentName}
                      </strong>
                      <p className="deadline-red">{item.remainingDays} day(s) left</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No assignments due soon.</p>
              )}
            </article>
          </section>
        ) : null}

        {activeSection === "tracker" ? (
          <>
            <section className="panel panel-wide">
              <div className="tracker-filter-row">
                <label htmlFor="trackerFilter">Filter Assignments</label>
                <select
                  id="trackerFilter"
                  value={trackerFilter}
                  onChange={(e) => setTrackerFilter(e.target.value)}
                >
                  <option value="all">All Assignments</option>
                  <option value="soon_due">Soon Due</option>
                  <option value="newly_published">Newly Published (last 7 days)</option>
                </select>
              </div>
            </section>
            <section className="core-grid">
              {filteredTrackerCards.length ? (
                filteredTrackerCards.map((item) => (
                  <article
                    key={item._id}
                    className={item.overdue ? "panel due-alert" : item.dueSoon ? "panel due-soon" : "panel"}
                  >
                    <div className="panel-head">
                      <ClipboardList size={18} />
                      <h3>
                        <span className="urgency-emoji">{getUrgencyEmoji(item)}</span> {item.moduleCode} -{" "}
                        {item.assignmentName}
                      </h3>
                    </div>
                    <p className="muted">
                      Published: {new Date(item.publishedDate).toLocaleDateString()} | Deadline:{" "}
                      {new Date(item.deadline).toLocaleDateString()}
                    </p>
                    <p className={item.overdue || item.dueSoon ? "deadline-red" : "muted"}>
                      {item.overdue
                        ? `🚨 Overdue by ${Math.abs(item.remainingDays)} day(s)`
                        : item.dueSoon
                          ? `😰 ${item.remainingDays} day(s) remaining`
                          : `${item.remainingDays} day(s) remaining`}
                    </p>
                    <p className="muted">Status: {item.trackerStatus}</p>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className={item.trackerStatus === "done" ? "done-btn" : "btn-secondary user-action"}
                        onClick={() => onSetTrackerStatus(item._id, "done")}
                      >
                        <CheckCircle2 size={14} />
                        Mark Done
                      </button>
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() => onSetTrackerStatus(item._id, "not_completed")}
                      >
                        <XCircle size={14} />
                        Not Completed
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <article className="panel">
                  <p className="muted">No assignments available for your modules yet.</p>
                </article>
              )}
            </section>
          </>
        ) : null}

        {activeSection === "modules" ? (
          <section className="core-grid">
            <article className="panel panel-wide">
              <div className="panel-head">
                <BookMarked size={18} />
                <h3>My Modules</h3>
              </div>
              <ul className="list">
                {modules.length ? (
                  modules.map((item) => (
                    <li key={item._id}>
                      <strong>
                        {item.moduleCode} - {item.moduleName}
                      </strong>
                      <p>
                        {item.moduleId} | Year {item.academicYear} Semester {item.semester}
                      </p>
                    </li>
                  ))
                ) : (
                  <li>No modules available yet</li>
                )}
              </ul>
            </article>
          </section>
        ) : null}
      </main>
    </div>
  );
}
