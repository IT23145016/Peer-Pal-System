import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { getDashboardPathByRole, setStoredAuth } from "../utils/auth";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    academicYear: "1",
    semester: "1",
    batch: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const normalizedName = form.name.trim();
    const normalizedEmail = form.email.trim().toLowerCase();
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (normalizedName.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email");
      return;
    }
    if (!strongPassword.test(form.password)) {
      setError("Password needs 8+ chars, uppercase, lowercase, and a number");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!["1", "2", "3", "4", "5", "6"].includes(String(form.academicYear))) {
      setError("Select a valid academic year");
      return;
    }
    if (!["1", "2"].includes(String(form.semester))) {
      setError("Select a valid semester");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        name: normalizedName,
        email: normalizedEmail,
        academicYear: Number(form.academicYear),
        semester: Number(form.semester),
        batch: form.batch.trim(),
      };
      const { data } = await api.post("/auth/register", payload);
      setStoredAuth({ token: data.token, user: data.user });
      navigate(getDashboardPathByRole(data.user?.role));
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card" onSubmit={onSubmit}>
        <h1>Create Account</h1>
        <p className="muted">Create your student account. User ID is auto-generated.</p>

        <label>Name</label>
        <input name="name" value={form.name} onChange={onChange} required />

        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={onChange} required />

        <label>Password</label>
        <input name="password" type="password" value={form.password} onChange={onChange} required />

        <label>Re-enter Password</label>
        <input
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={onChange}
          required
        />

        <label>Academic Year</label>
        <select name="academicYear" value={form.academicYear} onChange={onChange}>
          <option value="1">Year 1</option>
          <option value="2">Year 2</option>
          <option value="3">Year 3</option>
          <option value="4">Year 4</option>
        </select>

        <label>Semester</label>
        <select name="semester" value={form.semester} onChange={onChange}>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
        </select>

        <label>Batch</label>
        <input name="batch" value={form.batch} onChange={onChange} placeholder="e.g. 2024-CS-A" />

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>

        <p className="muted center">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
