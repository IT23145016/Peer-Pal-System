import { useEffect, useMemo, useState } from "react";
import { Camera, CircleUserRound, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { clearStoredAuth, getStoredAuth, setStoredAuth } from "../utils/auth";

const toDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", avatar: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [editingRequestId, setEditingRequestId] = useState("");
  const [requestDraft, setRequestDraft] = useState({ message: "", priority: "medium", status: "open" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const auth = getStoredAuth();

  const canSubmit = useMemo(() => form.name.trim() && form.email.trim(), [form.email, form.name]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const [meResponse, myRequestsResponse] = await Promise.all([api.get("/auth/me"), api.get("/helpdesk/my")]);
        const data = meResponse.data;
        setProfile(data);
        setMyRequests(myRequestsResponse.data);
        setForm({
          name: data.name || "",
          email: data.email || "",
          avatar: data.avatar || "",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const onLogout = () => {
    clearStoredAuth();
    navigate("/");
  };

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("Image must be less than 1MB");
      return;
    }
    setError("");
    const dataUrl = await toDataUrl(file);
    setForm((prev) => ({ ...prev, avatar: dataUrl }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalizedName = form.name.trim();
    const normalizedEmail = form.email.trim().toLowerCase();

    if (normalizedName.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email");
      return;
    }

    try {
      setSaving(true);
      const { data } = await api.put("/auth/me", {
        name: normalizedName,
        email: normalizedEmail,
        avatar: form.avatar,
      });
      setProfile(data.user);
      setForm({
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || "",
      });
      setStoredAuth({
        ...auth,
        user: {
          ...auth?.user,
          name: data.user.name,
          email: data.user.email,
          academicYear: data.user.academicYear,
          semester: data.user.semester,
          batch: data.user.batch,
          avatar: data.user.avatar || "",
          role: data.user.role,
          isBatchTop: data.user.isBatchTop,
          isTalented: data.user.isTalented,
          moduleSpecialization: data.user.moduleSpecialization,
        },
      });
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteAccount = async () => {
    const confirmed = window.confirm("Delete this account permanently?");
    if (!confirmed) return;

    try {
      setDeleting(true);
      await api.delete("/auth/me");
      clearStoredAuth();
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const onEditRequest = (item) => {
    setEditingRequestId(item._id);
    setRequestDraft({
      message: item.message || "",
      priority: item.priority || "medium",
      status: item.status || "open",
    });
  };

  const onUpdateRequest = async (e) => {
    e.preventDefault();
    if (!editingRequestId) return;
    try {
      await api.put(`/helpdesk/${editingRequestId}`, requestDraft);
      setSuccess("Request updated");
      setEditingRequestId("");
      setRequestDraft({ message: "", priority: "medium", status: "open" });
      const { data } = await api.get("/helpdesk/my");
      setMyRequests(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update request");
    }
  };

  const onDeleteRequest = async (id) => {
    try {
      await api.delete(`/helpdesk/${id}`);
      setSuccess("Request deleted");
      const { data } = await api.get("/helpdesk/my");
      setMyRequests(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete request");
    }
  };

  return (
    <div className="app-layout">
      <Sidebar profile={profile || auth?.user} onLogout={onLogout} />
      <main className="page-shell">
        <header className="topbar">
          <h2>
            <CircleUserRound size={18} />
            Profile Settings
          </h2>
        </header>

        <section className="profile-card">
          {loading ? <p className="muted">Loading profile...</p> : null}
          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}

          {!loading ? (
            <form className="profile-form" onSubmit={onSave}>
              <div className="photo-row">
                {form.avatar ? <img className="profile-preview" src={form.avatar} alt="Profile preview" /> : null}
                <label className="photo-upload">
                  <Camera size={16} />
                  Upload Photo
                  <input type="file" accept="image/*" onChange={onPhotoChange} />
                </label>
              </div>

              <label>Name</label>
              <input name="name" value={form.name} onChange={onChange} />

              <label>Email</label>
              <input name="email" value={form.email} onChange={onChange} />

              <div className="profile-actions">
                <button type="submit" disabled={!canSubmit || saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="danger-btn" onClick={onDeleteAccount} disabled={deleting}>
                  <Trash2 size={15} />
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>

              <div className="info-grid">
                <p>
                  <span>Academic Year</span>
                  {profile?.academicYear || "-"}
                </p>
                <p>
                  <span>Semester</span>
                  {profile?.semester || "-"}
                </p>
                <p>
                  <span>Batch</span>
                  {profile?.batch || "-"}
                </p>
              </div>
            </form>
          ) : null}
        </section>

        <section className="profile-card">
          <h1>My Help Requests</h1>
          {editingRequestId ? (
            <form className="mini-form" onSubmit={onUpdateRequest}>
              <textarea
                value={requestDraft.message}
                onChange={(e) => setRequestDraft((prev) => ({ ...prev, message: e.target.value }))}
              />
              <select
                value={requestDraft.priority}
                onChange={(e) => setRequestDraft((prev) => ({ ...prev, priority: e.target.value }))}
              >
                <option value="medium">Medium</option>
                <option value="urgent">Urgent</option>
              </select>
              <select
                value={requestDraft.status}
                onChange={(e) => setRequestDraft((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="received">Received</option>
              </select>
              <button type="submit">Save Request</button>
              <button
                type="button"
                className="btn-secondary user-action"
                onClick={() => {
                  setEditingRequestId("");
                  setRequestDraft({ message: "", priority: "medium", status: "open" });
                }}
              >
                Cancel
              </button>
            </form>
          ) : null}
          <ul className="list">
            {myRequests.length ? (
              myRequests.map((item) => (
                <li key={item._id}>
                  <strong>
                    {item.moduleCode} - {item.moduleName}
                  </strong>
                  <p>{item.message}</p>
                  <p className="muted">
                    {item.priority} | {item.status}
                  </p>
                  <div className="inline-actions">
                    {item.hasDocuments ? (
                      <span className="muted">Edit disabled: documents submitted</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary user-action"
                        onClick={() => onEditRequest(item)}
                      >
                        Edit
                      </button>
                    )}
                    <button type="button" className="danger-btn" onClick={() => onDeleteRequest(item._id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li>No help requests posted yet.</li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
