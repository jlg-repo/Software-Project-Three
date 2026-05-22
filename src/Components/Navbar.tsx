import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { session, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">H</div>
        <div>
          <span className="brand-title">Hamilton Dining</span>
          <span className="brand-subtitle">College Menu Portal</span>
        </div>
      </div>

      <div className="navbar-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/favorites">Favorites</NavLink>
        {!session ? (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/signup">Sign Up</NavLink>
          </>
        ) : (
          <>
            <span className="nav-user">{session.user.name.split(" ")[0]}</span>
            <button type="button" className="nav-logout" onClick={logout}>
              Log out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
