/**
 * FeedBlocks.jsx
 * ─────────────────────────────────────────────────────────────
 * Reusable, composable UI blocks for the social feed.
 * - FeedHeader       : fixed navbar
 * - StoryRail        : horizontal story tray
 * - ComposerCard     : post composer
 * - PostCard         : full post with like / comment / reply
 * - FeedSkeletonList : loading placeholders
 * - FeedColumnTitle  : section heading w/ action link
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UnauthorizedError,
  createComment,
  createReply,
  likeReaction,
  unlikeReaction,
  mergePostWithReactionSummary,
  mergeCommentWithReactionSummary,
  REACTION_TARGET,
} from "../api/client";

/* ─── Helpers ─────────────────────────────────────────────── */

/** Returns true for a valid persisted numeric/string ID (not a temp UUID). */
function isPersistedEntityId(id) {
  if (typeof id === "number" && Number.isFinite(id) && id > 0) return true;
  if (typeof id === "string" && /^\d+$/.test(id.trim())) return true;
  return false;
}

/** Immutably updates a comment (or nested reply) in a tree by id. */
function updateCommentInTree(comments, targetId, updater) {
  return comments.map((c) => {
    if (String(c.id) === String(targetId)) return updater(c);
    if (c.replies?.length) {
      return { ...c, replies: updateCommentInTree(c.replies, targetId, updater) };
    }
    return c;
  });
}

/** Appends a new reply to the correct comment thread. */
function addReplyToThread(comments, parentId, newReply) {
  return comments.map((c) => {
    if (String(c.id) === String(parentId)) {
      return { ...c, replies: [...(c.replies || []), newReply] };
    }
    if (c.replies?.length) {
      return { ...c, replies: addReplyToThread(c.replies, parentId, newReply) };
    }
    return c;
  });
}

/** Builds minimal like-entry shape from auth user. */
function buildCurrentUserLike(currentUser) {
  return {
    id: currentUser?.id || currentUser?.email || "current-user",
    name: currentUser?.name || currentUser?.email || "You",
    email: currentUser?.email || "",
    avatar: currentUser?.avatar || "/assets/images/profile-avatar.png",
  };
}

/** Stable list key helper (avoids array-index-only keys). */
function makeListKey(prefix, item, index) {
  const src =
    item?.id ?? item?.createdAt ?? item?.authorEmail ?? item?.authorName ?? "item";
  return `${prefix}-${src}-${index}`;
}

/** Human-friendly relative time. */
export function formatTimeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMin = Math.max(1, Math.round((Date.now() - date.getTime()) / 60_000));
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7)  return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const COMMENTS_PREVIEW_COUNT = 2;

/* ─── Primitive components ────────────────────────────────── */

function Avatar({ src, alt, size = 44, className = "" }) {
  return (
    <img
      src={src || "/assets/images/profile-avatar.png"}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "cover", borderRadius: "50%" }}
    />
  );
}

