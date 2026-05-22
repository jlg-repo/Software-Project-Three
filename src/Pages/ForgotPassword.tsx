import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../Components/Navbar";
import { apiFetch } from "../lib/api";
import "./_Page.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } catch {
      // Intentionally swallow — server always returns 200 to avoid leaking emails
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <div className="auth-card">
          <h1 className="auth-card__title">Reset password</h1>

          {submitted ? (
            <>
              <p style={{ fontSize: "14px", color: "#4a4040", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
                If that email is registered, a reset link is on its way. Check your inbox and spam folder.
              </p>
              <p className="auth-card__footer">
                <Link to="/login">Back to sign in</Link>
              </p>
            </>
          ) : (
            <>
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="first.last@ncf.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <p className="auth-card__footer">
                Remembered it? <Link to="/login">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
