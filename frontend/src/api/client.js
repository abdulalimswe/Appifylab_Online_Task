/** Empty = same-origin `/api/...` (use Vite dev proxy to backend). Set VITE_API_BASE_URL for a full backend URL. */
const RAW_API_BASE_URL = typeof import.meta.env.VITE_API_BASE_URL === "string" ? import.meta.env.VITE_API_BASE_URL.trim() : "";
const API_BASE_URL = RAW_API_BASE_URL || (import.meta.env.PROD ? "https://striking-cat-production-fed5.up.railway.app" : "");
const MAX_POST_IMAGE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 25000);
const POST_IMAGE_UPLOAD_PATH = import.meta.env.VITE_POST_IMAGE_UPLOAD_PATH || "/api/posts/upload-image";
const POST_IMAGE_UPLOAD_FIELD = import.meta.env.VITE_POST_IMAGE_UPLOAD_FIELD || "image";
const DEFAULT_PROFILE_AVATAR = "/assets/images/profile-avatar.png";
const DEFAULT_POST_AUTHOR_AVATAR = "/assets/images/post_img.png";
const DEFAULT_COMMENT_AUTHOR_AVATAR = "/assets/images/comment_img.png";

export class UnauthorizedError extends Error {
  constructor(message = "Session expired. Please log in again") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

async function parseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function formatValidationDetails(details) {
  if (!details || typeof details !== "object") {
    return "";
  }
  return Object.entries(details)
    .map(([field, msg]) => `${field}: ${msg}`)
    .join(". ");
}

async function handleResponse(response, { requiresAuth = false } = {}) {
  const data = await parseBody(response);

  if (!response.ok) {
    if (response.status === 401) {
      if (requiresAuth) {
        throw new UnauthorizedError();
      }

      throw new Error(data.message || data.error || "Invalid email or password");
    }

    if (response.status === 403) {
      throw new Error("You are not allowed to perform this action");
    }

    if (response.status === 413) {
      throw new Error(data.message || "Image file is too large. Try a file under 10 MB.");
    }

    if (response.status >= 500) {
      throw new Error(data.message || "Server error. Please try again");
    }

    const validation = formatValidationDetails(data.details);
    throw new Error(validation || data.message || data.error || "Request failed");
  }

  return data;
}

function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) {
    return normalizedPath;
  }
  return `${API_BASE_URL.replace(/\/+$/, "")}${normalizedPath}`;
}

async function safeFetch(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw new Error("Network error: unable to reach backend API. Please check backend URL and CORS settings.");
  } finally {
    clearTimeout(timeout);
  }
}

function requestJson(path, options = {}) {
  return safeFetch(buildApiUrl(path), {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body ? { "Content-Type": "application/json" } : {})
    }
  });
}

function requestMultipart(path, formData, options = {}) {
  return safeFetch(buildApiUrl(path), {
    ...options,
    body: formData,
    headers: {
      ...(options.headers || {})
    }
  });
}

function extractUploadedImageUrl(payload) {
  if (payload == null) {
    return "";
  }
  if (typeof payload === "string") {
    return payload.trim();
  }
  if (typeof payload !== "object") {
    return "";
  }

  const nested = payload.data && typeof payload.data === "object" ? payload.data : null;
  const raw =
    payload.imageUrl ||
    payload.url ||
    payload.secureUrl ||
    payload.secure_url ||
    (nested && (nested.secure_url || nested.secureUrl || nested.url)) ||
    "";

  return typeof raw === "string" ? raw.trim() : "";
}

export const REACTION_TARGET = {
  POST: "POST",
  COMMENT: "COMMENT"
};

function mapLikersToLikes(likedBy) {
  if (!Array.isArray(likedBy)) {
    return [];
  }
  return likedBy.map((user, likerIndex) => ({
    id: `${user.email ?? user.fullName ?? likerIndex}`,
    name: user.fullName ?? user.email ?? "User",
    email: user.email ?? "",
    avatar: normalizeOptionalString(user.avatar, DEFAULT_PROFILE_AVATAR)
  }));
}

function normalizeOptionalString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

/** Merge API reaction summary into a normalized post for UI state. */
export function mergePostWithReactionSummary(post, summary) {
  const likes = mapLikersToLikes(summary.likedBy);
  return {
    ...post,
    likeCount: summary.totalLikes,
    likedByMe: summary.likedByMe,
    liked: summary.likedByMe,
    likes,
    reactions: {
      totalLikes: summary.totalLikes,
      likedByMe: summary.likedByMe,
      likedBy: summary.likedBy ?? []
    }
  };
}

/** Merge API reaction summary into a normalized comment (and nested shape). */
export function mergeCommentWithReactionSummary(comment, summary) {
  const likes = mapLikersToLikes(summary.likedBy);
  return {
    ...comment,
    likeCount: summary.totalLikes,
    likedByMe: summary.likedByMe,
    likes,
    reactions: {
      totalLikes: summary.totalLikes,
      likedByMe: summary.likedByMe,
      likedBy: summary.likedBy ?? []
    }
  };
}

export function normalizePost(post, index = 0) {
  const likedBy = Array.isArray(post.reactions?.likedBy)
    ? mapLikersToLikes(post.reactions.likedBy)
    : [];

  const normalizedComments = Array.isArray(post.comments)
    ? post.comments.map((comment, commentIndex) => normalizeComment(comment, commentIndex))
    : [];

  const totalLikes =
    typeof post.reactions?.totalLikes === "number"
      ? post.reactions.totalLikes
      : typeof post.likeCount === "number"
        ? post.likeCount
        : Array.isArray(post.likes)
          ? post.likes.length
          : likedBy.length;

  const likedByMe = Boolean(post.reactions?.likedByMe ?? post.likedByMe ?? post.liked);

  const totalComments =
    typeof post.reactions?.totalComments === "number"
      ? post.reactions.totalComments
      : typeof post.commentCount === "number"
        ? post.commentCount
        : typeof post.commentsCount === "number"
          ? post.commentsCount
          : normalizedComments.length;

  const totalShares =
    typeof post.reactions?.totalShares === "number"
      ? post.reactions.totalShares
      : typeof post.shareCount === "number"
        ? post.shareCount
        : typeof post.sharesCount === "number"
          ? post.sharesCount
          : 0;

  return {
    id: post.id ?? post.postId ?? `${post.createdAt ?? index}-${index}`,
    content: post.content ?? post.message ?? post.text ?? "",
    createdAt: post.createdAt ?? post.created_at ?? new Date().toISOString(),
    visibility: post.visibility ?? post.postVisibility ?? "Public",
    imageUrl: normalizeOptionalString(post.imageUrl ?? post.image ?? post.mediaUrl ?? post.photoUrl ?? "", ""),
    authorName: post.authorName ?? post.fullName ?? post.author?.fullName ?? post.author?.name ?? "Community member",
    authorEmail: post.authorEmail ?? post.email ?? post.author?.email ?? "",
    authorAvatar: normalizeOptionalString(post.authorAvatar ?? post.avatarUrl ?? post.avatar, DEFAULT_POST_AUTHOR_AVATAR),
    likes: Array.isArray(post.likes) ? post.likes : likedBy,
    likeCount: totalLikes,
    likedByMe,
    liked: likedByMe,
    comments: normalizedComments,
    commentCount: totalComments,
    shareCount: totalShares,
    reactions: post.reactions
  };
}

export function normalizeComment(comment, index = 0) {
  const replies = Array.isArray(comment.replies)
    ? comment.replies.map((reply, replyIndex) => normalizeComment(reply, replyIndex))
    : [];

  const likes = Array.isArray(comment.likes)
    ? comment.likes.map((item, likeIndex) => ({
        id: item.id ?? `${item.email ?? item.name ?? likeIndex}`,
        name: item.name ?? item.fullName ?? item.email ?? "User",
        email: item.email ?? "",
        avatar: normalizeOptionalString(item.avatar, DEFAULT_PROFILE_AVATAR)
      }))
    : Array.isArray(comment.reactions?.likedBy)
      ? mapLikersToLikes(comment.reactions.likedBy)
      : [];

  const likeCount =
    typeof comment.reactions?.totalLikes === "number"
      ? comment.reactions.totalLikes
      : likes.length;

  const likedByMe = Boolean(comment.reactions?.likedByMe);

  return {
    id: comment.id ?? `comment-${index}`,
    content: comment.content ?? "",
    authorName: comment.authorName ?? comment.author?.fullName ?? "Community member",
    authorEmail: comment.authorEmail ?? comment.author?.email ?? "",
    authorAvatar: normalizeOptionalString(comment.authorAvatar, DEFAULT_COMMENT_AUTHOR_AVATAR),
    createdAt: comment.createdAt ?? new Date().toISOString(),
    likes,
    likeCount,
    likedByMe,
    replies
  };
}

export function sortByNewestFirst(items) {
  return [...items].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

export async function register(payload) {
  const response = await requestJson("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return handleResponse(response, { requiresAuth: false });
}

export async function login(payload) {
  const response = await requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return handleResponse(response, { requiresAuth: false });
}

export async function fetchPosts(token) {
  const response = await requestJson("/api/posts", {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await handleResponse(response, { requiresAuth: true });
  return Array.isArray(data) ? data.map(normalizePost) : [];
}

export async function createPost(token, payload) {
  const body = {
    content: payload.content,
    visibility: payload.visibility
  };
  if (payload.imageUrl) {
    body.imageUrl = payload.imageUrl;
  }

  const response = await requestJson("/api/posts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });

  return normalizePost(await handleResponse(response, { requiresAuth: true }));
}

export async function uploadPostImage(token, file) {
  if (!file || file.size === 0) {
    throw new Error("Please choose a non-empty image file");
  }
  if (file.size > MAX_POST_IMAGE_BYTES) {
    throw new Error("Image is too large (max 10 MB). Try a smaller file.");
  }

  const formData = new FormData();
  formData.append(POST_IMAGE_UPLOAD_FIELD, file, file.name || "upload");

  const response = await requestMultipart(POST_IMAGE_UPLOAD_PATH, formData, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await handleResponse(response, { requiresAuth: true });
  const imageUrl = extractUploadedImageUrl(data);
  if (!imageUrl) {
    throw new Error("Upload succeeded but no image URL was returned");
  }

  return imageUrl;
}

export async function createComment(token, postId, content) {
  const response = await requestJson(`/api/posts/${postId}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content })
  });

  return normalizeComment(await handleResponse(response, { requiresAuth: true }));
}

export async function createReply(token, commentId, content) {
  const response = await requestJson(`/api/posts/comments/${commentId}/replies`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content })
  });

  return normalizeComment(await handleResponse(response, { requiresAuth: true }));
}

export async function likeReaction(token, targetType, targetId) {
  const response = await requestJson("/api/posts/reactions/like", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetType, targetId })
  });

  return handleResponse(response, { requiresAuth: true });
}

export async function unlikeReaction(token, targetType, targetId) {
  const response = await requestJson("/api/posts/reactions/like", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetType, targetId })
  });

  return handleResponse(response, { requiresAuth: true });
}