function IconButton({
  children,
  active,
  onClick,
  className = "",
  title,
  disabled = false,
  ariaLabel,
}) {
  return (
    <button
      type="button"
      className={`${className} ${active ? "is-active" : ""}`.trim()}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/* ─── SVG icon bank ───────────────────────────────────────── */

const Icons = {
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
      <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21V12h6v9M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  people: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="20" fill="none" viewBox="0 0 24 22">
      <circle cx="9" cy="6" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M1 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M17 11a4 4 0 100-8M23 20c0-3-2.5-5.5-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  bell: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" fill="none" viewBox="0 0 24 26">
      <path d="M12 2a7 7 0 00-7 7c0 7-3 9-3 9h20s-3-2-3-9a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chat: (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  chevronDown: (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="7" fill="none" viewBox="0 0 12 7">
      <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chevronRight: (
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="10" fill="none" viewBox="0 0 6 10">
      <path d="M1 9l4-4L1 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  logout: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  like: (active) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  comment: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  share: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="6"  cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  image: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  video: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
      <polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  ),
  send: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
      <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  more: (
    <svg xmlns="http://www.w3.org/2000/svg" width="4" height="18" fill="none" viewBox="0 0 4 20">
      <circle cx="2" cy="3"  r="2" fill="currentColor"/>
      <circle cx="2" cy="10" r="2" fill="currentColor"/>
      <circle cx="2" cy="17" r="2" fill="currentColor"/>
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════
   FEED HEADER
   ═══════════════════════════════════════════════════════════ */

export function FeedHeader({ fullName, email, avatarSrc, onLogout }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  /* Close when clicking outside */
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  return (
    <nav className="navbar navbar-expand-lg _header_nav _padd_t10 feed-header">
      <div className="container _custom_container">
        {/* Brand */}
        <div className="_logo_wrap">
          <button
            type="button"
            className="navbar-brand _brand_button"
            aria-label="BuddyScript home"
            onClick={() => navigate("/feed")}
          >
            <img src="/assets/images/logo.svg" alt="BuddyScript" className="_nav_logo" />
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="navbar-toggler bg-light"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarMain"
          aria-controls="navbarMain"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarMain">
          {/* Search */}
          <div className="_header_form ms-auto me-3">
            <form className="_header_form_grp" onSubmit={(e) => e.preventDefault()}>
              <span className="_header_form_svg" aria-hidden="true">{Icons.search}</span>
              <input
                className="form-control _inpt1"
                type="search"
                placeholder="Search people, posts, topics…"
                aria-label="Search"
                id="nav-search"
              />
            </form>
          </div>

          {/* Nav icons */}
          <ul className="navbar-nav mb-2 mb-lg-0 _header_nav_list _mar_r8" style={{ gap: "4px" }}>
            <li className="nav-item _header_nav_item">
              <button
                type="button"
                className="nav-link _header_nav_link _header_nav_link_active"
                aria-label="Home"
                onClick={() => navigate("/feed")}
              >
                {Icons.home}
              </button>
            </li>
            <li className="nav-item _header_nav_item">
              <button type="button" className="nav-link _header_nav_link" aria-label="Friends">
                {Icons.people}
              </button>
            </li>
            <li className="nav-item _header_nav_item">
              <button type="button" className="nav-link _header_nav_link _header_notify_btn" aria-label="Notifications" style={{ position: "relative" }}>
                {Icons.bell}
                <span className="_counting">6</span>
              </button>
            </li>
            <li className="nav-item _header_nav_item">
              <button type="button" className="nav-link _header_nav_link" aria-label="Messages" style={{ position: "relative" }}>
                {Icons.chat}
                <span className="_counting">2</span>
              </button>
            </li>
          </ul>

          {/* Profile dropdown */}
          <div className="_header_nav_profile" ref={dropdownRef}>
            <div className="_header_nav_profile_image">
              <img
                src={avatarSrc || "/assets/images/profile-avatar.png"}
                alt="Your profile"
                className="_nav_profile_img"
                  onClick={() => navigate("/profile")}
              />
            </div>
            <div className="_header_nav_dropdown">
              <div className="_header_nav_name_block" style={{ display: "none" }}>
                <p className="_header_nav_para">{fullName || "Guest"}</p>
                <span className="_header_nav_email">{email}</span>
              </div>
              <button
                id="profile-dropdown-toggle"
                className="_header_nav_dropdown_btn _dropdown_toggle"
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                aria-expanded={profileOpen}
                aria-label="Open profile menu"
              >
                {Icons.chevronDown}
              </button>
            </div>

            {profileOpen && (
              <div id="profile-dropdown-menu" className="_nav_profile_dropdown _profile_dropdown show" role="menu">
                <div className="_nav_profile_dropdown_info">
                  <div className="_nav_profile_dropdown_image">
                    <img
                      src={avatarSrc || "/assets/images/profile-avatar.png"}
                      alt="Profile"
                      className="_nav_drop_img"
                    />
                  </div>
                  <div className="_nav_profile_dropdown_info_txt">
                    <h4 className="_nav_dropdown_title">{fullName || "Guest user"}</h4>
                    <span className="_nav_drop_profile">{email || "Signed in"}</span>
                  </div>
                </div>
                <hr />
                <ul className="_nav_dropdown_list" role="menu">
                  <li className="_nav_dropdown_list_item" role="menuitem">
                    <button
                      type="button"
                      className="_nav_dropdown_link _nav_dropdown_button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/profile");
                      }}
                    >
                      <div className="_nav_drop_info" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>View Profile</span>
                      </div>
                      {Icons.chevronRight}
                    </button>
                  </li>
                  <li className="_nav_dropdown_list_item" role="menuitem">
                    <button
                      type="button"
                      className="_nav_dropdown_link _nav_dropdown_button"
                      onClick={() => { setProfileOpen(false); onLogout(); }}
                    >
                      <div className="_nav_drop_info" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {Icons.logout}
                        <span>Log Out</span>
                      </div>
                      {Icons.chevronRight}
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}


/* ═══════════════════════════════════════════════════════════
   STORY RAIL
   ═══════════════════════════════════════════════════════════ */

export function StoryRail({ stories }) {
  return (
    <div className="_feed_inner_ppl_card _mar_b16">
      <div className="_feed_inner_story_arrow">
        <button type="button" className="_feed_inner_story_arrow_btn" aria-label="Scroll stories">
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="8" fill="none" viewBox="0 0 9 8">
            <path fill="#fff" d="M8 4l.366-.341.318.341-.318.341L8 4zm-7 .5a.5.5 0 010-1v1zM5.566.659l2.8 3-.732.682-2.8-3L5.566.66zm2.8 3.682l-2.8 3-.732-.682 2.8-3 .732.682zM8 4.5H1v-1h7v1z"/>
          </svg>
        </button>
      </div>

      <div className="row g-2">
        {stories.map((story) => (
          <div key={story.id} className="col-xl-3 col-lg-3 col-md-4 col-sm-4 col-4">
            {story.type === "create" ? (
              <div className="_feed_inner_profile_story _b_radious6">
                <div className="_feed_inner_profile_story_image">
                  <img src={story.image} alt={story.label} className="_profile_story_img" />
                  <div className="_feed_inner_story_txt">
                    <div className="_feed_inner_story_btn">
                      <button className="_feed_inner_story_btn_link" type="button" aria-label="Create story">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 10 10">
                          <path stroke="#fff" strokeLinecap="round" d="M.5 4.884h9M4.884 9.5v-9"/>
                        </svg>
                      </button>
                    </div>
                    <p className="_feed_inner_story_para">Your Story</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="_feed_inner_public_story _b_radious6">
                <div className="_feed_inner_public_story_image">
                  <img src={story.image} alt={story.label} className="_public_story_img" />
                  <div className="_feed_inner_pulic_story_txt">
                    <p className="_feed_inner_pulic_story_para">{story.label}</p>
                  </div>
                  <div className="_feed_inner_public_mini">
                    <img src="/assets/images/mini_pic.png" alt="" className="_public_mini_img" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPOSER CARD
   ═══════════════════════════════════════════════════════════ */

export function ComposerCard({
  content,
  onContentChange,
  onSubmit,
  visibility,
  onVisibilityChange,
  imagePreview,
  imageName,
  onImagePick,
  onImageClear,
  posting,
  error,
  authorName,
  avatarSrc,
}) {
  const VISIBILITIES = ["Public", "Private"];

  return (
    <div className="_feed_inner_text_area _b_radious6 _mar_b16">
      {/* Author + textarea */}
      <div className="_feed_inner_text_area_box">
        <img
          src={avatarSrc || "/assets/images/profile-avatar.png"}
          alt={authorName}
          className="_txt_img"
        />
        <div className="_feed_inner_text_area_box_form">
          <textarea
            className="form-control _textarea"
            placeholder={`What's on your mind, ${authorName?.split(" ")[0] || "you"}?`}
            id="feed-composer-textarea"
            value={content}
            maxLength={3000}
            onChange={(e) => onContentChange(e.target.value)}
            aria-label="Post content"
          />
        </div>
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="composer-image-preview">
          <img src={imagePreview} alt={imageName || "Selected image"} />
          <button type="button" onClick={onImageClear}>✕ Remove image</button>
        </div>
      )}

      {/* Visibility selector */}
      <div className="feed-visibility-group" role="radiogroup" aria-label="Post visibility">
        {VISIBILITIES.map((v) => (
          <button
            key={v}
            type="button"
            id={`visibility-${v.toLowerCase()}`}
            className={`feed-pill${visibility === v ? " is-active" : ""}`}
            onClick={() => onVisibilityChange(v)}
            aria-pressed={visibility === v}
          >
            {v === "Public" ? "🌐 " : "🔒 "}
            {v}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="_feed_inner_text_area_bottom">
        <div className="_feed_inner_text_area_item">
          <button
            type="button"
            id="composer-photo-btn"
            className="_feed_inner_text_area_bottom_photo_link"
            onClick={onImagePick}
          >
            <span className="_mar_img">{Icons.image}</span>
            Photo
          </button>
        </div>
        <div className="_feed_inner_text_area_item">
          <button type="button" className="_feed_inner_text_area_bottom_photo_link">
            <span className="_mar_img">{Icons.video}</span>
            Video
          </button>
        </div>

        {/* Spacer then post button */}
        <div style={{ flex: 1 }} />

        <div className="_feed_inner_text_area_btn" style={{ marginTop: 0 }}>
          <button
            type="button"
            id="composer-post-btn"
            className="_feed_inner_text_area_btn_link"
            onClick={onSubmit}
            disabled={posting || !content.trim()}
            aria-busy={posting}
          >
            {Icons.send}
            <span>{posting ? "Posting…" : "Post"}</span>
          </button>
        </div>
      </div>

      {imageName && !imagePreview && (
        <p className="composer-image-name">📎 {imageName}</p>
      )}
      {error && (
        <p className="composer-error" role="alert">{error}</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMMENT ITEM  (recursive — handles nested replies)
   ═══════════════════════════════════════════════════════════ */

function CommentItem({
  comment,
  currentUser,
  token,
  onUnauthorized,
  onCommentReaction,
  onReplyCreated,
  isReply = false,
}) {
  const [replyOpen,   setReplyOpen]   = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyValue,  setReplyValue]  = useState("");
  const [likePending,  setLikePending]  = useState(false);
  const [replyPending, setReplyPending] = useState(false);

  const likes      = comment.likes  || [];
  const replies    = comment.replies || [];
  const hasReplies = replies.length > 0;
  const commentLiked = Boolean(comment.likedByMe);
  const likeCount    = typeof comment.likeCount === "number" ? comment.likeCount : likes.length;
  const likedBy      = useMemo(() => likes.map((l) => l.name).filter(Boolean), [likes]);
  const avatarSize   = isReply ? 30 : 38;

  async function handleLikeComment() {
    if (likePending || !isPersistedEntityId(comment.id)) return;
    setLikePending(true);
    try {
      const summary = commentLiked
        ? await unlikeReaction(token, REACTION_TARGET.COMMENT, Number(comment.id))
        : await likeReaction(token,   REACTION_TARGET.COMMENT, Number(comment.id));
      onCommentReaction(Number(comment.id), summary);
    } catch (err) {
      if (err instanceof UnauthorizedError) onUnauthorized();
    } finally {
      setLikePending(false);
    }
  }

  async function handleSubmitReply(e) {
    e.preventDefault();
    if (!replyValue.trim() || replyPending || !isPersistedEntityId(comment.id)) return;
    setReplyPending(true);
    try {
      const created = await createReply(token, Number(comment.id), replyValue.trim());
      onReplyCreated(Number(comment.id), created);
      setReplyValue("");
      setReplyOpen(false);
      setRepliesOpen(true);
    } catch (err) {
      if (err instanceof UnauthorizedError) onUnauthorized();
    } finally {
      setReplyPending(false);
    }
  }

  return (
    <div className={`_comment_main comment-thread ${isReply ? "comment-thread-nested" : ""}`.trim()}>
      {/* Avatar */}
      <div className="_comment_image">
        <span className="_comment_image_link">
          <Avatar
            src={comment.authorAvatar || "/assets/images/comment_img.png"}
            alt={comment.authorName}
            size={avatarSize}
            className={isReply ? "comment-reply-avatar _comment_img1" : "_comment_img1"}
          />
        </span>
      </div>

      {/* Body */}
      <div className="_comment_area">
        <div className="_comment_details">
          <div className="_comment_name">
            <h4 className="_comment_name_title">{comment.authorName}</h4>
          </div>
          <p className="_comment_status_text">{comment.content}</p>

          {likedBy.length > 0 && (
            <p className="comment-like-summary">
              👍 Liked by {likedBy.slice(0, 3).join(", ")}
              {likedBy.length > 3 ? ` +${likedBy.length - 3} more` : ""}
            </p>
          )}

          {/* Action row */}
          <div className="_comment_reply">
            <ul className="_comment_reply_list">
              <li>
                <button
                  type="button"
                  onClick={handleLikeComment}
                  disabled={likePending || !isPersistedEntityId(comment.id)}
                  style={{ color: commentLiked ? "var(--clr-primary)" : undefined, fontWeight: commentLiked ? 700 : 600 }}
                >
                  {commentLiked ? "Unlike" : "Like"}
                  {likeCount > 0 ? ` · ${likeCount}` : ""}
                  {likePending ? " …" : ""}
                </button>
              </li>
              {!isReply && (
                <li>
                  <button
                    type="button"
                    onClick={() => setReplyOpen((c) => !c)}
                    disabled={!isPersistedEntityId(comment.id)}
                  >
                    Reply
                  </button>
                </li>
              )}
              {hasReplies && (
                <li>
                  <button
                    type="button"
                    className="feed-inline-toggle"
                    onClick={() => setRepliesOpen((c) => !c)}
                    aria-expanded={repliesOpen}
                  >
                    {repliesOpen
                      ? `Hide replies (${replies.length})`
                      : `View replies (${replies.length})`}
                  </button>
                </li>
              )}
              <li>
                <span className="_time_link">{formatTimeAgo(comment.createdAt)}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Reply composer */}
        {replyOpen && (
          <form className="comment-reply-form" onSubmit={handleSubmitReply}>
            <textarea
              className="form-control _comment_textarea"
              placeholder={`Reply to ${comment.authorName}…`}
              value={replyValue}
              onChange={(e) => setReplyValue(e.target.value)}
              rows={2}
              autoFocus
            />
            <div className="comment-reply-actions">
              <button
                type="button"
                className="comment-cancel-button"
                onClick={() => setReplyOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="comment-submit-button"
                disabled={replyPending || !replyValue.trim()}
              >
                {replyPending ? "Sending…" : "Reply"}
              </button>
            </div>
          </form>
        )}

        {/* Nested replies */}
        {hasReplies && repliesOpen && (
          <div className="comment-replies">
            {replies.map((reply, idx) => (
              <CommentItem
                key={makeListKey(`reply-${comment.id}`, reply, idx)}
                comment={reply}
                currentUser={currentUser}
                token={token}
                onUnauthorized={onUnauthorized}
                onCommentReaction={onCommentReaction}
                onReplyCreated={onReplyCreated}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   POST CARD
   ═══════════════════════════════════════════════════════════ */

export function PostCard({ post, currentUser, token, onPostUpdated, onUnauthorized }) {
  const [likes,              setLikes]              = useState(post.likes || []);
  const [liked,              setLiked]              = useState(() =>
    Boolean(post.likedByMe ?? post.liked ?? likes.some((e) => e.id === buildCurrentUserLike(currentUser).id))
  );
  const [comments,           setComments]           = useState(post.comments || []);
  const [commentValue,       setCommentValue]       = useState("");
  const [imageExpanded,      setImageExpanded]      = useState(Boolean(post.imageUrl));
  const [commentsExpanded,   setCommentsExpanded]   = useState(false);
  const [postLikePending,    setPostLikePending]    = useState(false);
  const [commentPending,     setCommentPending]     = useState(false);
  const [commentFocused,     setCommentFocused]     = useState(false);

  /* Sync incoming post prop changes (e.g. after optimistic update) */
  useEffect(() => {
    setLikes(post.likes || []);
    setLiked(Boolean(post.likedByMe ?? post.liked));
    setComments(post.comments || []);
  }, [post]);

  const likedBy         = useMemo(() => likes.map((e) => e.name).filter(Boolean), [likes]);
  const likeTotal       = typeof post.likeCount === "number" ? post.likeCount : likes.length;
  const commentTotal    = typeof post.commentCount === "number" ? Math.max(post.commentCount, comments.length) : comments.length;
  const shareTotal      = typeof post.shareCount === "number" ? post.shareCount : 0;
  const visibleComments = commentsExpanded ? comments : comments.slice(0, COMMENTS_PREVIEW_COUNT);
  const hiddenCount     = Math.max(0, comments.length - COMMENTS_PREVIEW_COUNT);

  /* ── handlers ── */

  function handleCommentReaction(commentId, summary) {
    setComments((prev) => {
      const next = updateCommentInTree(prev, commentId, (c) =>
        mergeCommentWithReactionSummary(c, summary)
      );
      onPostUpdated({ ...post, comments: next });
      return next;
    });
  }

  function handleReplyCreated(parentId, reply) {
    setComments((prev) => {
      const next = addReplyToThread(prev, parentId, reply);
      onPostUpdated({ ...post, comments: next });
      return next;
    });
  }

  async function togglePostLike() {
    if (postLikePending || !isPersistedEntityId(post.id)) return;
    setPostLikePending(true);
    // Optimistic update
    setLiked((prev) => !prev);
    setLikes((prev) =>
      liked
        ? prev.filter((e) => e.id !== buildCurrentUserLike(currentUser).id)
        : [...prev, buildCurrentUserLike(currentUser)]
    );
    try {
      const summary = liked
        ? await unlikeReaction(token, REACTION_TARGET.POST, Number(post.id))
        : await likeReaction(token,   REACTION_TARGET.POST, Number(post.id));
      const merged = mergePostWithReactionSummary({ ...post, comments }, summary);
      setLikes(merged.likes);
      setLiked(merged.likedByMe);
      onPostUpdated(merged);
    } catch (err) {
      // Rollback optimistic state
      setLiked((prev) => !prev);
      setLikes(post.likes || []);
      if (err instanceof UnauthorizedError) onUnauthorized();
    } finally {
      setPostLikePending(false);
    }
  }

  async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!commentValue.trim() || commentPending || !isPersistedEntityId(post.id)) return;
    setCommentPending(true);
    try {
      const created = await createComment(token, Number(post.id), commentValue.trim());
      setComments((prev) => {
        const next = [created, ...prev];
        onPostUpdated({ ...post, comments: next });
        return next;
      });
      setCommentValue("");
      setCommentsExpanded(true);
      setCommentFocused(false);
    } catch (err) {
      if (err instanceof UnauthorizedError) onUnauthorized();
    } finally {
      setCommentPending(false);
    }
  }

  return (
    <article className="_feed_inner_timeline_post_area _b_radious6 _mar_b16 post-card">
      {/* ── Post header ── */}
      <div className="_feed_inner_timeline_post_top">
        <div className="_feed_inner_timeline_post_box">
          <div className="_feed_inner_timeline_post_box_image">
            <Avatar
              src={post.authorAvatar || "/assets/images/post_img.png"}
              alt={post.authorName}
              size={46}
              className="_post_img"
            />
          </div>
          <div className="_feed_inner_timeline_post_box_txt">
            <h4 className="_feed_inner_timeline_post_box_title">{post.authorName}</h4>
            <p className="_feed_inner_timeline_post_box_para">
              {formatTimeAgo(post.createdAt)}
              {" · "}
              <span
                className={`post-visibility-pill post-visibility-${String(
                  post.visibility || "Public"
                ).toLowerCase()}`}
              >
                {post.visibility === "Private" ? "🔒" : "🌐"}{" "}
                {post.visibility || "Public"}
              </span>
            </p>
          </div>
        </div>
        <div className="_feed_inner_timeline_post_box_dropdown">
          <button
            type="button"
            className="_feed_timeline_post_dropdown_link"
            aria-label="More actions"
          >
            {Icons.more}
          </button>
        </div>
      </div>

      {/* ── Post content ── */}
      {post.content && (
        <div className="_feed_inner_timeline_content" style={{ padding: "0 20px 14px" }}>
          <p className="_feed_inner_timeline_post_title" style={{ margin: 0 }}>
            {post.content}
          </p>
        </div>
      )}

      {/* ── Post image ── */}
      {post.imageUrl && (
        <div style={{ marginBottom: "4px" }}>
          {imageExpanded && (
            <img
              src={post.imageUrl}
              alt={post.content || "Post image"}
              className="_time_img"
              style={{ width: "100%", maxHeight: "440px", objectFit: "cover", display: "block" }}
            />
          )}
          <button
            type="button"
            className="post-image-toggle"
            onClick={() => setImageExpanded((c) => !c)}
          >
            <span>{imageExpanded ? "Hide image ↑" : "Show image ↓"}</span>
          </button>
        </div>
      )}

      {/* ── Reaction summary row ── */}
      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_total_reacts_image">
          <img src="/assets/images/react_img1.png" alt="" className="_react_img1" />
          <img src="/assets/images/react_img2.png" alt="" className="_react_img" />
          <img src="/assets/images/react_img3.png" alt="" className="_react_img _rect_img_mbl_none" />
          <p className="_feed_inner_timeline_total_reacts_para">
            {likeTotal > 0 ? `${likeTotal}` : "0"}
          </p>
        </div>
        <div className="_feed_inner_timeline_total_reacts_txt">
          <p className="_feed_inner_timeline_total_reacts_para1">
            <span style={{ fontWeight: 700 }}>{commentTotal}</span> Comment{commentTotal !== 1 ? "s" : ""}
          </p>
          <p className="_feed_inner_timeline_total_reacts_para2">
            <span style={{ fontWeight: 700 }}>{shareTotal}</span> Shares
          </p>
        </div>
      </div>

      {/* ── Reaction buttons ── */}
      <div className="_feed_inner_timeline_reaction">
        <IconButton
          className="_feed_inner_timeline_reaction_emoji _feed_reaction"
          active={liked}
          onClick={togglePostLike}
          title={liked ? "Unlike post" : "Like post"}
          ariaLabel={liked ? "Unlike post" : "Like post"}
          disabled={postLikePending || !isPersistedEntityId(post.id)}
        >
          <span className="_feed_inner_timeline_reaction_link">
            {Icons.like(liked)}
            <span>{postLikePending ? "…" : liked ? "Liked" : "Like"}</span>
          </span>
        </IconButton>

        <IconButton
          className="_feed_inner_timeline_reaction_comment _feed_reaction"
          onClick={() => { setCommentsExpanded(true); setCommentFocused(true); }}
          title="Comment"
          ariaLabel="Write a comment"
        >
          <span className="_feed_inner_timeline_reaction_link">
            {Icons.comment}
            <span>Comment</span>
          </span>
        </IconButton>

        <IconButton
          className="_feed_inner_timeline_reaction_share _feed_reaction"
          title="Share post"
          ariaLabel="Share post"
        >
          <span className="_feed_inner_timeline_reaction_link">
            {Icons.share}
            <span>Share</span>
          </span>
        </IconButton>
      </div>

      {/* ── Liked-by strip ── */}
      {likedBy.length > 0 && (
        <div className="post-liked-by">
          👍 Liked by <strong>{likedBy.slice(0, 2).join(", ")}</strong>
          {likedBy.length > 2 ? ` and ${likedBy.length - 2} others` : ""}
        </div>
      )}

      {/* ── Comment input ── */}
      <div className="_feed_inner_timeline_cooment_area">
        <form className="_feed_inner_comment_box_form" onSubmit={handleCommentSubmit}>
          <div className="_feed_inner_comment_box_content">
            <img
              src={currentUser?.avatar || "/assets/images/profile-avatar.png"}
              alt={currentUser?.name || "Your avatar"}
              className="_comment_img"
              style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
            <div className="_feed_inner_comment_box_content_txt">
              <textarea
                className="form-control _comment_textarea"
                placeholder="Write a thoughtful comment…"
                id={`comment-input-${post.id}`}
                value={commentValue}
                onChange={(e) => setCommentValue(e.target.value)}
                rows={commentFocused ? 3 : 2}
                onFocus={() => setCommentFocused(true)}
              />
            </div>
          </div>
          <div className="_feed_inner_comment_box_icon">
            <button type="button" className="_feed_inner_comment_box_icon_btn" title="Add emoji" aria-label="Add emoji">
              😊
            </button>
            <button
              type="submit"
              id={`comment-submit-${post.id}`}
              className="_feed_inner_comment_box_icon_btn feed-comment-submit-btn"
              aria-label="Post comment"
              disabled={commentPending || !commentValue.trim() || !isPersistedEntityId(post.id)}
            >
              {commentPending ? "…" : Icons.send}
            </button>
          </div>
        </form>
      </div>

      {/* ── Comment thread ── */}
      <div className="_timline_comment_main">
        {comments.length > 0 && (
          <div className="_previous_comment">
            <button
              type="button"
              className="_previous_comment_txt"
              onClick={() => setCommentsExpanded((c) => !c)}
              aria-expanded={commentsExpanded}
            >
              {commentsExpanded
                ? "Show fewer comments"
                : hiddenCount > 0
                  ? `View all ${comments.length} comments`
                  : `View ${comments.length} comment${comments.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {visibleComments.map((comment, idx) => (
          <CommentItem
            key={makeListKey(`comment-${post.id}`, comment, idx)}
            comment={comment}
            currentUser={currentUser}
            token={token}
            onUnauthorized={onUnauthorized}
            onCommentReaction={handleCommentReaction}
            onReplyCreated={handleReplyCreated}
          />
        ))}
      </div>
    </article>
  );
}


/* ═══════════════════════════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════════════════════════ */

export function FeedSkeletonList({ count = 3 }) {
  return (
    <div className="feed-skeleton-list" aria-hidden="true" aria-label="Loading posts…">
      {Array.from({ length: count }).map((_, i) => (
        <article className="feed-skeleton-card" key={`skeleton-${i}`}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
            <div className="feed-skeleton-line feed-skeleton-line-avatar" />
            <div style={{ flex: 1, display: "grid", gap: "8px" }}>
              <div className="feed-skeleton-line feed-skeleton-line-title" />
              <div className="feed-skeleton-line" style={{ width: "30%" }} />
            </div>
          </div>
          <div className="feed-skeleton-line" />
          <div className="feed-skeleton-line" />
          <div className="feed-skeleton-line feed-skeleton-line-short" />
        </article>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FEED COLUMN TITLE
   ═══════════════════════════════════════════════════════════ */

export function FeedColumnTitle({ title, actionLabel, actionHref = "#" }) {
  return (
    <div className="feed-column-title">
      <h4>{title}</h4>
      {actionLabel && (
        <a href={actionHref} className="feed-column-title-link">
          {actionLabel}
        </a>
      )}
    </div>
  );
}
