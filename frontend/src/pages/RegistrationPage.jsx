import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/client";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

function RegistrationPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!termsAccepted) {
      setError("Please agree to the terms and conditions");
      return;
    }

    setLoading(true);
    try {
      const fullNameFromEmail = email.includes("@") ? email.split("@")[0] : email;
      const fullName = fullNameFromEmail.trim().length >= 2 ? fullNameFromEmail.trim() : "New User";
      const data = await register({ fullName, email: email.trim(), password });
      auth.login({
        token: data.token,
        fullName: data.fullName,
        email: data.email,
        profilePhotoUrl: data.profilePhotoUrl
      });
      navigate("/feed", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      variant="register"
      image="/assets/images/registration.png"
      darkImage="/assets/images/registration1.png"
      imageAlt="Registration illustration"
      logo="/assets/images/logo.svg"
      eyebrow="Get Started Now"
      title="Registration"
      footerText="Already registered?"
      footerLinkLabel="Log In"
      footerLinkTo="/login"
    >

      <form className="_social_registration_form" onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
            <div className="_social_registration_form_input _mar_b14">
              <label className="_social_registration_label _mar_b8" htmlFor="register-email">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                className="form-control _social_registration_input"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
            <div className="_social_registration_form_input _mar_b14">
              <label className="_social_registration_label _mar_b8" htmlFor="register-password">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                className="form-control _social_registration_input"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
            <div className="_social_registration_form_input _mar_b14">
              <label className="_social_registration_label _mar_b8" htmlFor="register-confirm-password">
                Repeat Password
              </label>
              <input
                id="register-confirm-password"
                type="password"
                className="form-control _social_registration_input"
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-12 col-xl-12 col-md-12 col-sm-12">
            <label className="form-check _social_registration_form_check">
              <input
                className="form-check-input _social_registration_form_check_input"
                type="radio"
                name="terms"
                checked={termsAccepted}
                onChange={() => setTermsAccepted(true)}
              />
              <span className="form-check-label _social_registration_form_check_label">I agree to terms &amp; conditions</span>
            </label>
          </div>
        </div>

        {error ? <p className="auth-inline-error">{error}</p> : null}

        <div className="row">
          <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
            <div className="_social_registration_form_btn _mar_t40 _mar_b60">
              <button type="submit" className="_social_registration_form_btn_link _btn1 auth-submit-btn" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </AuthShell>
  );
}

export default RegistrationPage;

