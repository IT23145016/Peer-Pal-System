import { Link, Outlet } from "react-router-dom";

export default function PublicLayout() {
  const year = new Date().getFullYear();

  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="public-brand" to="/">
          PeerPal Support System
        </Link>
        <nav className="public-nav" aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </nav>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <p>© {year} PeerPal. All rights reserved.</p>
        <p>Built for student support, assignments, and study sessions.</p>
      </footer>
    </div>
  );
}
