import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { clearStoredAuth, getStoredAuth } from "../utils/auth";

export default function StudySessionsProposePage() {
  const [profile, setProfile] = useState(null);
  const [modules, setModules] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [proposalDraft, setProposalDraft] = useState({
    moduleId: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [sessionDrafts, setSessionDrafts] = useState({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();
  const auth = getStoredAuth();

  const loadData = async () => {
    try {
      const [meResponse, modulesResponse, proposalsResponse] = await Promise.all([
        api.get("/auth/me"),
        api.get("/modules"),
        api.get("/study-support/proposals"),
      ]);
      setProfile(meResponse.data);
      setModules(modulesResponse.data);
      setProposals(proposalsResponse.data);
      setProposalDraft((prev) => ({ ...prev, moduleId: prev.moduleId || modulesResponse.data?.[0]?._id || "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load proposals");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onLogout = () => {
    clearStoredAuth();
    navigate("/");
  };

  const onCreateProposal = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      await api.post("/study-support/proposals", proposalDraft);
      setStatus("Study proposal created");
      setProposalDraft({
        moduleId: modules[0]?._id || "",
        description: "",
        date: "",
        startTime: "",
        endTime: "",
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create proposal");
    }
  };

  const onVoteProposal = async (proposalId, voteType) => {
    try {
      setError("");
      setStatus("");
      await api.post(`/study-support/proposals/${proposalId}/vote`, { voteType });
      setStatus("Vote saved.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vote");
    }
  };

  const onCreateSessionFromProposal = async (proposal) => {
    try {
      setError("");
      setStatus("");
      const draft = sessionDrafts[proposal._id] || {
        date: proposal.date || "",
        startTime: proposal.startTime || "",
        endTime: proposal.endTime || "",
        meetingLink: proposal.meetingLink || "",
      };
      await api.post(`/study-support/proposals/${proposal._id}/create-session`, draft);
      setStatus("Study session created.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create session");
    }
  };

  return (
    <div className="app-layout">
      <Sidebar profile={profile || auth?.user} onLogout={onLogout} />
      <main className="page-shell">
        <header className="topbar">
          <h2>
            <Plus size={24} />
            Propose Session
          </h2>
          <Link to="/study-sessions" className="btn btn-ghost">
            Back
          </Link>
        </header>

        {error ? <p className="error">{error}</p> : null}
        {status ? <p className="success">{status}</p> : null}

        <section className="panel">
          <div className="panel-head">
            <Plus size={20} />
            <h3>New Proposal</h3>
          </div>
          <form className="mini-form" onSubmit={onCreateProposal}>
            <select
              value={proposalDraft.moduleId}
              onChange={(e) => setProposalDraft((prev) => ({ ...prev, moduleId: e.target.value }))}
            >
              <option value="">Select Module</option>
              {modules.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.moduleCode} - {item.moduleName}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Description"
              value={proposalDraft.description}
              onChange={(e) => setProposalDraft((prev) => ({ ...prev, description: e.target.value }))}
            />
            <input
              type="date"
              value={proposalDraft.date}
              onChange={(e) => setProposalDraft((prev) => ({ ...prev, date: e.target.value }))}
            />
            <input
              type="time"
              value={proposalDraft.startTime}
              onChange={(e) => setProposalDraft((prev) => ({ ...prev, startTime: e.target.value }))}
            />
            <input
              type="time"
              value={proposalDraft.endTime}
              onChange={(e) => setProposalDraft((prev) => ({ ...prev, endTime: e.target.value }))}
            />
            <button type="submit">Create Proposal</button>
          </form>
        </section>

        <section className="help-grid">
          {proposals.map((item) => {
            const isOwner = String(item.createdBy?._id || item.createdBy) === String(profile?._id);
            const sessionDraft = sessionDrafts[item._id] || {
              date: item.date || "",
              startTime: item.startTime || "",
              endTime: item.endTime || "",
              meetingLink: item.meetingLink || "",
            };

            return (
              <article className="help-card" key={item._id}>
                <strong>
                  {item.moduleCode} - {item.moduleName}
                </strong>
                <p>{item.description}</p>
                <p className="muted">
                  {item.date} {item.startTime}-{item.endTime} | Likes: {item.likes} | Dislikes: {item.dislikes} | Status: {item.status}
                </p>
                <div className="inline-actions">
                  <button type="button" disabled={!!item.myVote} onClick={() => onVoteProposal(item._id, "like")}>
                    Like
                  </button>
                  <button type="button" disabled={!!item.myVote} onClick={() => onVoteProposal(item._id, "dislike")}>
                    Dislike
                  </button>
                </div>

                {isOwner ? (
                  <div className="mini-form">
                    <label>Create Session</label>
                    <input
                      type="date"
                      value={sessionDraft.date}
                      onChange={(e) =>
                        setSessionDrafts((prev) => ({
                          ...prev,
                          [item._id]: { ...sessionDraft, date: e.target.value },
                        }))
                      }
                    />
                    <input
                      type="time"
                      value={sessionDraft.startTime}
                      onChange={(e) =>
                        setSessionDrafts((prev) => ({
                          ...prev,
                          [item._id]: { ...sessionDraft, startTime: e.target.value },
                        }))
                      }
                    />
                    <input
                      type="time"
                      value={sessionDraft.endTime}
                      onChange={(e) =>
                        setSessionDrafts((prev) => ({
                          ...prev,
                          [item._id]: { ...sessionDraft, endTime: e.target.value },
                        }))
                      }
                    />
                    <input
                      placeholder="Teams / Zoom link"
                      value={sessionDraft.meetingLink}
                      onChange={(e) =>
                        setSessionDrafts((prev) => ({
                          ...prev,
                          [item._id]: { ...sessionDraft, meetingLink: e.target.value },
                        }))
                      }
                    />
                    <button type="button" onClick={() => onCreateSessionFromProposal(item)} disabled={!item.canCreateSession}>
                      {item.canCreateSession ? "Create Session" : item.linkedStudySession ? "Session Created" : "Need 2 Likes"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
