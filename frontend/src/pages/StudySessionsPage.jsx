import { useEffect, useState } from "react";
import { CalendarDays, CircleHelp, Plus, UsersRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { clearStoredAuth, getStoredAuth } from "../utils/auth";

export default function StudySessionsPage() {
  const [profile, setProfile] = useState(null);
  const [studySessions, setStudySessions] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const auth = getStoredAuth();

  const loadData = async () => {
    try {
      const [meResponse, sessionsResponse, proposalsResponse] = await Promise.all([
        api.get("/auth/me"),
        api.get("/study-support/sessions"),
        api.get("/study-support/proposals"),
      ]);
      setProfile(meResponse.data);
      setStudySessions(sessionsResponse.data);
      setProposals(proposalsResponse.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load study sessions");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onLogout = () => {
    clearStoredAuth();
    navigate("/");
  };

  return (
    <div className="app-layout">
      <Sidebar profile={profile || auth?.user} onLogout={onLogout} />
      <main className="page-shell">
        <header className="topbar">
          <h2>
            <CalendarDays size={24} />
            Study Sessions
          </h2>
        </header>

        {error ? <p className="error">{error}</p> : null}

        <section className="panel">
          <div className="panel-head">
            <UsersRound size={20} />
            <h3>Created Sessions (Upcoming)</h3>
          </div>
          <ul className="list">
            {studySessions.length ? (
              studySessions.map((item) => (
                <li key={item._id}>
                  <strong>
                    {item.moduleCode} - {item.moduleName}
                  </strong>
                  <p>
                    {item.date} {item.startTime}-{item.endTime}
                  </p>
                  <a href={item.meetingLink} target="_blank" rel="noreferrer">
                    Open Meeting
                  </a>
                </li>
              ))
            ) : (
              <li>No upcoming sessions yet.</li>
            )}
          </ul>
        </section>

        <section className="core-grid">
          <Link className="panel mode-card active" to="/study-sessions">
            <div className="mode-icon">
              <CalendarDays size={28} />
            </div>
            <h3>Created Sessions</h3>
            <p className="muted">See all finalized upcoming sessions.</p>
          </Link>
          <Link className="panel mode-card" to="/study-sessions/propose">
            <div className="mode-icon">
              <Plus size={28} />
            </div>
            <h3>Propose</h3>
            <p className="muted">Create and vote for new session ideas.</p>
          </Link>
          <Link className="panel mode-card" to="/study-sessions/request">
            <div className="mode-icon">
              <CircleHelp size={28} />
            </div>
            <h3>Request</h3>
            <p className="muted">Send help requests to Batch Tops.</p>
          </Link>
        </section>

        <section className="panel">
          <div className="panel-head">
            <Plus size={20} />
            <h3>Proposed Sessions</h3>
          </div>
          <ul className="list">
            {proposals.length ? (
              proposals.map((item) => (
                <li key={item._id}>
                  <strong>
                    {item.moduleCode} - {item.moduleName}
                  </strong>
                  <p>{item.description}</p>
                  <p className="muted">
                    Likes: {item.likes} | Dislikes: {item.dislikes} | Status: {item.status}
                  </p>
                </li>
              ))
            ) : (
              <li>No proposals yet.</li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
