import { useEffect, useState } from "react";
import { CircleHelp, UsersRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { clearStoredAuth, getStoredAuth } from "../utils/auth";

export default function StudySessionsRequestPage() {
  const [profile, setProfile] = useState(null);
  const [modules, setModules] = useState([]);
  const [batchTops, setBatchTops] = useState([]);
  const [myBatchTopRequests, setMyBatchTopRequests] = useState([]);
  const [batchTopDraft, setBatchTopDraft] = useState({
    moduleId: "",
    note: "",
    targetBatchTop: "",
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();
  const auth = getStoredAuth();

  const loadData = async () => {
    try {
      const [meResponse, modulesResponse, batchTopsResponse, myBtReqResponse] = await Promise.all([
        api.get("/auth/me"),
        api.get("/modules"),
        api.get("/study-support/batch-tops"),
        api.get("/study-support/requests/my"),
      ]);
      setProfile(meResponse.data);
      setModules(modulesResponse.data);
      setBatchTops(batchTopsResponse.data);
      setMyBatchTopRequests(myBtReqResponse.data);
      setBatchTopDraft((prev) => ({
        ...prev,
        moduleId: prev.moduleId || modulesResponse.data?.[0]?._id || "",
        targetBatchTop: prev.targetBatchTop || batchTopsResponse.data?.[0]?._id || "",
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load request flow");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onLogout = () => {
    clearStoredAuth();
    navigate("/");
  };

  const onSendBatchTopRequest = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    if (!batchTopDraft.moduleId || !batchTopDraft.targetBatchTop || !batchTopDraft.note.trim()) {
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

  return (
    <div className="app-layout">
      <Sidebar profile={profile || auth?.user} onLogout={onLogout} />
      <main className="page-shell">
        <header className="topbar">
          <h2>
            <CircleHelp size={24} />
            Request Session
          </h2>
          <Link to="/study-sessions" className="btn btn-ghost">
            Back
          </Link>
        </header>

        {error ? <p className="error">{error}</p> : null}
        {status ? <p className="success">{status}</p> : null}

        <section className="core-grid">
          <article className="panel">
            <div className="panel-head">
              <CircleHelp size={20} />
              <h3>Request a Session</h3>
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
              <button type="submit">Send Request</button>
            </form>

            <ul className="list">
              {myBatchTopRequests.slice(0, 6).map((item) => (
                <li key={item._id}>
                  <strong>{item.moduleCode}</strong>
                  <p className="muted">
                    {item.targetBatchTop?.name || "-"} | {item.status}
                  </p>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
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
          </article>
        </section>
      </main>
    </div>
  );
}
