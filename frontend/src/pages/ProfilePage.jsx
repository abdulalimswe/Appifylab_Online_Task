import { FeedHeader } from "../components/FeedBlocks";
import { useAuth } from "../context/AuthContext";

function ProfilePage() {
  const { fullName, email, profilePhotoUrl, logout } = useAuth();
  const avatarSrc = profilePhotoUrl || "/assets/images/profile-avatar.png";
  const displayName = fullName || "User";

  return (
    <div className="social-feed-shell">
      <FeedHeader
        fullName={fullName}
        email={email}
        avatarSrc={avatarSrc}
        onLogout={logout}
      />

      <main className="profile-page-layout">
        <section className="profile-page-card" aria-label="User profile">
          <div className="profile-page-image-wrap">
            <img
              src={avatarSrc}
              alt={`${displayName} profile`}
              width="500"
              height="500"
              className="profile-page-image"
            />
          </div>

          <div className="profile-page-content">
            <p className="profile-page-label">Profile</p>
            <h1 className="profile-page-name">{displayName}</h1>
            <p className="profile-page-email">{email || "No email available"}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ProfilePage;

