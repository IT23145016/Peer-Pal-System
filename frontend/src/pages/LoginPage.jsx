import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { getDashboardPathByRole, setStoredAuth } from "../utils/auth";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email");
      return;
    }
    if (!form.password) {
      setError("Password is required");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", { ...form, email: normalizedEmail });
      setStoredAuth({ token: data.token, user: data.user });
      navigate(getDashboardPathByRole(data.user?.role));
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card" onSubmit={onSubmit}>
        <h1>Login</h1>
        <p className="muted">Use your admin or normal user account.</p>

        <label>Email</label>
        <input name="email" type="email" value={form.email} onChange={onChange} required />

        <label>Password</label>
        <input name="password" type="password" value={form.password} onChange={onChange} required />

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>

        <p className="muted center">
          No account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
