import { useEffect, useMemo, useState } from "react";
import {
  UnauthorizedError,
  createComment,
  createReply,
  likeReaction,
  unlikeReaction,
  mergePostWithReactionSummary,
  mergeCommentWithReactionSummary,
  REACTION_TARGET
} from "../api/client";

function isPersistedEntityId(id) {
  if (typeof id === "number" && Number.isFinite(id) && id > 0) {
    return true;
  }
  if (typeof id === "string" && /^\d+$/.test(id.trim())) {
    return true;
  }
  return false;
}

function updateCommentInTree(comments, targetId, updater) {
  return comments.map((c) => {
    if (String(c.id) === String(targetId)) {
      return updater(c);
    }
    if (c.replies?.length) {
      return { ...c, replies: updateCommentInTree(c.replies, targetId, updater) };
    }
    return c;
  });
}

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

function buildCurrentUserLike(currentUser) {
  return {
    id: currentUser?.id || currentUser?.email || "current-user",
    name: currentUser?.name || currentUser?.email || "User",
    email: currentUser?.email || "",
    avatar: currentUser?.avatar || "/assets/images/profile-avatar.png"
  };
}

const COMMENTS_PREVIEW_COUNT = 2;

function makeListKey(prefix, item, index) {
  const keySource = item?.id ?? item?.createdAt ?? item?.authorEmail ?? item?.authorName ?? "item";
  return `${prefix}-${keySource}-${index}`;
}

