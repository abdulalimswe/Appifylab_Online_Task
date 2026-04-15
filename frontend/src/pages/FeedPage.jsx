/**
 * FeedPage.jsx
 * ─────────────────────────────────────────────────────────────
 * Main social feed page. Three-column layout:
 *   Left  │ Explore · Suggested People · Events
 *   Center│ Story rail · Post composer · Post list
 *   Right │ You might like · Friends online
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
  EventList,
  FeedHeader,
  FeedSkeletonList,
  PostCard,
  RightPeopleList,
  SidebarCard,
  StoryRail,
  SuggestedPeopleList,
} from "../components/FeedBlocks";
import { useAuth } from "../context/AuthContext";
import {
  demoPosts,
  eventCards,
  exploreItems,
  rightSidebarPeople,
  sortSeedPostsNewestFirst,
  storyCards,
  suggestedPeople,
} from "../data/feedSeeds";

function FeedPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
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

  const imageRef      = useRef(null);
  const objectUrlRef  = useRef("");

  const profileAvatar = profilePhotoUrl || "/assets/images/profile-avatar.png";
  const currentUser   = {
    id:     email || fullName || "current-user",
    name:   fullName || email || "User",
    email:  email || "",
    avatar: profileAvatar,
  };

  /* ── Load posts on mount / token change ── */
  useEffect(() => {
    let active = true;

    async function loadPosts() {
      setLoading(true);
      setLoadError("");
      try {
        const data = await fetchPosts(token);
        if (!active) return;
        setPosts(data.length ? sortByNewestFirst(data) : sortSeedPostsNewestFirst(demoPosts));
      } catch (err) {
        if (!active) return;
        if (handleUnauthorized(err)) return;
        setLoadError(err.message || "Unable to load feed");
        setPosts(sortSeedPostsNewestFirst(demoPosts));
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

  /* ── Clean up blob URLs on unmount ── */
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  /* ── Image picking ── */
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
      if (imageFile) {
        uploadedImageUrl = await uploadPostImage(token, imageFile);
      }

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
          ? `${msg}. You can remove the image and try again.`
          : msg
      );
    } finally {
      setPosting(false);
    }
  }

  function triggerImagePicker() {
    imageRef.current?.click();
  }

  /* ── Session helpers ── */
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

  /* ── Derived flags ── */
  const showSkeleton       = loading && initialLoadPending && posts.length === 0;
  const showLoginTransition = location.state?.loginTransition === true && showSkeleton;

  /* ════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════ */
  return (
    <div className="_layout _layout_main_wrapper social-feed-shell">
      <div className="_main_layout">
        {/* ── Sticky navbar ── */}
        <FeedHeader
          fullName={fullName}
          email={email}
          avatarSrc={profileAvatar}
          onLogout={logout}
        />

        <div className="container _custom_container">
          <div className="_layout_inner_wrap">
            <div className="row g-4">

              {/* ══════════════ LEFT SIDEBAR ══════════════ */}
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                <div className="_layout_left_sidebar_wrap">
                  <div className="_layout_left_sidebar_inner" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                    {/* Explore */}
                    <div className="_layout_left_sidebar_inner">
                      <div className="_left_inner_area_explore _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
                        <h4 className="_left_inner_area_explore_title _title5 _mar_b24">Explore</h4>
                        <ul className="_left_inner_area_explore_list">
                          {exploreItems.map((item) => (
                            <li
                              key={item.id}
                              className={`_left_inner_area_explore_item ${item.badge ? "_explore_item" : ""}`.trim()}
                            >
                              <a href={item.href} className="_left_inner_area_explore_link">
                                {item.label}
                              </a>
                              {item.badge && (
                                <span className="_left_inner_area_explore_link_txt">{item.badge}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Suggested People */}
                    <SidebarCard title="Suggested People" actionLabel="See All">
                      <SuggestedPeopleList people={suggestedPeople} />
                    </SidebarCard>

                    {/* Events */}
                    <SidebarCard title="Events" actionLabel="See All" className="event-card-wrap">
                      <EventList items={eventCards} />
                    </SidebarCard>

                  </div>
                </div>
              </div>

              {/* ══════════════ CENTER FEED ══════════════ */}
              <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
                <div className="_layout_middle_wrap">
                  <div className="_layout_middle_inner">

                    {/* Story rail */}
                    <StoryRail stories={storyCards} />

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
                        {loadError}
                      </div>
                    )}
                    {showLoginTransition && (
                      <div className="feed-banner" role="status">
                        Welcome back! Preparing your feed…
                      </div>
                    )}

                    {/* Posts */}
                    {showSkeleton ? (
                      <FeedSkeletonList count={3} />
                    ) : (
                      <div className="feed-post-list">
                        {posts.length === 0 && !loading && (
                          <div className="feed-banner">
                            No posts yet. Be the first to share something! 🚀
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
                </div>
              </div>

              {/* ══════════════ RIGHT SIDEBAR ══════════════ */}
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                <div className="_layout_right_sidebar_wrap">
                  <div className="_layout_right_sidebar_inner"  style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                    {/* You Might Like */}
                    <div className="_right_inner_area_info _padd_t24 _padd_b24 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
                      <div className="_right_inner_area_info_content _mar_b24">
                        <h4 className="_right_inner_area_info_content_title _title5">You Might Like</h4>
                        <span
                          className="_right_inner_area_info_content_txt_link"
                          role="button"
                          tabIndex={0}
                        >
                          See All
                        </span>
                      </div>
                      <hr className="_underline" />
                      <div className="_right_inner_area_info_ppl">
                        <div className="_right_inner_area_info_box">
                          <div className="_right_inner_area_info_box_image">
                            <img
                              src="/assets/images/Avatar.png"
                              alt="Radovan SkillArena"
                              className="_ppl_img"
                            />
                          </div>
                          <div className="_right_inner_area_info_box_txt">
                            <h4 className="_right_inner_area_info_box_title">Radovan SkillArena</h4>
                            <p className="_right_inner_area_info_box_para">Founder &amp; CEO at Trophy</p>
                          </div>
                        </div>
                        <div className="_right_info_btn_grp">
                          <button type="button" className="_right_info_btn_link">
                            Ignore
                          </button>
                          <button type="button" className="_right_info_btn_link _right_info_btn_link_active">
                            Follow
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Friends Online */}
                    <div className="_feed_right_inner_area_card _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
                      <RightPeopleList people={rightSidebarPeople} />
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

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
