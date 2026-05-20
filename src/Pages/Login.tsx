import { Link } from "react-router-dom"
import Navbar from "../Components/Navbar"
import "./_Page.css"

function Login() {
  return (
    <div>
      <Navbar />
      <div className="page-container">
        <div className="auth-card">
          <h1 className="auth-card__title">Sign in</h1>

          <form className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="first.last@ncf.edu"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Password"
              />
            </div>

            <button type="submit" className="auth-btn">
              Sign in
            </button>
          </form>

          <p className="auth-card__footer">
            No account yet?{" "}
            <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login