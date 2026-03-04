import { useEffect, useState } from "react";
import { BookOpenCheck, ClipboardList, Crown, FilePenLine, LibraryBig, ShieldCheck, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { clearStoredAuth, getStoredAuth } from "../utils/auth";

export default function AdminDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [userFilters, setUserFilters] = useState({
    year: "",
    semester: "",
    batch: "",
  });
  const [assignments, setAssignments] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [assignmentForm, setAssignmentForm] = useState({
    assignmentName: "",
    publishedDate: "",
    deadline: "",
  });
  const [moduleForm, setModuleForm] = useState({
    moduleCode: "",
    moduleName: "",
    academicYear: "1",
    semester: "1",
  });
  const [activeSection, setActiveSection] = useState("dashboard");
  const [editingModuleId, setEditingModuleId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, type: "success", message: "" });
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingModule, setSavingModule] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = getStoredAuth();
  const adminMenuItems = [
    { key: "dashboard", label: "Dashboard", icon: <ShieldCheck size={16} /> },
    { key: "assignments", label: "Assignments", icon: <ClipboardList size={16} /> },
    { key: "modules", label: "Modules", icon: <LibraryBig size={16} /> },
    { key: "users", label: "Users", icon: <Users size={16} /> },
  ];

  const loadData = async (filters = userFilters) => {
    try {
      const params = new URLSearchParams();
      params.set("role", "user");
      if (filters.year) params.set("year", filters.year);
      if (filters.semester) params.set("semester", filters.semester);
      if (filters.batch.trim()) params.set("batch", filters.batch.trim());

      const [meResponse, adminAccessResponse, assignmentsResponse, modulesResponse, usersResponse] = await Promise.all([
        api.get("/auth/me"),
        api.get("/auth/admin/dashboard"),
        api.get("/assignments"),
        api.get("/modules"),
        api.get(`/admin/users?${params.toString()}`),
      ]);

      if (adminAccessResponse.data.role !== "admin") {
        navigate("/dashboard", { replace: true });
        return;
      }

      setProfile(meResponse.data);
      setAssignments(assignmentsResponse.data);
      setModules(modulesResponse.data);
      setUsers(usersResponse.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admin dashboard data");
    }
  };

  useEffect(() => {
    loadData(userFilters);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (["dashboard", "assignments", "modules", "users"].includes(tab)) {
      setActiveSection(tab);
    } else {
      setActiveSection("dashboard");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!status && !error) return;
    const type = error ? "error" : "success";
    const message = error || status;
    setToast({ show: true, type, message });
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4500);
    return () => clearTimeout(timer);
  }, [status, error]);

  const onLogout = () => {
    clearStoredAuth();
    navigate("/");
  };

  const onAddAssignment = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!selectedModuleId || !assignmentForm.assignmentName.trim() || !assignmentForm.publishedDate || !assignmentForm.deadline) {
      setError("Select module, assignment name, published date and deadline");
      return;
    }

    try {
      setSavingAssignment(true);
      const { data } = await api.post("/assignments", {
        moduleId: selectedModuleId,
        assignmentName: assignmentForm.assignmentName.trim(),
        publishedDate: assignmentForm.publishedDate,
        deadline: assignmentForm.deadline,
      });
      setAssignmentForm({ assignmentName: "", publishedDate: "", deadline: "" });
      setSelectedModuleId("");
      const notice = data?.emailNotice;
      if (notice) {
        if (notice.skipped) {
          setStatus(`Assignment published. Email skipped (${notice.reason || "SMTP not configured or no recipients"}).`);
        } else if (typeof notice.sentCount === "number") {
          setStatus(
            `Assignment published. Email sent to ${notice.sentCount} user(s)${
              notice.dueSoonNotification ? " (urgent due-soon alert)." : "."
            }`
          );
        } else {
          setStatus(`Assignment published. Email status: ${notice.reason || "unknown"}.`);
        }
      } else {
        setStatus("Assignment published successfully");
      }
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to publish assignment");
    } finally {
      setSavingAssignment(false);
    }
  };

  const onAddModule = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!moduleForm.moduleCode.trim() || !moduleForm.moduleName.trim()) {
      setError("Module code and module name are required");
      return;
    }

    try {
      setSavingModule(true);
      const payload = {
        moduleCode: moduleForm.moduleCode.trim().toUpperCase(),
        moduleName: moduleForm.moduleName.trim(),
        academicYear: Number(moduleForm.academicYear),
        semester: Number(moduleForm.semester),
      };

      if (editingModuleId) {
        await api.put(`/modules/${editingModuleId}`, payload);
        setStatus("Module updated successfully");
      } else {
        await api.post("/modules", payload);
        setStatus("Module added successfully");
      }

      setModuleForm({
        moduleCode: "",
        moduleName: "",
        academicYear: "1",
        semester: "1",
      });
      setEditingModuleId("");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save module");
    } finally {
      setSavingModule(false);
    }
  };

  const onEditModule = (moduleItem) => {
    setModuleForm({
      moduleCode: moduleItem.moduleCode || "",
      moduleName: moduleItem.moduleName || "",
      academicYear: String(moduleItem.academicYear || "1"),
      semester: String(moduleItem.semester || "1"),
    });
    setEditingModuleId(moduleItem._id);
  };

  const onDeleteModule = async (id) => {
    try {
      setError("");
      setStatus("");
      await api.delete(`/modules/${id}`);
      if (editingModuleId === id) {
        setEditingModuleId("");
        setModuleForm({
          moduleCode: "",
          moduleName: "",
          academicYear: "1",
          semester: "1",
        });
      }
      setStatus("Module deleted successfully");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete module");
    }
  };

  const onToggleUserStatus = async (user) => {
    try {
      setError("");
      setStatus("");
      await api.patch(`/admin/users/${user._id}/status`, { isActive: !(user.isActive === false) });
      setStatus(`User ${user.isActive === false ? "activated" : "deactivated"} successfully`);
      await loadData(userFilters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user status");
    }
  };

  const onToggleBatchTop = async (user) => {
    try {
      setError("");
      setStatus("");
      let moduleSpecialization = user.moduleSpecialization || "";
      const nextValue = !user.isBatchTop;
      if (nextValue) {
        moduleSpecialization = window.prompt("Enter module specialization for this Batch Top (e.g. ITPM):", moduleSpecialization) || "";
      }
      await api.patch(`/admin/users/${user._id}/batch-top`, {
        isBatchTop: nextValue,
        moduleSpecialization,
      });
      setStatus(nextValue ? "User marked as Batch Top" : "Batch Top role removed");
      await loadData(userFilters);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update Batch Top status");
    }
  };

  const onFilterChange = (e) => {
    setUserFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onApplyFilters = async () => {
    setError("");
    setStatus("");
    await loadData(userFilters);
  };

  const onResetFilters = async () => {
    const reset = { year: "", semester: "", batch: "" };
    setUserFilters(reset);
    setError("");
    setStatus("");
    await loadData(reset);
  };

  return (
    <div className="app-layout">
      {toast.show ? (
        <div className={`toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          <strong>{toast.type === "error" ? "Error" : "Notification"}</strong>
          <p>{toast.message}</p>
        </div>
      ) : null}
      <Sidebar
        profile={profile || auth?.user}
        onLogout={onLogout}
        menuItems={adminMenuItems}
        activeMenu={activeSection}
        onMenuSelect={setActiveSection}
        onHomeClick={() => navigate("/admin/dashboard?tab=dashboard")}
      />
      <main className="page-shell">
        <header className="topbar">
          <h2>
            <ShieldCheck size={18} />
            Admin Dashboard
          </h2>
        </header>

        <section className="welcome-card">
          <h1>Welcome back, {profile?.name || auth?.user?.name || "Admin"}</h1>
          <p className="muted">Role: admin</p>
        </section>

        {error ? <p className="error">{error}</p> : null}
        {status ? <p className="success">{status}</p> : null}

        {activeSection === "dashboard" ? (
          <section className="core-grid">
            <article className="panel">
              <div className="panel-head">
                <ClipboardList size={18} />
                <h3>Total Assignments</h3>
              </div>
              <p className="metric">{assignments.length}</p>
            </article>
            <article className="panel">
              <div className="panel-head">
                <LibraryBig size={18} />
                <h3>Total Modules</h3>
              </div>
              <p className="metric">{modules.length}</p>
            </article>
            <article className="panel">
              <div className="panel-head">
                <Users size={18} />
                <h3>Total Students</h3>
              </div>
              <p className="metric">{users.length}</p>
            </article>
          </section>
        ) : null}

        {activeSection === "assignments" ? (
          <section className="core-grid">
            <article className="panel">
              <div className="panel-head">
                <FilePenLine size={18} />
                <h3>Publish Assignment</h3>
              </div>
              <p className="muted">Select a module card, then publish with dates.</p>
              <div className="module-card-grid">
                {modules.map((moduleItem) => (
                  <button
                    key={moduleItem._id}
                    type="button"
                    className={selectedModuleId === moduleItem._id ? "module-card active" : "module-card"}
                    onClick={() => setSelectedModuleId(moduleItem._id)}
                  >
                    <strong>{moduleItem.moduleCode}</strong>
                    <span>{moduleItem.moduleName}</span>
                    <small>
                      Year {moduleItem.academicYear} | Sem {moduleItem.semester}
                    </small>
                  </button>
                ))}
              </div>
              <form onSubmit={onAddAssignment} className="mini-form">
                <input
                  placeholder="Assignment name"
                  value={assignmentForm.assignmentName}
                  onChange={(e) => setAssignmentForm((prev) => ({ ...prev, assignmentName: e.target.value }))}
                />
                <label>Published Date</label>
                <input
                  type="date"
                  value={assignmentForm.publishedDate}
                  onChange={(e) => setAssignmentForm((prev) => ({ ...prev, publishedDate: e.target.value }))}
                />
                <label>Deadline</label>
                <input
                  type="date"
                  value={assignmentForm.deadline}
                  onChange={(e) => setAssignmentForm((prev) => ({ ...prev, deadline: e.target.value }))}
                />
                <button type="submit" disabled={savingAssignment}>
                  {savingAssignment ? "Publishing..." : "Publish Assignment"}
                </button>
              </form>
            </article>

            <article className="panel">
              <div className="panel-head">
                <BookOpenCheck size={18} />
                <h3>Published Assignments</h3>
              </div>
              <ul className="list">
                {assignments.length ? (
                  assignments.map((item) => (
                    <li key={item._id}>
                      <strong>
                        {item.moduleCode} - {item.assignmentName}
                      </strong>
                      <p>
                        Published: {new Date(item.publishedDate).toLocaleDateString()} | Deadline:{" "}
                        {new Date(item.deadline).toLocaleDateString()}
                      </p>
                    </li>
                  ))
                ) : (
                  <li>No assignments yet</li>
                )}
              </ul>
            </article>
          </section>
        ) : null}

        {activeSection === "modules" ? (
          <section className="core-grid">
            <article className="panel">
              <div className="panel-head">
                <LibraryBig size={18} />
                <h3>{editingModuleId ? "Edit Module" : "Add Module"}</h3>
              </div>
              <form onSubmit={onAddModule} className="mini-form">
                <input
                  placeholder="Module code (e.g. IT2030)"
                  value={moduleForm.moduleCode}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, moduleCode: e.target.value }))}
                />
                <input
                  placeholder="Module name"
                  value={moduleForm.moduleName}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, moduleName: e.target.value }))}
                />
                <select
                  value={moduleForm.academicYear}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, academicYear: e.target.value }))}
                >
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
                <select
                  value={moduleForm.semester}
                  onChange={(e) => setModuleForm((prev) => ({ ...prev, semester: e.target.value }))}
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
                <button type="submit" disabled={savingModule}>
                  {savingModule ? "Saving..." : editingModuleId ? "Update Module" : "Add Module"}
                </button>
                {editingModuleId ? (
                  <button
                    type="button"
                    className="btn-secondary user-action"
                    onClick={() => {
                      setEditingModuleId("");
                      setModuleForm({
                        moduleCode: "",
                        moduleName: "",
                        academicYear: "1",
                        semester: "1",
                      });
                    }}
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </form>
            </article>
            <article className="panel">
              <div className="panel-head">
                <BookOpenCheck size={18} />
                <h3>Modules List</h3>
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
                      <div className="inline-actions">
                        <button type="button" className="btn-secondary user-action" onClick={() => onEditModule(item)}>
                          Edit
                        </button>
                        <button type="button" className="danger-btn" onClick={() => onDeleteModule(item._id)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li>No modules yet</li>
                )}
              </ul>
            </article>
          </section>
        ) : null}

        {activeSection === "users" ? (
          <section className="core-grid">
            <article className="panel panel-wide">
              <div className="panel-head">
                <Users size={18} />
                <h3>Manage Users</h3>
              </div>
              <div className="filter-row">
                <select name="year" value={userFilters.year} onChange={onFilterChange}>
                  <option value="">All Years</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
                <select name="semester" value={userFilters.semester} onChange={onFilterChange}>
                  <option value="">All Semesters</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
                <input
                  name="batch"
                  placeholder="Batch (optional)"
                  value={userFilters.batch}
                  onChange={onFilterChange}
                />
                <button type="button" onClick={onApplyFilters}>
                  Filter
                </button>
                <button type="button" className="btn-secondary user-action" onClick={onResetFilters}>
                  Reset
                </button>
              </div>
              <div className="user-table">
                <div className="user-table-head">
                  <span>Name</span>
                  <span>Email</span>
                  <span>Year/Sem</span>
                  <span>Batch</span>
                  <span>Batch Top</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {users.map((user) => {
                  const isActive = user.isActive !== false;
                  const canToggle = String(user._id) !== String(profile?._id);
                  return (
                    <div className="user-row" key={user._id}>
                      <span>{user.name}</span>
                      <span>{user.email}</span>
                      <span>
                        Y{user.academicYear || "-"} / S{user.semester || "-"}
                      </span>
                      <span>{user.batch || "-"}</span>
                      <span>
                        {user.isBatchTop ? (
                          <span className="batchtop-chip" title={user.moduleSpecialization || "Batch Top"}>
                            <Crown size={14} />
                            {user.moduleSpecialization || "Batch Top"}
                          </span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </span>
                      <span className={isActive ? "status-active" : "status-inactive"}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                      <span>
                        <div className="inline-actions">
                          <button
                            type="button"
                            className={user.isBatchTop ? "icon-action-btn active" : "icon-action-btn"}
                            onClick={() => onToggleBatchTop(user)}
                            title={user.isBatchTop ? "Remove Batch Top" : "Mark as Batch Top"}
                          >
                            <Crown size={16} />
                          </button>
                          <button
                            type="button"
                            className={isActive ? "danger-btn" : "btn-secondary user-action"}
                            onClick={() => onToggleUserStatus(user)}
                            disabled={!canToggle}
                          >
                            {isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        ) : null}
      </main>
    </div>
  );
}
