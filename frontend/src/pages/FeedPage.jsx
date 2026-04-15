/**
 * FeedPage.jsx
 * ─────────────────────────────────────────────────────────────
 * Single-column social feed:
 *   Sticky navbar → Profile → Post composer → News feed
 */

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UnauthorizedError,
  createPost,
  fetchPosts,
  sortByNewestFirst,
  uploadPostImage,
} from "../api/client";
import {
  ComposerCard,
  FeedHeader,
  FeedSkeletonList,
  PostCard,
  UserProfileSection,
} from "../components/FeedBlocks";
import { useAuth } from "../context/AuthContext";

function FeedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, fullName, email, profilePhotoUrl, logout } = useAuth();

  /* ── Feed state ── */
  const [posts,              setPosts]              = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const [loadError,          setLoadError]          = useState("");

  /* ── Composer state ── */
  const [composerContent,    setComposerContent]    = useState("");
  const [composerVisibility, setComposerVisibility] = useState("Public");
  const [composerError,      setComposerError]      = useState("");
  const [posting,            setPosting]            = useState(false);
  const [imagePreview,       setImagePreview]       = useState("");
  const [imageName,          setImageName]          = useState("");
  const [imageFile,          setImageFile]          = useState(null);

  const imageRef     = useRef(null);
  const objectUrlRef = useRef("");

  const profileAvatar = profilePhotoUrl || "/assets/images/profile-avatar.png";
  const currentUser   = {
    id:     email || fullName || "current-user",
    name:   fullName || email || "User",
    email:  email || "",
    avatar: profileAvatar,
  };

  /* ── Load posts ── */
  useEffect(() => {
    let active = true;

    async function loadPosts() {
      setLoading(true);
      setLoadError("");
      try {
        const data = await fetchPosts(token);
        if (!active) return;
        setPosts(sortByNewestFirst(data));
      } catch (err) {
        if (!active) return;
        if (handleUnauthorized(err)) return;
        setLoadError(err.message || "Unable to load feed");
        setPosts([]);
      } finally {
        if (active) {
          setLoading(false);
          setInitialLoadPending(false);
        }
      }
    }

    loadPosts();
    return () => { active = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Cleanup blob URLs ── */
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  /* ── Image helpers ── */
  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setComposerError("Please select a valid image file");
      if (imageRef.current) imageRef.current.value = "";
      return;
    }
    setComposerError("");
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setImagePreview(nextUrl);
    setImageName(file.name);
    setImageFile(file);
  }

  function handleImageClear() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
    setImagePreview("");
    setImageName("");
    setImageFile(null);
    if (imageRef.current) imageRef.current.value = "";
  }

  /* ── Create post ── */
  async function handleCreatePost() {
    if (!composerContent.trim()) return;
    setPosting(true);
    setComposerError("");
    try {
      let uploadedImageUrl = "";
      if (imageFile) uploadedImageUrl = await uploadPostImage(token, imageFile);

      const created = await createPost(token, {
        content:    composerContent.trim(),
        visibility: String(composerVisibility || "PUBLIC").toUpperCase(),
        ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
      });

      setPosts((curr) => sortByNewestFirst([created, ...curr]));
      setComposerContent("");
      handleImageClear();
    } catch (err) {
      if (handleUnauthorized(err)) return;
      const msg = err.message || "Failed to create post";
      setComposerError(
        msg.toLowerCase().includes("upload")
          ? `${msg}. Remove the image and try again.`
          : msg
      );
    } finally {
      setPosting(false);
    }
  }

  function triggerImagePicker() { imageRef.current?.click(); }

  function handleUnauthorized(error) {
    if (!(error instanceof UnauthorizedError)) return false;
    logout();
    navigate("/login", { replace: true });
    return true;
  }

  function handlePostUpdated(nextPost) {
    setPosts((curr) =>
      curr.map((p) => (String(p.id) === String(nextPost.id) ? nextPost : p))
    );
  }

  /* ── Flags ── */
  const showSkeleton        = loading && initialLoadPending && posts.length === 0;
  const showLoginTransition = location.state?.loginTransition === true && showSkeleton;

  /* ════════════════════════════════════════════════════════ */
  return (
    <div className="social-feed-shell">
      {/* Sticky navbar */}
      <FeedHeader
        fullName={fullName}
        email={email}
        avatarSrc={profileAvatar}
        onLogout={logout}
      />

      <main className="feed-main-layout">
        <div className="feed-center-column">
          <UserProfileSection
            fullName={fullName}
            email={email}
            avatarSrc={profileAvatar}
          />

          {/* Post composer */}
          <ComposerCard
            content={composerContent}
            onContentChange={setComposerContent}
            onSubmit={handleCreatePost}
            visibility={composerVisibility}
            onVisibilityChange={setComposerVisibility}
            imagePreview={imagePreview}
            imageName={imageName}
            onImagePick={triggerImagePicker}
            onImageClear={handleImageClear}
            posting={posting}
            error={composerError}
            authorName={fullName || "You"}
            avatarSrc={profileAvatar}
          />

          {/* Status banners */}
          {loadError && (
            <div className="feed-banner feed-banner-error" role="alert">
              ⚠ {loadError}
            </div>
          )}
          {showLoginTransition && (
            <div className="feed-banner" role="status">
              ✅ Welcome back! Preparing your feed…
            </div>
          )}

          {/* News feed */}
          {showSkeleton ? (
            <FeedSkeletonList count={3} />
          ) : (
            <div className="feed-post-list">
              {posts.length === 0 && !loading && (
                <div className="feed-empty-state">
                  <span className="feed-empty-icon">🚀</span>
                  <h3>Nothing here yet</h3>
                  <p>Be the first to share something with your community!</p>
                </div>
              )}
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  token={token}
                  onPostUpdated={handlePostUpdated}
                  onUnauthorized={() => {
                    logout();
                    navigate("/login", { replace: true });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Hidden file input */}
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleImagePick}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

export default FeedPage;
