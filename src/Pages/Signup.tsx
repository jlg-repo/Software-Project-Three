import { Link } from "react-router-dom"
import Navbar from "../Components/Navbar"
import "./_Page.css"

function SignUp() {
  return (
    <div>
      <Navbar />
      <div className="page-container">
        <div className="auth-card">
          <h1 className="auth-card__title">Create an account</h1>

          <form className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

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
              Create account
            </button>
          </form>

          <p className="auth-card__footer">
            Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUp