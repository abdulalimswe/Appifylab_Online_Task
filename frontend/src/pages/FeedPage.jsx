import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UnauthorizedError, createPost, fetchPosts, sortByNewestFirst, uploadPostImage } from "../api/client";
import {
  ComposerCard,
  EventList,
  FeedHeader,
  PostCard,
  FeedSkeletonList,
  RightPeopleList,
  SidebarCard,
  StoryRail,
  SuggestedPeopleList
} from "../components/FeedBlocks";
import { useAuth } from "../context/AuthContext";
import { demoPosts, eventCards, exploreItems, rightSidebarPeople, sortSeedPostsNewestFirst, storyCards, suggestedPeople } from "../data/feedSeeds";

function FeedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, fullName, email, profilePhotoUrl, logout } = useAuth();
  const [posts, setPosts] = useState([]);
  const [composerContent, setComposerContent] = useState("");
  const [composerVisibility, setComposerVisibility] = useState("Public");
  const [composerError, setComposerError] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoadPending, setInitialLoadPending] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const imageRef = useRef(null);
  const objectUrlRef = useRef("");

  const profileAvatar = profilePhotoUrl || "/assets/images/profile-avatar.png";
  const currentUser = {
    id: email || fullName || "current-user",
    name: fullName || email || "User",
    email: email || "",
    avatar: profileAvatar
  };

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      setLoading(true);
      setLoadError("");

      try {
        const data = await fetchPosts(token);
        if (!active) {
          return;
        }

        if (data.length) {
          setPosts(sortByNewestFirst(data));
        } else {
          setPosts(sortSeedPostsNewestFirst(demoPosts));
        }
      } catch (err) {
        if (handleUnauthorized(err)) {
          return;
        }
        if (active) {
          setLoadError(err.message || "Unable to load feed");
          setPosts(sortSeedPostsNewestFirst(demoPosts));
        }
      } finally {
        if (active) {
          setLoading(false);
          setInitialLoadPending(false);
        }
      }
    }

    loadPosts();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function handleImagePick(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setComposerError("Please select a valid image file");
      if (imageRef.current) {
        imageRef.current.value = "";
      }
      return;
    }

    setComposerError("");

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

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
    if (imageRef.current) {
      imageRef.current.value = "";
    }
  }

  async function handleCreatePost() {
    if (!composerContent.trim()) {
      return;
    }

    setPosting(true);
    setComposerError("");

    try {
      let uploadedImageUrl = "";
      if (imageFile) {
        uploadedImageUrl = await uploadPostImage(token, imageFile);
      }

      const created = await createPost(token, {
        content: composerContent.trim(),
        visibility: String(composerVisibility || "PUBLIC").toUpperCase(),
        ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {})
      });

      setPosts((current) => sortByNewestFirst([created, ...current]));
      setComposerContent("");
      handleImageClear();
    } catch (err) {
      if (handleUnauthorized(err)) {
        return;
      }
      const message = err.message || "Failed to create post";
      if (message.toLowerCase().includes("upload")) {
        setComposerError(`${message}. You can remove the image and try again.`);
      } else {
        setComposerError(message);
      }
    } finally {
      setPosting(false);
    }
  }

  function triggerImagePicker() {
    imageRef.current?.click();
  }

  function handleUnauthorized(error) {
    if (!(error instanceof UnauthorizedError)) {
      return false;
    }

    logout();
    navigate("/login", { replace: true });
    return true;
  }

  function handlePostUpdated(nextPost) {
    setPosts((current) => current.map((p) => (String(p.id) === String(nextPost.id) ? nextPost : p)));
  }

  const showInitialSkeleton = loading && initialLoadPending && posts.length === 0;
  const showLoginTransition = location.state?.loginTransition === true && showInitialSkeleton;

  return (
    <div className="_layout _layout_main_wrapper social-feed-shell">
      <div className="_main_layout">
        <FeedHeader fullName={fullName} email={email} avatarSrc={profileAvatar} onLogout={logout} />

        <div className="container _custom_container">
          <div className="_layout_inner_wrap">
            <div className="row g-4">
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                <div className="_layout_left_sidebar_wrap">
                  <div className="_layout_left_sidebar_inner">
                    <div className="_left_inner_area_explore _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
                      <h4 className="_left_inner_area_explore_title _title5 _mar_b24">Explore</h4>
                      <ul className="_left_inner_area_explore_list">
                        {exploreItems.map((item) => (
                          <li key={item.id} className={`_left_inner_area_explore_item ${item.badge ? "_explore_item" : ""}`.trim()}>
                            <a href={item.href} className="_left_inner_area_explore_link">
                              {item.label}
                            </a>
                            {item.badge ? <span className="_left_inner_area_explore_link_txt">{item.badge}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <SidebarCard title="Suggested People" actionLabel="See All">
                    <SuggestedPeopleList people={suggestedPeople} />
                  </SidebarCard>

                  <SidebarCard title="Events" actionLabel="See all" className="event-card-wrap">
                    <EventList items={eventCards} />
                  </SidebarCard>
                </div>
              </div>

              <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
                <div className="_layout_middle_wrap">
                  <div className="_layout_middle_inner">
                    <StoryRail stories={storyCards} />

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

                    {loadError ? <div className="feed-banner feed-banner-error">{loadError}</div> : null}
                    {showLoginTransition ? <div className="feed-banner">Login successful. Preparing your feed...</div> : null}

                    {showInitialSkeleton ? (
                      <FeedSkeletonList count={3} />
                    ) : (
                      <div className="feed-post-list">
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

              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                <div className="_layout_right_sidebar_wrap">
                  <div className="_layout_right_sidebar_inner">
                    <div className="_right_inner_area_info _padd_t24 _padd_b24 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
                      <div className="_right_inner_area_info_content _mar_b24">
                        <h4 className="_right_inner_area_info_content_title _title5">You Might Like</h4>
                        <span className="_right_inner_area_info_content_txt">
                          <span className="_right_inner_area_info_content_txt_link" role="button" tabIndex={0}>
                            See All
                          </span>
                        </span>
                      </div>
                      <hr className="_underline" />
                      <div className="_right_inner_area_info_ppl">
                        <div className="_right_inner_area_info_box">
                          <div className="_right_inner_area_info_box_image">
                            <span>
                              <img src="/assets/images/Avatar.png" alt="Radovan SkillArena" className="_ppl_img" />
                            </span>
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

      <input ref={imageRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
    </div>
  );
}

export default FeedPage;

