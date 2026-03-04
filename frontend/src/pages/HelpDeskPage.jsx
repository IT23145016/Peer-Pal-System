import { useEffect, useMemo, useState } from "react";
import { CircleHelp, Download, Flag, Plus, Trophy, Upload, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { clearStoredAuth, getStoredAuth } from "../utils/auth";

const toDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const dataUrlToBlob = (dataUrl) => {
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = /data:(.*?);base64/.exec(meta || "");
  const mime = mimeMatch?.[1] || "application/octet-stream";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

const openDataUrl = (fileData) => {
  const blob = dataUrlToBlob(fileData);
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
};

const downloadDataUrl = (fileData, fileName) => {
  const blob = dataUrlToBlob(fileData);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "document";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
};

export default function HelpDeskPage() {
  const [profile, setProfile] = useState(null);
  const [modules, setModules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [batchTops, setBatchTops] = useState([]);
  const [myBatchTopRequests, setMyBatchTopRequests] = useState([]);
  const [batchTopPendingGroups, setBatchTopPendingGroups] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [draft, setDraft] = useState({
    moduleId: "",
    message: "",
    priority: "medium",
    status: "open",
  });
  const [batchTopDraft, setBatchTopDraft] = useState({
    moduleId: "",
    note: "",
    targetBatchTop: "",
  });
  const [sessionDraft, setSessionDraft] = useState({
    moduleId: "",
    date: "",
    startTime: "",
    endTime: "",
    meetingLink: "",
  });
  const [proposalDraft, setProposalDraft] = useState({
    moduleId: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [meetingLinkDrafts, setMeetingLinkDrafts] = useState({});
  const [editingId, setEditingId] = useState("");
  const [uploadingId, setUploadingId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState("requests");
  const navigate = useNavigate();
  const auth = getStoredAuth();

  const canSubmit = useMemo(() => draft.moduleId && draft.message.trim(), [draft.message, draft.moduleId]);
  const canSubmitBatchTopRequest = useMemo(
    () => batchTopDraft.moduleId && batchTopDraft.note.trim() && batchTopDraft.targetBatchTop,
    [batchTopDraft]
  );

  const loadData = async () => {
    try {
      const [meResponse, modulesResponse, requestsResponse, leaderboardResponse, batchTopsResponse, myBtReqResponse, proposalsResponse, sessionsResponse] =
        await Promise.all([
          api.get("/auth/me"),
          api.get("/modules"),
          api.get("/helpdesk"),
          api.get("/helpdesk/leaderboard"),
          api.get("/study-support/batch-tops"),
          api.get("/study-support/requests/my"),
          api.get("/study-support/proposals"),
          api.get("/study-support/sessions"),
        ]);

      setProfile(meResponse.data);
      setModules(modulesResponse.data);
      setRequests(requestsResponse.data);
      setLeaderboard(leaderboardResponse.data);
      setBatchTops(batchTopsResponse.data);
      setMyBatchTopRequests(myBtReqResponse.data);
      setProposals(proposalsResponse.data);
      setStudySessions(sessionsResponse.data);

      setDraft((prev) => ({ ...prev, moduleId: prev.moduleId || modulesResponse.data?.[0]?._id || "" }));
      setBatchTopDraft((prev) => ({
        ...prev,
        moduleId: prev.moduleId || modulesResponse.data?.[0]?._id || "",
        targetBatchTop: prev.targetBatchTop || batchTopsResponse.data?.[0]?._id || "",
      }));
      setProposalDraft((prev) => ({ ...prev, moduleId: prev.moduleId || modulesResponse.data?.[0]?._id || "" }));

      if (meResponse.data?.isBatchTop) {
        const groupsResponse = await api.get("/study-support/batch-top/pending-groups");
        setBatchTopPendingGroups(groupsResponse.data);
      } else {
        setBatchTopPendingGroups([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load help desk");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onLogout = () => {
    clearStoredAuth();
    navigate("/");
  };

  const onDraftChange = (e) => {
    setDraft((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearDraft = () => {
    setEditingId("");
    setActiveView("requests");
    setDraft({
      moduleId: modules[0]?._id || "",
      message: "",
      priority: "medium",
      status: "open",
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!canSubmit) {
      setError("Module and message are required");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await api.put(`/helpdesk/${editingId}`, draft);
        setStatus("Request updated");
      } else {
        await api.post("/helpdesk", draft);
        setStatus("Request posted");
      }
      clearDraft();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save request");
    } finally {
      setSaving(false);
    }
  };

  const onSendBatchTopRequest = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    if (!canSubmitBatchTopRequest) {
      setError("Module, note and Batch Top are required");
      return;
    }
    try {
      await api.post("/study-support/requests", batchTopDraft);
      setStatus("Request sent to Batch Top");
      setBatchTopDraft((prev) => ({ ...prev, note: "" }));
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send request");
    }
  };

  const onStartSession = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      await api.post("/study-support/sessions/start", sessionDraft);
      setStatus("Study session started and requests accepted");
      setSessionDraft({ moduleId: "", date: "", startTime: "", endTime: "", meetingLink: "" });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start session");
    }
  };

  const onCreateProposal = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      await api.post("/study-support/proposals", proposalDraft);
      setStatus("Study session proposal created");
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
      const { data } = await api.post(`/study-support/proposals/${proposalId}/vote`, { voteType });
      setStatus(
        data?.approvalNotice?.approved
          ? `Vote saved. Proposal approved and ${data.approvalNotice.emailSentCount || 0} users notified.`
          : "Vote saved"
      );
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save vote");
    }
  };

  const onSetMeetingLink = async (proposalId) => {
    try {
      const meetingLink = meetingLinkDrafts[proposalId] || "";
      if (!meetingLink.trim()) {
        setError("Meeting link is required");
        return;
      }
      await api.post(`/study-support/proposals/${proposalId}/meeting-link`, { meetingLink });
      setStatus("Meeting link added");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to set meeting link");
    }
  };

  const onEdit = (item) => {
    setActiveView("addnote");
    setEditingId(item._id);
    setDraft({
      moduleId: item.moduleRef?._id || item.moduleRef || "",
      message: item.message || "",
      priority: item.priority || "medium",
      status: item.status || "open",
    });
  };

  const onDelete = async (id) => {
    try {
      setError("");
      setStatus("");
      await api.delete(`/helpdesk/${id}`);
      if (editingId === id) clearDraft();
      setStatus("Request deleted");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete request");
    }
  };

  const onUploadDoc = async (id) => {
    try {
      if (!uploadFile) {
        setError("Choose a document first");
        return;
      }
      if (uploadFile.size > 1024 * 1024 * 2) {
        setError("Document must be less than 2MB");
        return;
      }
      setError("");
      setStatus("");

      const fileData = await toDataUrl(uploadFile);
      setUploadingId(id);
      await api.post(`/helpdesk/${id}/documents`, {
        fileName: uploadFile.name,
        fileType: uploadFile.type,
        fileData,
      });
      setUploadFile(null);
      setStatus("Document uploaded. Request marked as received.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload document");
    } finally {
      setUploadingId("");
    }
  };

  const onApproveDoc = async (requestId, documentId) => {
    try {
      setError("");
      setStatus("");
      await api.post(`/helpdesk/${requestId}/documents/${documentId}/approve`);
      setStatus("Document approved and counted for trusted leaderboard.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve document");
    }
  };

  const getCardClass = (item) => {
    if (item.status === "received") return "help-card is-received";
    if (item.priority === "urgent") return "help-card is-urgent";
    if (item.status === "in_progress") return "help-card is-progress";
    return "help-card";
  };

  return (
    <div className="app-layout">
      <Sidebar profile={profile || auth?.user} onLogout={onLogout} />
      <main className="page-shell">
        <header className="topbar">
          <h2>
            <CircleHelp size={24} />
            Help Support
          </h2>
          <div className="help-top-actions">
            <button
              type="button"
              className={activeView === "requests" ? "icon-btn active" : "icon-btn"}
              onClick={() => setActiveView("requests")}
            >
              <CircleHelp size={20} />
              Requests
            </button>
            <button
              type="button"
              className={activeView === "batchtop" ? "icon-btn active" : "icon-btn"}
              onClick={() => setActiveView("batchtop")}
            >
              <UsersRound size={20} />
              Batch Top
            </button>
            <button
              type="button"
              className={activeView === "leaderboard" ? "icon-btn active" : "icon-btn"}
              onClick={() => setActiveView("leaderboard")}
            >
              <Trophy size={20} />
              Leaderboard
            </button>
            <button
              type="button"
              className={activeView === "addnote" ? "icon-btn create active" : "icon-btn create"}
              onClick={() => {
                setActiveView("addnote");
                setEditingId("");
                setDraft({
                  moduleId: modules[0]?._id || "",
                  message: "",
                  priority: "medium",
                  status: "open",
                });
              }}
            >
              <Plus size={20} />
              Add Note
            </button>
          </div>
        </header>

        {error ? <p className="error">{error}</p> : null}
        {status ? <p className="success">{status}</p> : null}

        {activeView === "batchtop" ? (
          <>
            <section className="panel">
              <div className="panel-head">
                <UsersRound size={20} />
                <h3>Batch Tops</h3>
              </div>
              <div className="module-card-grid">
                {batchTops.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className={batchTopDraft.targetBatchTop === item._id ? "module-card active" : "module-card"}
                    onClick={() => setBatchTopDraft((prev) => ({ ...prev, targetBatchTop: item._id }))}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.moduleSpecialization || "General Support"}</span>
                    <small>
                      Y{item.academicYear || "-"} / S{item.semester || "-"} {item.batch ? `| ${item.batch}` : ""}
                    </small>
                  </button>
                ))}
              </div>
              <form className="mini-form" onSubmit={onSendBatchTopRequest}>
                <select
                  value={batchTopDraft.moduleId}
                  onChange={(e) => setBatchTopDraft((prev) => ({ ...prev, moduleId: e.target.value }))}
                >
                  <option value="">Select Module</option>
                  {modules.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.moduleCode} - {item.moduleName}
                    </option>
                  ))}
                </select>
                <textarea
                  value={batchTopDraft.note}
                  onChange={(e) => setBatchTopDraft((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="I need help with Lesson 3 - Integration"
                />
                <button type="submit">Request to Batch Top</button>
              </form>
            </section>

            <section className="panel">
              <div className="panel-head">
                <CircleHelp size={20} />
                <h3>My Batch Top Requests</h3>
              </div>
              <ul className="list">
                {myBatchTopRequests.length ? (
                  myBatchTopRequests.map((item) => (
                    <li key={item._id}>
                      <strong>
                        {item.moduleCode} - {item.moduleName}
                      </strong>
                      <p>{item.note}</p>
                      <p className="muted">
                        Batch Top: {item.targetBatchTop?.name || "-"} | Status: {item.status}
                      </p>
                    </li>
                  ))
                ) : (
                  <li>No requests sent yet.</li>
                )}
              </ul>
            </section>

            {profile?.isBatchTop ? (
              <section className="panel">
                <div className="panel-head">
                  <UsersRound size={20} />
                  <h3>Batch Top Dashboard - Start Session</h3>
                </div>
                <ul className="list">
                  {batchTopPendingGroups.map((group) => (
                    <li key={group.moduleId}>
                      <strong>
                        {group.moduleCode} - {group.moduleName}
                      </strong>
                      <p>
                        Pending Requests: {group.requestCount} | Participants: {group.participantCount}
                      </p>
                      <button
                        type="button"
                        disabled={!group.canStartSession}
                        onClick={() => setSessionDraft((prev) => ({ ...prev, moduleId: group.moduleId }))}
                      >
                        {group.canStartSession ? "Start Session" : "Need 1+ request"}
                      </button>
                    </li>
                  ))}
                </ul>

                {sessionDraft.moduleId ? (
                  <form className="mini-form" onSubmit={onStartSession}>
                    <label>Date</label>
                    <input
                      type="date"
                      value={sessionDraft.date}
                      onChange={(e) => setSessionDraft((prev) => ({ ...prev, date: e.target.value }))}
                    />
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={sessionDraft.startTime}
                      onChange={(e) => setSessionDraft((prev) => ({ ...prev, startTime: e.target.value }))}
                    />
                    <label>End Time</label>
                    <input
                      type="time"
                      value={sessionDraft.endTime}
                      onChange={(e) => setSessionDraft((prev) => ({ ...prev, endTime: e.target.value }))}
                    />
                    <input
                      placeholder="Microsoft Teams Link"
                      value={sessionDraft.meetingLink}
                      onChange={(e) => setSessionDraft((prev) => ({ ...prev, meetingLink: e.target.value }))}
                    />
                    <button type="submit">Create Study Session</button>
                  </form>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}

        {activeView === "proposals" ? (
          <>
            <section className="panel">
              <div className="panel-head">
                <Plus size={20} />
                <h3>Propose Study Session</h3>
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
              {proposals.map((item) => (
                <article className="help-card" key={item._id}>
                  <strong>
                    {item.moduleCode} - {item.moduleName}
                  </strong>
                  <p>{item.description}</p>
                  <p className="muted">
                    {item.date} {item.startTime}-{item.endTime} | Likes: {item.likes} | Dislikes: {item.dislikes} |
                    Status: {item.status}
                  </p>
                  <div className="inline-actions">
                    <button type="button" disabled={!!item.myVote} onClick={() => onVoteProposal(item._id, "like")}>
                      Like
                    </button>
                    <button type="button" disabled={!!item.myVote} onClick={() => onVoteProposal(item._id, "dislike")}>
                      Dislike
                    </button>
                  </div>
                  {item.status === "approved" && String(item.createdBy?._id || item.createdBy) === String(profile?._id) ? (
                    <div className="inline-actions">
                      <input
                        placeholder="Paste Teams link"
                        value={meetingLinkDrafts[item._id] || item.meetingLink || ""}
                        onChange={(e) =>
                          setMeetingLinkDrafts((prev) => ({
                            ...prev,
                            [item._id]: e.target.value,
                          }))
                        }
                      />
                      <button type="button" onClick={() => onSetMeetingLink(item._id)}>
                        Save Link
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </section>

            <section className="panel">
              <div className="panel-head">
                <UsersRound size={20} />
                <h3>My Study Sessions</h3>
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
                  <li>No study sessions yet.</li>
                )}
              </ul>
            </section>
          </>
        ) : null}

        {activeView === "addnote" ? (
          <section className="panel">
            <div className="panel-head">
              <CircleHelp size={20} />
              <h3>{editingId ? "Edit Request" : "Post a Request"}</h3>
            </div>
            <form className="mini-form" onSubmit={onSubmit}>
              <select name="moduleId" value={draft.moduleId} onChange={onDraftChange}>
                <option value="">Select Module</option>
                {modules.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.moduleCode} - {item.moduleName}
                  </option>
                ))}
              </select>
              <textarea
                name="message"
                value={draft.message}
                onChange={onDraftChange}
                placeholder="Example: I need past papers for ITPM module"
              />
              <div className="toggle-wrap">
                <label>Priority</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={draft.priority === "medium" ? "toggle-btn active medium" : "toggle-btn medium"}
                    onClick={() => setDraft((prev) => ({ ...prev, priority: "medium" }))}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    className={draft.priority === "urgent" ? "toggle-btn active urgent" : "toggle-btn urgent"}
                    onClick={() => setDraft((prev) => ({ ...prev, priority: "urgent" }))}
                  >
                    Urgent
                  </button>
                </div>
              </div>

              <button type="submit" disabled={!canSubmit || saving}>
                {saving ? "Saving..." : editingId ? "Update Request" : "Post Request"}
              </button>
              <button type="button" className="btn-secondary user-action" onClick={clearDraft}>
                Cancel
              </button>
            </form>
          </section>
        ) : null}

        {activeView === "leaderboard" ? (
          <section className="panel">
            <div className="panel-head">
              <Trophy size={20} />
              <h3>Most Trusted Users (min 5 approved docs)</h3>
            </div>
            <ul className="list">
              {leaderboard.length ? (
                leaderboard.map((item, index) => (
                  <li key={item.userId}>
                    <strong>
                      #{index + 1} {item.name}
                    </strong>
                    <p>
                      {item.points} points | {item.approvedDocsCount} approved docs | helped {item.helpedRequestsCount} requests
                    </p>
                  </li>
                ))
              ) : (
                <li>No trusted users yet. Need at least 5 approved documents.</li>
              )}
            </ul>
          </section>
        ) : activeView === "requests" ? (
          <section className="help-grid">
            {requests.map((item) => {
              const canEdit = item.isOwner && !item.hasDocuments;
              return (
                <article className={getCardClass(item)} key={item._id}>
                  <div className="help-head">
                    <div>
                      <strong>
                        {item.moduleCode} - {item.moduleName}
                      </strong>
                      <p className="muted help-meta">
                        By {item.createdBy?.name || "Unknown"} | Status: <strong>{item.status}</strong>
                      </p>
                    </div>
                    <span className={item.priority === "urgent" ? "chip urgent" : "chip medium"}>
                      <Flag size={16} />
                      {item.priority}
                    </span>
                  </div>
                  <p>{item.message}</p>

                  <div className="inline-actions">
                    {canEdit ? (
                      <button type="button" className="btn-secondary user-action" onClick={() => onEdit(item)}>
                        Edit
                      </button>
                    ) : null}
                    {item.isOwner || profile?.role === "admin" ? (
                      <button type="button" className="danger-btn" onClick={() => onDelete(item._id)}>
                        Delete
                      </button>
                    ) : null}
                  </div>

                  <div className="upload-row">
                    <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                    <button type="button" className="btn-secondary user-action" onClick={() => onUploadDoc(item._id)}>
                      <Upload size={16} />
                      {uploadingId === item._id ? "Uploading..." : "Upload Document"}
                    </button>
                  </div>

                  {item.documents?.length ? (
                    <div className="doc-list">
                      <p className="muted">Submitted Documents:</p>
                      {item.documents.map((doc) => (
                        <div key={doc._id} className="doc-item">
                          <span className="doc-name">{doc.fileName}</span>
                          <div className="doc-actions">
                            <button type="button" className="doc-open-btn" onClick={() => openDataUrl(doc.fileData)}>
                              Open
                            </button>
                            <button
                              type="button"
                              className="btn-secondary user-action"
                              onClick={() => downloadDataUrl(doc.fileData, doc.fileName)}
                            >
                              <Download size={16} />
                              Download
                            </button>
                            {doc.approved ? (
                              <span className="approved-chip">Approved</span>
                            ) : item.isOwner && String(doc.uploadedBy?._id || doc.uploadedBy) !== String(profile?._id) ? (
                              <button
                                type="button"
                                className="btn-secondary user-action"
                                onClick={() => onApproveDoc(item._id, doc._id)}
                              >
                                Approve
                              </button>
                            ) : (
                              <span className="muted">Pending approval</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        ) : null}
      </main>
    </div>
  );
}
