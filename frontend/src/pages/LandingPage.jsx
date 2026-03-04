import { Link } from "react-router-dom";
import { BookOpenText, FilePenLine, GraduationCap, LaptopMinimal, LibraryBig } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="landing">
      <section className="hero-card">
        <p className="tag">
          <GraduationCap size={14} />
          Study Support Dashboard
        </p>
        <h1>Support System</h1>
        <p className="subtitle">
          Track your learning flow with a clean space for admins and students.
          Start by logging in or creating an account.
        </p>
        <div className="hero-visuals" aria-hidden="true">
          <LaptopMinimal />
          <BookOpenText />
          <FilePenLine />
        </div>

        <div className="hero-actions">
          <Link className="btn btn-primary" to="/login">
            Login
          </Link>
          <Link className="btn btn-secondary" to="/register">
            Create Account
          </Link>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <span className="feature-icon">
            <FilePenLine size={18} />
          </span>
          <h3>Add Assignment</h3>
          <p>Create and track assignment items from your protected dashboard.</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">
            <LibraryBig size={18} />
          </span>
          <h3>Add Module</h3>
          <p>Build module entries and manage study material structure.</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">
            <BookOpenText size={18} />
          </span>
          <h3>View Assignments</h3>
          <p>Review your latest assignment records in one place.</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">
            <LaptopMinimal size={18} />
          </span>
          <h3>View Modules</h3>
          <p>Browse module summaries and plan upcoming work quickly.</p>
        </article>
      </section>
    </main>
  );
}
