import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/client";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login({ email: email.trim(), password });
      auth.login({
        token: data.token,
        fullName: data.fullName,
        email: data.email,
        profilePhotoUrl: data.profilePhotoUrl,
        rememberMe
      });
      const nextPath = location.state?.from || "/feed";
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      variant="login"
      image="/assets/images/login.png"
      imageAlt="Login illustration"
      logo="/assets/images/logo.svg"
      eyebrow="Welcome back"
      title="Login to your account"
      footerText="Dont have an account?"
      footerLinkLabel="Create New Account"
      footerLinkTo="/register"
    >

      <form className="_social_login_form" onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
            <div className="_social_login_form_input _mar_b14">
              <label className="_social_login_label _mar_b8" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                className="form-control _social_login_input"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
            <div className="_social_login_form_input _mar_b14">
              <label className="_social_login_label _mar_b8" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-control _social_login_input"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
            <label className="form-check _social_login_form_check">
              <input
                className="form-check-input _social_login_form_check_input"
                type="radio"
                name="rememberMe"
                checked={rememberMe}
                onChange={() => setRememberMe(true)}
              />
              <span className="form-check-label _social_login_form_check_label">Remember me</span>
            </label>
          </div>
          <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
            <div className="_social_login_form_left">
              <p className="_social_login_form_left_para">
                Forgot password?
              </p>
            </div>
          </div>
        </div>

        {error ? <p className="auth-inline-error">{error}</p> : null}

        <div className="row">
          <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
            <div className="_social_login_form_btn _mar_t40 _mar_b60">
              <button type="submit" className="_social_login_form_btn_link _btn1 auth-submit-btn" disabled={loading}>
                {loading ? "Logging in..." : "Login now"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </AuthShell>
  );
}

export default LoginPage;