function formatTimeAgo(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function Avatar({ src, alt, size = 44, className = "" }) {
  return <img src={src} alt={alt} width={size} height={size} className={className} />;
}

function IconButton({ children, active, onClick, className = "", title, disabled = false }) {
  return (
    <button
      type="button"
      className={`${className} ${active ? "is-active" : ""}`.trim()}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function FeedHeader({ fullName, email, avatarSrc, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <nav className="navbar navbar-expand-lg navbar-light _header_nav _padd_t10 feed-header">
      <div className="container _custom_container">
        <div className="_logo_wrap">
          <button type="button" className="navbar-brand _brand_button" aria-label="Buddy Script home">
            <img src="/assets/images/logo.svg" alt="Buddy Script" className="_nav_logo" />
          </button>
        </div>

        <button
          className="navbar-toggler bg-light"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <div className="_header_form ms-auto">
            <form className="_header_form_grp" onSubmit={(event) => event.preventDefault()}>
              <svg className="_header_form_svg" xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 17 17">
                <circle cx="7" cy="7" r="6" stroke="#666" />
                <path stroke="#666" strokeLinecap="round" d="M16 16l-3-3" />
              </svg>
              <input className="form-control me-2 _inpt1" type="search" placeholder="Search people, posts, or topics" aria-label="Search" />
            </form>
          </div>

          <ul className="navbar-nav mb-2 mb-lg-0 _header_nav_list ms-auto _mar_r8">
            <li className="nav-item _header_nav_item">
              <button type="button" className="nav-link _header_nav_link _header_nav_link_active" aria-label="Home">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="21" fill="none" viewBox="0 0 18 21">
                  <path stroke="#000" strokeWidth="1.5" strokeOpacity=".6" d="M1 9.924c0-1.552 0-2.328.314-3.01.313-.682.902-1.187 2.08-2.196l1.143-.98C6.667 1.913 7.732 1 9 1c1.268 0 2.333.913 4.463 2.738l1.142.98c1.179 1.01 1.768 1.514 2.081 2.196.314.682.314 1.458.314 3.01v4.846c0 2.155 0 3.233-.67 3.902-.669.67-1.746.67-3.901.67H5.57c-2.155 0-3.232 0-3.902-.67C1 18.002 1 16.925 1 14.77V9.924z" />
                  <path stroke="#000" strokeOpacity=".6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.857 19.341v-5.857a1 1 0 00-1-1H7.143a1 1 0 00-1 1v5.857" />
                </svg>
              </button>
            </li>
            <li className="nav-item _header_nav_item">
              <button type="button" className="nav-link _header_nav_link" aria-label="Friends">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="20" fill="none" viewBox="0 0 26 20">
                  <path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M12.79 12.15h.429c2.268.015 7.45.243 7.45 3.732 0 3.466-5.002 3.692-7.415 3.707h-.894c-2.268-.015-7.452-.243-7.452-3.727 0-3.47 5.184-3.697 7.452-3.711l.297-.001h.132zm0 1.75c-2.792 0-6.12.34-6.12 1.962 0 1.585 3.13 1.955 5.864 1.976l.255.002c2.792 0 6.118-.34 6.118-1.958 0-1.638-3.326-1.982-6.118-1.982zm9.343-2.224c2.846.424 3.444 1.751 3.444 2.79 0 .636-.251 1.794-1.931 2.43a.882.882 0 01-1.137-.506.873.873 0 01.51-1.13c.796-.3.796-.633.796-.793 0-.511-.654-.868-1.944-1.06a.878.878 0 01-.741-.996.886.886 0 011.003-.735zm-17.685.735a.878.878 0 01-.742.997c-1.29.19-1.944.548-1.944 1.059 0 .16 0 .491.798.793a.873.873 0 01-.314 1.693.897.897 0 01-.313-.057C.25 16.259 0 15.1 0 14.466c0-1.037.598-2.366 3.446-2.79.485-.06.929.257 1.002.735zM12.789 0c2.96 0 5.368 2.392 5.368 5.33 0 2.94-2.407 5.331-5.368 5.331h-.031a5.329 5.329 0 01-3.782-1.57 5.253 5.253 0 01-1.553-3.764C7.423 2.392 9.83 0 12.789 0zm0 1.75c-1.987 0-3.604 1.607-3.604 3.58a3.526 3.526 0 001.04 2.527 3.58 3.58 0 002.535 1.054l.03.875v-.875c1.987 0 3.605-1.605 3.605-3.58S14.777 1.75 12.789 1.75zm7.27-.607a4.222 4.222 0 013.566 4.172c-.004 2.094-1.58 3.89-3.665 4.181a.88.88 0 01-.994-.745.875.875 0 01.75-.989 2.494 2.494 0 002.147-2.45 2.473 2.473 0 00-2.09-2.443.876.876 0 01-.726-1.005.881.881 0 011.013-.721zm-13.528.72a.876.876 0 01-.726 1.006 2.474 2.474 0 00-2.09 2.446A2.493 2.493 0 005.86 7.762a.875.875 0 11-.243 1.734c-2.085-.29-3.66-2.087-3.664-4.179 0-2.082 1.5-3.837 3.566-4.174a.876.876 0 011.012.72z" clipRule="evenodd" />
                </svg>
              </button>
            </li>
            <li className="nav-item _header_nav_item">
              <button type="button" className="nav-link _header_nav_link _header_notify_btn" aria-label="Notifications">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" fill="none" viewBox="0 0 20 22">
                  <path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M7.547 19.55c.533.59 1.218.915 1.93.915.714 0 1.403-.324 1.938-.916a.777.777 0 011.09-.056c.318.284.344.77.058 1.084-.832.917-1.927 1.423-3.086 1.423h-.002c-1.155-.001-2.248-.506-3.077-1.424a.762.762 0 01.057-1.083.774.774 0 011.092.057zM9.527 0c4.58 0 7.657 3.543 7.657 6.85 0 1.702.436 2.424.899 3.19.457.754.976 1.612.976 3.233-.36 4.14-4.713 4.478-9.531 4.478-4.818 0-9.172-.337-9.528-4.413-.003-1.686.515-2.544.973-3.299l.161-.27c.398-.679.737-1.417.737-2.918C1.871 3.543 4.948 0 9.528 0zm0 1.535c-3.6 0-6.11 2.802-6.11 5.316 0 2.127-.595 3.11-1.12 3.978-.422.697-.755 1.247-.755 2.444.173 1.93 1.455 2.944 7.986 2.944 6.494 0 7.817-1.06 7.988-3.01-.003-1.13-.336-1.681-.757-2.378-.526-.868-1.12-1.851-1.12-3.978 0-2.514-2.51-5.316-6.111-5.316z" clipRule="evenodd" />
                </svg>
                <span className="_counting">6</span>
              </button>
            </li>
            <li className="nav-item _header_nav_item">
              <button type="button" className="nav-link _header_nav_link" aria-label="Messages">
                <svg xmlns="http://www.w3.org/2000/svg" width="23" height="22" fill="none" viewBox="0 0 23 22">
                  <path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M11.43 0c2.96 0 5.743 1.143 7.833 3.22 4.32 4.29 4.32 11.271 0 15.562C17.145 20.886 14.293 22 11.405 22c-1.575 0-3.16-.33-4.643-1.012-.437-.174-.847-.338-1.14-.338-.338.002-.793.158-1.232.308-.9.307-2.022.69-2.852-.131-.826-.822-.445-1.932-.138-2.826.152-.44.307-.895.307-1.239 0-.282-.137-.642-.347-1.161C-.57 11.46.322 6.47 3.596 3.22A11.04 11.04 0 0111.43 0zm0 1.535A9.5 9.5 0 004.69 4.307a9.463 9.463 0 00-1.91 10.686c.241.592.474 1.17.474 1.77 0 .598-.207 1.201-.39 1.733-.15.439-.378 1.1-.231 1.245.143.147.813-.085 1.255-.235.53-.18 1.133-.387 1.73-.391.597 0 1.161.225 1.758.463 3.655 1.679 7.98.915 10.796-1.881 3.716-3.693 3.716-9.7 0-13.391a9.5 9.5 0 00-6.74-2.77zm4.068 8.867c.57 0 1.03.458 1.03 1.024 0 .566-.46 1.023-1.03 1.023a1.023 1.023 0 11-.01-2.047h.01zm-4.131 0c.568 0 1.03.458 1.03 1.024 0 .566-.462 1.023-1.03 1.023a1.03 1.03 0 01-1.035-1.024c0-.566.455-1.023 1.025-1.023h.01zm-4.132 0c.568 0 1.03.458 1.03 1.024 0 .566-.462 1.023-1.03 1.023a1.022 1.022 0 11-.01-2.047h.01z" clipRule="evenodd" />
                </svg>
                <span className="_counting">2</span>
              </button>
            </li>
          </ul>

          <div className="_header_nav_profile">
            <div className="_header_nav_profile_image">
              <img src={avatarSrc || "/assets/images/profile-avatar.png"} alt="Profile" className="_nav_profile_img" />
            </div>
            <div className="_header_nav_dropdown">
              <div className="_header_nav_name_block">
                <p className="_header_nav_para">{fullName || "Guest user"}</p>
                <span className="_header_nav_email">{email}</span>
              </div>
              <button
                id="_profile_drop_show_btn"
                className="_header_nav_dropdown_btn _dropdown_toggle"
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" fill="none" viewBox="0 0 10 6">
                  <path fill="#112032" d="M5 5l.354.354L5 5.707l-.354-.353L5 5zm4.354-3.646l-4 4-.708-.708 4-4 .708.708zm-4.708 4l-4-4 .708-.708 4 4-.708.708z" />
                </svg>
              </button>
            </div>

            {profileOpen ? (
              <div id="_prfoile_drop" className="_nav_profile_dropdown _profile_dropdown show">
                <div className="_nav_profile_dropdown_info">
                  <div className="_nav_profile_dropdown_image">
                    <img src={avatarSrc || "/assets/images/profile-avatar.png"} alt="Profile" className="_nav_drop_img" />
                  </div>
                  <div className="_nav_profile_dropdown_info_txt">
                    <h4 className="_nav_dropdown_title">{fullName || "Guest user"}</h4>
                    <span className="_nav_drop_profile">{email || "Signed in"}</span>
                  </div>
                </div>
                <hr />
                <ul className="_nav_dropdown_list">
                  <li className="_nav_dropdown_list_item">
                    <button type="button" className="_nav_dropdown_link _nav_dropdown_button" onClick={onLogout}>
                      <div className="_nav_drop_info">
                        <span>Log Out</span>
                      </div>
                      <span className="_nav_drop_btn_link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="6" height="10" fill="none" viewBox="0 0 6 10">
                          <path fill="#112032" d="M5 5l.354.354L5.707 5l-.353-.354L5 5zM1.354 9.354l4-4-.708-.708-4 4 .708.708zm4-4.708l-4-4-.708.708 4 4 .708-.708z" opacity=".5" />
                        </svg>
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

export function SidebarCard({ title, actionLabel, actionHref = "", children, className = "" }) {
  return (
    <div className={`_layout_left_sidebar_inner ${className}`.trim()}>
      <div className="_left_inner_area_suggest _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
        <div className="_left_inner_area_suggest_content _mar_b24">
          <h4 className="_left_inner_area_suggest_content_title _title5">{title}</h4>
          {actionLabel ? (
            <span className="_left_inner_area_suggest_content_txt">
              {actionHref ? (
                <a className="_left_inner_area_suggest_content_txt_link" href={actionHref}>
                  {actionLabel}
                </a>
              ) : (
                <button type="button" className="_left_inner_area_suggest_content_txt_link feed-link-button">
                  {actionLabel}
                </button>
              )}
            </span>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

export function ExploreList({ items }) {
  return (
    <ul className="_left_inner_area_explore_list">
      {items.map((item) => (
        <li key={item.id} className={`_left_inner_area_explore_item ${item.badge ? "_explore_item" : ""}`.trim()}>
          <a href={item.href} className="_left_inner_area_explore_link">
            {item.label}
          </a>
          {item.badge ? <span className="_left_inner_area_explore_link_txt">{item.badge}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function SuggestedPeopleList({ people }) {
  return (
    <div className="_left_inner_area_suggest_info_list">
      {people.map((person) => (
        <div key={person.id} className="_left_inner_area_suggest_info">
          <div className="_left_inner_area_suggest_info_box">
            <div className="_left_inner_area_suggest_info_image">
              <span>
                <Avatar src={person.image} alt={person.name} size={50} className="_info_img" />
              </span>
            </div>
            <div className="_left_inner_area_suggest_info_txt">
              <h4 className="_left_inner_area_suggest_info_title">{person.name}</h4>
              <p className="_left_inner_area_suggest_info_para">{person.role}</p>
            </div>
          </div>
          <div className="_left_inner_area_suggest_info_link">
            <button type="button" className="_info_link feed-link-button">
              Connect
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EventList({ items }) {
  return (
    <div className="_left_inner_event_cards">
      {items.map((event) => (
        <button key={event.id} type="button" className="_left_inner_event_card_link feed-card-button">
          <div className="_left_inner_event_card">
            <div className="_left_inner_event_card_iamge">
              <img src={event.image} alt={event.title} className="_card_img" />
            </div>
            <div className="_left_inner_event_card_content">
              <div className="_left_inner_card_date">
                <p className="_left_inner_card_date_para">{event.date.day}</p>
                <p className="_left_inner_card_date_para1">{event.date.month}</p>
              </div>
              <div className="_left_inner_card_txt">
                <h4 className="_left_inner_event_card_title">{event.title}</h4>
              </div>
            </div>
            <hr className="_underline" />
            <div className="_left_inner_event_bottom">
              <p className="_left_iner_event_bottom">{event.going} People Going</p>
              <span className="_left_iner_event_bottom_link">Going</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function StoryRail({ stories }) {
  return (
    <div className="_feed_inner_ppl_card _mar_b16">
      <div className="_feed_inner_story_arrow">
        <button type="button" className="_feed_inner_story_arrow_btn" aria-label="Scroll stories">
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="8" fill="none" viewBox="0 0 9 8">
            <path fill="#fff" d="M8 4l.366-.341.318.341-.318.341L8 4zm-7 .5a.5.5 0 010-1v1zM5.566.659l2.8 3-.732.682-2.8-3L5.566.66zm2.8 3.682l-2.8 3-.732-.682 2.8-3 .732.682zM8 4.5H1v-1h7v1z" />
          </svg>
        </button>
      </div>
      <div className="row g-3">
        {stories.map((story) => (
          <div key={story.id} className="col-xl-3 col-lg-3 col-md-4 col-sm-4 col-6">
            <div className={story.type === "create" ? "_feed_inner_profile_story _b_radious6" : "_feed_inner_public_story _b_radious6"}>
              <div className={story.type === "create" ? "_feed_inner_profile_story_image" : "_feed_inner_public_story_image"}>
                <img src={story.image} alt={story.label} className={story.type === "create" ? "_profile_story_img" : "_public_story_img"} />
                {story.type === "create" ? (
                  <div className="_feed_inner_story_txt">
                    <div className="_feed_inner_story_btn">
                      <button className="_feed_inner_story_btn_link" type="button" aria-label="Create story">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 10 10">
                          <path stroke="#fff" strokeLinecap="round" d="M.5 4.884h9M4.884 9.5v-9" />
                        </svg>
                      </button>
                    </div>
                    <p className="_feed_inner_story_para">Your Story</p>
                  </div>
                ) : null}
                {story.type !== "create" ? (
                  <>
                    <div className="_feed_inner_pulic_story_txt">
                      <p className="_feed_inner_pulic_story_para">{story.label}</p>
                    </div>
                    <div className="_feed_inner_public_mini">
                      <img src="/assets/images/mini_pic.png" alt="Mini profile" className="_public_mini_img" />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  avatarSrc
}) {
  const [activeAction, setActiveAction] = useState("photo");

  return (
    <div className="_feed_inner_text_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
      <div className="_feed_inner_text_area_box">
        <div className="_feed_inner_text_area_box_image">
          <img src={avatarSrc} alt={authorName} className="_txt_img" />
        </div>
        <div className="form-floating _feed_inner_text_area_box_form">
          <textarea
            className="form-control _textarea"
            placeholder="Leave a comment here"
            id="feedComposerTextarea"
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
          />
          <label className="_feed_textarea_label" htmlFor="feedComposerTextarea">
            Write something ...
            <svg xmlns="http://www.w3.org/2000/svg" width="23" height="24" fill="none" viewBox="0 0 23 24">
              <path fill="#666" d="M19.504 19.209c.332 0 .601.289.601.646 0 .326-.226.596-.52.64l-.081.005h-6.276c-.332 0-.602-.289-.602-.645 0-.327.227-.597.52-.64l.082-.006h6.276zM13.4 4.417c1.139-1.223 2.986-1.223 4.125 0l1.182 1.268c1.14 1.223 1.14 3.205 0 4.427L9.82 19.649a2.619 2.619 0 01-1.916.85h-3.64c-.337 0-.61-.298-.6-.66l.09-3.941a3.019 3.019 0 01.794-1.982l8.852-9.5zm-.688 2.562l-7.313 7.85a1.68 1.68 0 00-.441 1.101l-.077 3.278h3.023c.356 0 .698-.133.968-.376l.098-.096 7.35-7.887-3.608-3.87zm3.962-1.65a1.633 1.633 0 00-2.423 0l-.688.737 3.606 3.87.688-.737c.631-.678.666-1.755.105-2.477l-.105-.124-1.183-1.268z" />
            </svg>
          </label>
        </div>
      </div>

      {imagePreview ? (
        <div className="composer-image-preview">
          <img src={imagePreview} alt={imageName || "Selected"} />
          <button type="button" onClick={onImageClear}>
            Remove image
          </button>
        </div>
      ) : null}

      <div className="feed-visibility-group" role="radiogroup" aria-label="Post visibility">
        <button
          type="button"
          className={visibility === "Public" ? "feed-pill is-active" : "feed-pill"}
          onClick={() => onVisibilityChange("Public")}
        >
          Public
        </button>
        <button
          type="button"
          className={visibility === "Private" ? "feed-pill is-active" : "feed-pill"}
          onClick={() => onVisibilityChange("Private")}
        >
          Private
        </button>
      </div>

      <div className="_feed_inner_text_area_bottom">
        <div className="_feed_inner_text_area_item">
          <div className="_feed_inner_text_area_bottom_photo _feed_common">
            <button
              type="button"
              className={`_feed_inner_text_area_bottom_photo_link ${activeAction === "photo" ? "is-active" : ""}`}
              onClick={() => {
                setActiveAction("photo");
                onImagePick();
              }}
            >
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20">
                  <path fill="#666" d="M13.916 0c3.109 0 5.18 2.429 5.18 5.914v8.17c0 3.486-2.072 5.916-5.18 5.916H5.999C2.89 20 .827 17.572.827 14.085v-8.17C.827 2.43 2.897 0 6 0h7.917zm0 1.504H5.999c-2.321 0-3.799 1.735-3.799 4.41v8.17c0 2.68 1.472 4.412 3.799 4.412h7.917c2.328 0 3.807-1.734 3.807-4.411v-8.17c0-2.678-1.478-4.411-3.807-4.411zm.65 8.68l.12.125 1.9 2.147a.803.803 0 01-.016 1.063.642.642 0 01-.894.058l-.076-.074-1.9-2.148a.806.806 0 00-1.205-.028l-.074.087-2.04 2.717c-.722.963-2.02 1.066-2.86.26l-.111-.116-.814-.91a.562.562 0 00-.793-.07l-.075.073-1.4 1.617a.645.645 0 01-.97.029.805.805 0 01-.09-.977l.064-.086 1.4-1.617c.736-.852 1.95-.897 2.734-.137l.114.12.81.905a.587.587 0 00.861.033l.07-.078 2.04-2.718c.81-1.08 2.27-1.19 3.205-.275zM6.831 4.64c1.265 0 2.292 1.125 2.292 2.51 0 1.386-1.027 2.511-2.292 2.511S4.54 8.537 4.54 7.152c0-1.386 1.026-2.51 2.291-2.51zm0 1.504c-.507 0-.918.451-.918 1.007 0 .555.411 1.006.918 1.006.507 0 .919-.451.919-1.006 0-.556-.412-1.007-.919-1.007z" />
                </svg>
              </span>
              Photo
            </button>
          </div>
        </div>
        <div className="_feed_inner_text_area_item">
          <div className="_feed_inner_text_area_bottom_video _feed_common">
            <button type="button" className="_feed_inner_text_area_bottom_photo_link" onClick={() => setActiveAction("video")}>
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="24" fill="none" viewBox="0 0 22 24">
                  <path fill="#666" d="M11.485 4.5c2.213 0 3.753 1.534 3.917 3.784l2.418-1.082c1.047-.468 2.188.327 2.271 1.533l.005.141v6.64c0 1.237-1.103 2.093-2.155 1.72l-.121-.047-2.418-1.083c-.164 2.25-1.708 3.785-3.917 3.785H5.76c-2.343 0-3.932-1.72-3.932-4.188V8.688c0-2.47 1.589-4.188 3.932-4.188h5.726zm0 1.5H5.76C4.169 6 3.197 7.05 3.197 8.688v7.015c0 1.636.972 2.688 2.562 2.688h5.726c1.586 0 2.562-1.054 2.562-2.688v-.686-6.329c0-1.636-.973-2.688-2.562-2.688zM18.4 8.57l-.062.02-2.921 1.306v4.596l2.921 1.307c.165.073.343-.036.38-.215l.008-.07V8.876c0-.195-.16-.334-.326-.305z" />
                </svg>
              </span>
              Video
            </button>
          </div>
        </div>
        <div className="_feed_inner_text_area_item">
          <div className="_feed_inner_text_area_bottom_event _feed_common">
            <button type="button" className="_feed_inner_text_area_bottom_photo_link" onClick={() => setActiveAction("event")}>
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="24" fill="none" viewBox="0 0 22 24">
                  <path fill="#666" d="M14.371 2c.32 0 .585.262.627.603l.005.095v.788c2.598.195 4.188 2.033 4.18 5v8.488c0 3.145-1.786 5.026-4.656 5.026H7.395C4.53 22 2.74 20.087 2.74 16.904V8.486c0-2.966 1.596-4.804 4.187-5v-.788c0-.386.283-.698.633-.698.32 0 .584.262.626.603l.006.095v.771h5.546v-.771c0-.386.284-.698.633-.698zm3.546 8.283H4.004l.001 6.621c0 2.325 1.137 3.616 3.183 3.697l.207.004h7.132c2.184 0 3.39-1.271 3.39-3.63v-6.692zm-3.202 5.853c.349 0 .632.312.632.698 0 .353-.238.645-.546.691l-.086.006c-.357 0-.64-.312-.64-.697 0-.354.237-.645.546-.692l.094-.006zm-3.742 0c.35 0 .632.312.632.698 0 .353-.238.645-.546.691l-.086.006c-.357 0-.64-.312-.64-.697 0-.354.238-.645.546-.692l.094-.006zm-3.75 0c.35 0 .633.312.633.698 0 .353-.238.645-.547.691l-.093.006c-.35 0-.633-.312-.633-.697 0-.354.238-.645.547-.692l.094-.006zm7.492-3.615c.349 0 .632.312.632.697 0 .354-.238.645-.546.692l-.086.006c-.357 0-.64-.312-.64-.698 0-.353.237-.645.546-.691l.094-.006zm-3.742 0c.35 0 .632.312.632.697 0 .354-.238.645-.546.692l-.086.006c-.357 0-.64-.312-.64-.698 0-.353.238-.645.546-.691l.094-.006zm-3.75 0c.35 0 .633.312.633.697 0 .354-.238.645-.547.692l-.093.006c-.35 0-.633-.312-.633-.698 0-.353.238-.645.547-.691l.094-.006zm6.515-7.657H8.192v.895c0 .385-.283.698-.633.698-.32 0-.584-.263-.626-.603l-.006-.095v-.874c-1.886.173-2.922 1.422-2.922 3.6v.402h13.912v-.403c.007-2.181-1.024-3.427-2.914-3.599v.874c0 .385-.283.698-.632.698-.32 0-.585-.263-.627-.603l-.005-.095v-.895z" />
                </svg>
              </span>
              Event
            </button>
          </div>
        </div>
        <div className="_feed_inner_text_area_item">
          <div className="_feed_inner_text_area_bottom_article _feed_common">
            <button type="button" className="_feed_inner_text_area_bottom_photo_link" onClick={() => setActiveAction("article")}>
              <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="20" fill="none" viewBox="0 0 18 20">
                  <path fill="#666" d="M12.49 0c2.92 0 4.665 1.92 4.693 5.132v9.659c0 3.257-1.75 5.209-4.693 5.209H5.434c-.377 0-.734-.032-1.07-.095l-.2-.041C2 19.371.74 17.555.74 14.791V5.209c0-.334.019-.654.055-.96C1.114 1.564 2.799 0 5.434 0h7.056zm-.008 1.457H5.434c-2.244 0-3.381 1.263-3.381 3.752v9.582c0 2.489 1.137 3.752 3.38 3.752h7.049c2.242 0 3.372-1.263 3.372-3.752V5.209c0-2.489-1.13-3.752-3.372-3.752zm-.239 12.053c.36 0 .652.324.652.724 0 .4-.292.724-.652.724H5.656c-.36 0-.652-.324-.652-.724 0-.4.293-.724.652-.724h6.587zm0-4.239a.643.643 0 01.632.339.806.806 0 010 .78.643.643 0 01-.632.339H5.656c-.334-.042-.587-.355-.587-.729s.253-.688.587-.729h6.587zM8.17 5.042c.335.041.588.355.588.729 0 .373-.253.687-.588.728H5.665c-.336-.041-.589-.355-.589-.728 0-.374.253-.688.589-.729H8.17z" />
                </svg>
              </span>
              Article
            </button>
          </div>
        </div>
      </div>

      <div className="_feed_inner_text_area_btn">
        <button type="button" className="_feed_inner_text_area_btn_link" onClick={onSubmit} disabled={posting || !content.trim()}>
          <svg className="_mar_img" xmlns="http://www.w3.org/2000/svg" width="14" height="13" fill="none" viewBox="0 0 14 13">
            <path fill="#fff" fillRule="evenodd" d="M6.37 7.879l2.438 3.955a.335.335 0 00.34.162c.068-.01.23-.05.289-.247l3.049-10.297a.348.348 0 00-.09-.35.341.341 0 00-.34-.088L1.75 4.03a.34.34 0 00-.247.289.343.343 0 00.16.347L5.666 7.17 9.2 3.597a.5.5 0 01.712.703L6.37 7.88zM9.097 13c-.464 0-.89-.236-1.14-.641L5.372 8.165l-4.237-2.65a1.336 1.336 0 01-.622-1.331c.074-.536.441-.96.957-1.112L11.774.054a1.347 1.347 0 011.67 1.682l-3.05 10.296A1.332 1.332 0 019.098 13z" clipRule="evenodd" />
          </svg>
          <span>{posting ? "Posting..." : "Post"}</span>
        </button>
      </div>

      {imageName ? <p className="composer-image-name">Selected: {imageName}</p> : null}
      {error ? <p className="composer-error">{error}</p> : null}
    </div>
  );
}

function CommentItem({
  comment,
  currentUser,
  token,
  onUnauthorized,
  onCommentReaction,
  onReplyCreated,
  isReply = false
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [replyValue, setReplyValue] = useState("");
  const [likePending, setLikePending] = useState(false);
  const [replyPending, setReplyPending] = useState(false);

  const likes = comment.likes || [];
  const replies = comment.replies || [];
  const hasReplies = replies.length > 0;
  const commentLiked = Boolean(comment.likedByMe);
  const likeCount = typeof comment.likeCount === "number" ? comment.likeCount : likes.length;
  const likedBy = useMemo(() => likes.map((item) => item.name).filter(Boolean), [likes]);
  const avatarSize = isReply ? 32 : 40;

  async function handleLikeComment() {
    if (likePending || !isPersistedEntityId(comment.id)) {
      return;
    }
    setLikePending(true);
    try {
      const summary = commentLiked
        ? await unlikeReaction(token, REACTION_TARGET.COMMENT, Number(comment.id))
        : await likeReaction(token, REACTION_TARGET.COMMENT, Number(comment.id));
      onCommentReaction(Number(comment.id), summary);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
      }
    } finally {
      setLikePending(false);
    }
  }

  async function handleSubmitReply(event) {
    event.preventDefault();
    if (!replyValue.trim() || replyPending || !isPersistedEntityId(comment.id)) {
      return;
    }
    setReplyPending(true);
    try {
      const created = await createReply(token, Number(comment.id), replyValue.trim());
      onReplyCreated(Number(comment.id), created);
      setReplyValue("");
      setReplyOpen(false);
      setRepliesOpen(true);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
      }
    } finally {
      setReplyPending(false);
    }
  }

  return (
    <div className={`_comment_main comment-thread ${isReply ? "comment-thread-nested" : ""}`.trim()}>
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
      <div className="_comment_area">
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">{comment.authorName}</h4>
            </div>
          </div>
          <div className="_comment_status">
            <p className="_comment_status_text">
              <span>{comment.content}</span>
            </p>
          </div>
          {likedBy.length ? <p className="comment-like-summary">Liked by {likedBy.join(", ")}</p> : null}
          <div className="_comment_reply">
            <div className="_comment_reply_num">
              <ul className="_comment_reply_list">
                <li>
                  <button type="button" onClick={handleLikeComment} disabled={likePending || !isPersistedEntityId(comment.id)}>
                    {commentLiked ? "Unlike" : "Like"}
                    {likeCount > 0 ? ` (${likeCount})` : ""}
                    {likePending ? "…" : ""}.
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setReplyOpen((current) => !current)} disabled={!isPersistedEntityId(comment.id)}>
                    Reply.
                  </button>
                </li>
                {hasReplies ? (
                  <li>
                    <button type="button" className="feed-inline-toggle" onClick={() => setRepliesOpen((current) => !current)} aria-expanded={repliesOpen}>
                      {repliesOpen ? `Hide replies (${replies.length})` : `View replies (${replies.length})`}
                    </button>
                  </li>
                ) : null}
                <li>
                  <button type="button">Share</button>
                </li>
                <li>
                  <span className="_time_link">{formatTimeAgo(comment.createdAt)}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {replyOpen ? (
          <form className="comment-reply-form" onSubmit={handleSubmitReply}>
            <textarea
              className="form-control _comment_textarea"
              placeholder="Write a reply"
              value={replyValue}
              onChange={(event) => setReplyValue(event.target.value)}
              rows={2}
            />
            <div className="comment-reply-actions">
              <button type="button" className="comment-cancel-button" onClick={() => setReplyOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="comment-submit-button" disabled={replyPending}>
                {replyPending ? "Sending…" : "Reply"}
              </button>
            </div>
          </form>
        ) : null}

        {hasReplies && repliesOpen ? (
          <div className="comment-replies">
            {replies.map((reply, replyIndex) => (
              <CommentItem
                key={makeListKey(`reply-${comment.id}`, reply, replyIndex)}
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
        ) : null}
      </div>
    </div>
  );
}

export function PostCard({ post, currentUser, token, onPostUpdated, onUnauthorized }) {
  const [likes, setLikes] = useState(post.likes || []);
  const [liked, setLiked] = useState(() => Boolean(post.likedByMe ?? post.liked ?? likes.some((entry) => entry.id === buildCurrentUserLike(currentUser).id)));
  const [comments, setComments] = useState(post.comments || []);
  const [commentValue, setCommentValue] = useState("");
  const [imageExpanded, setImageExpanded] = useState(Boolean(post.imageUrl));
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [postLikePending, setPostLikePending] = useState(false);
  const [commentSubmitPending, setCommentSubmitPending] = useState(false);

  useEffect(() => {
    setLikes(post.likes || []);
    setLiked(Boolean(post.likedByMe ?? post.liked));
    setComments(post.comments || []);
  }, [post]);

  const likedBy = useMemo(() => likes.map((entry) => entry.name).filter(Boolean), [likes]);
  const likeTotal = typeof post.likeCount === "number" ? post.likeCount : likes.length;
  const visibleComments = commentsExpanded ? comments : comments.slice(0, COMMENTS_PREVIEW_COUNT);
  const hiddenCommentsCount = Math.max(0, comments.length - COMMENTS_PREVIEW_COUNT);

  function handleCommentReaction(commentId, summary) {
    setComments((prev) => {
      const next = updateCommentInTree(prev, commentId, (c) => mergeCommentWithReactionSummary(c, summary));
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
    if (postLikePending || !isPersistedEntityId(post.id)) {
      return;
    }
    setPostLikePending(true);
    try {
      const summary = liked
        ? await unlikeReaction(token, REACTION_TARGET.POST, Number(post.id))
        : await likeReaction(token, REACTION_TARGET.POST, Number(post.id));
      const merged = mergePostWithReactionSummary({ ...post, comments }, summary);
      setLikes(merged.likes);
      setLiked(merged.likedByMe);
      onPostUpdated(merged);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
      }
    } finally {
      setPostLikePending(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!commentValue.trim() || commentSubmitPending || !isPersistedEntityId(post.id)) {
      return;
    }
    setCommentSubmitPending(true);
    try {
      const created = await createComment(token, Number(post.id), commentValue.trim());
      setComments((prev) => {
        const next = [created, ...prev];
        onPostUpdated({ ...post, comments: next });
        return next;
      });
      setCommentValue("");
      setCommentsExpanded(true);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized();
      }
    } finally {
      setCommentSubmitPending(false);
    }
  }

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16 post-card">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <Avatar src={post.authorAvatar || "/assets/images/post_img.png"} alt={post.authorName} size={48} className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">{post.authorName}</h4>
              <p className="_feed_inner_timeline_post_box_para">
                {formatTimeAgo(post.createdAt)} . <span className={`post-visibility-pill post-visibility-${String(post.visibility || "Public").toLowerCase()}`}>{post.visibility || "Public"}</span>
              </p>
            </div>
          </div>
          <div className="_feed_inner_timeline_post_box_dropdown">
            <div className="_feed_timeline_post_dropdown">
              <button type="button" className="_feed_timeline_post_dropdown_link" aria-label="More actions">
                <svg xmlns="http://www.w3.org/2000/svg" width="4" height="17" fill="none" viewBox="0 0 4 17">
                  <circle cx="2" cy="2" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="8" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="15" r="2" fill="#C4C4C4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {post.content ? <h4 className="_feed_inner_timeline_post_title">{post.content}</h4> : null}

        {post.imageUrl ? (
          <button type="button" className="post-image-toggle" onClick={() => setImageExpanded((current) => !current)}>
            {imageExpanded ? <img src={post.imageUrl} alt={post.content || "Post image"} className="_time_img" /> : null}
            <span>{imageExpanded ? "Hide image" : "Show image"}</span>
          </button>
        ) : null}
      </div>

      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        <div className="_feed_inner_timeline_total_reacts_image">
          <img src="/assets/images/react_img1.png" alt="Reaction" className="_react_img1" />
          <img src="/assets/images/react_img2.png" alt="Reaction" className="_react_img" />
          <img src="/assets/images/react_img3.png" alt="Reaction" className="_react_img _rect_img_mbl_none" />
          <img src="/assets/images/react_img4.png" alt="Reaction" className="_react_img _rect_img_mbl_none" />
          <img src="/assets/images/react_img5.png" alt="Reaction" className="_react_img _rect_img_mbl_none" />
          <p className="_feed_inner_timeline_total_reacts_para">{likeTotal ? `${likeTotal}+` : "0"}</p>
        </div>
        <div className="_feed_inner_timeline_total_reacts_txt">
          <p className="_feed_inner_timeline_total_reacts_para1">
            <span>{comments.length}</span> Comment
          </p>
          <p className="_feed_inner_timeline_total_reacts_para2">
            <span>{Math.max(0, likes.length * 2)}</span> Share
          </p>
        </div>
      </div>

      <div className="_feed_inner_timeline_reaction">
        <IconButton
          className="_feed_inner_timeline_reaction_emoji _feed_reaction"
          active={liked}
          onClick={togglePostLike}
          title="Like post"
          disabled={postLikePending || !isPersistedEntityId(post.id)}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              👍 {postLikePending ? "…" : liked ? "Unlike" : "Like"}
            </span>
          </span>
        </IconButton>
        <IconButton className="_feed_inner_timeline_reaction_comment _feed_reaction" onClick={() => setCommentsExpanded(true)} title="Comment">
          <span className="_feed_inner_timeline_reaction_link">
            <span>💬 Comment</span>
          </span>
        </IconButton>
        <IconButton className="_feed_inner_timeline_reaction_share _feed_reaction" title="Share">
          <span className="_feed_inner_timeline_reaction_link">
            <span>↗ Share</span>
          </span>
        </IconButton>
      </div>

      <div className="_feed_inner_timeline_cooment_area">
        <div className="_feed_inner_comment_box">
          <form className="_feed_inner_comment_box_form" onSubmit={handleCommentSubmit}>
            <div className="_feed_inner_comment_box_content">
              <div className="_feed_inner_comment_box_content_image">
                <img src={currentUser?.avatar || "/assets/images/profile-avatar.png"} alt={currentUser?.name || "Your avatar"} className="_comment_img" />
              </div>
              <div className="_feed_inner_comment_box_content_txt">
                <textarea
                  className="form-control _comment_textarea"
                  placeholder="Write a comment"
                  value={commentValue}
                  onChange={(event) => setCommentValue(event.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <div className="_feed_inner_comment_box_icon">
              <button type="button" className="_feed_inner_comment_box_icon_btn" aria-label="Voice comment">
                🎤
              </button>
              <button type="button" className="_feed_inner_comment_box_icon_btn" aria-label="Attach image">
                🖼
              </button>
                <button
                  type="submit"
                  className="_feed_inner_comment_box_icon_btn feed-comment-submit-btn"
                  aria-label="Post comment"
                  disabled={commentSubmitPending || !isPersistedEntityId(post.id)}
                >
                  {commentSubmitPending ? "…" : "Post"}
                </button>
            </div>
          </form>
        </div>
      </div>

      {likedBy.length ? <div className="post-liked-by">Liked by {likedBy.join(", ")}</div> : null}

      <div className="_timline_comment_main">
        {comments.length > 0 ? (
          <div className="_previous_comment">
            <button type="button" className="_previous_comment_txt" onClick={() => setCommentsExpanded((current) => !current)} aria-expanded={commentsExpanded}>
              {commentsExpanded
                ? `Show fewer comments`
                : hiddenCommentsCount > 0
                  ? `View all ${comments.length} comments`
                  : `View comment thread (${comments.length})`}
            </button>
          </div>
        ) : null}
        {visibleComments.map((comment, commentIndex) => (
          <CommentItem
            key={makeListKey(`comment-${post.id}`, comment, commentIndex)}
            comment={comment}
            currentUser={currentUser}
            token={token}
            onUnauthorized={onUnauthorized}
            onCommentReaction={handleCommentReaction}
            onReplyCreated={handleReplyCreated}
          />
        ))}
      </div>
    </div>
  );
}

export function RightPeopleList({ people }) {
  return (
    <div className="_feed_top_fixed">
      <div className="_feed_right_inner_area_card_content _mar_b24">
        <h4 className="_feed_right_inner_area_card_content_title _title5">Your Friends</h4>
        <span className="_feed_right_inner_area_card_content_txt">
          <button type="button" className="_feed_right_inner_area_card_content_txt_link feed-link-button">
            See All
          </button>
        </span>
      </div>
      <form className="_feed_right_inner_area_card_form" onSubmit={(event) => event.preventDefault()}>
        <svg className="_feed_right_inner_area_card_form_svg" xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 17 17">
          <circle cx="7" cy="7" r="6" stroke="#666" />
          <path stroke="#666" strokeLinecap="round" d="M16 16l-3-3" />
        </svg>
        <input className="form-control me-2 _feed_right_inner_area_card_form_inpt" type="search" placeholder="Search friends" aria-label="Search" />
      </form>
      <div className="_feed_bottom_fixed">
        {people.map((person) => (
          <div key={person.id} className={`_feed_right_inner_area_card_ppl ${person.online ? "" : "_feed_right_inner_area_card_ppl_inactive"}`.trim()}>
            <div className="_feed_right_inner_area_card_ppl_box">
              <div className="_feed_right_inner_area_card_ppl_image">
                <span>
                  <Avatar src={person.image} alt={person.name} size={44} className="_box_ppl_img" />
                </span>
              </div>
              <div className="_feed_right_inner_area_card_ppl_txt">
                <h4 className="_feed_right_inner_area_card_ppl_title">{person.name}</h4>
                <p className="_feed_right_inner_area_card_ppl_para">{person.role}</p>
              </div>
            </div>
            <div className="_feed_right_inner_area_card_ppl_side">
              {person.online ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 14 14">
                  <rect width="12" height="12" x="1" y="1" fill="#0ACF83" stroke="#fff" strokeWidth="2" rx="6" />
                </svg>
              ) : (
                <span>{person.timeLabel || "5 minute ago"}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeedColumnTitle({ title, actionLabel, actionHref = "#0" }) {
  return (
    <div className="feed-column-title">
      <h4>{title}</h4>
      {actionLabel ? (
        <a href={actionHref} className="feed-column-title-link">
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}

export { formatTimeAgo };

