const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const POST_IMAGE_UPLOAD_PATH = import.meta.env.VITE_POST_IMAGE_UPLOAD_PATH || "/api/posts/upload-image";
const POST_IMAGE_UPLOAD_FIELD = import.meta.env.VITE_POST_IMAGE_UPLOAD_FIELD || "image";

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

async function handleResponse(response) {
  const data = await parseBody(response);

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
}

function requestJson(path, options = {}) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body ? { "Content-Type": "application/json" } : {})
    }
  });
}

function requestMultipart(path, formData, options = {}) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    body: formData,
    headers: {
      ...(options.headers || {})
    }
  });
}

function extractUploadedImageUrl(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  return payload.imageUrl || payload.url || payload.secureUrl || payload.secure_url || "";
}

export function normalizePost(post, index = 0) {
  const likedBy = Array.isArray(post.reactions?.likedBy)
    ? post.reactions.likedBy.map((user, likerIndex) => ({
        id: `${user.email ?? user.fullName ?? likerIndex}`,
        name: user.fullName ?? user.email ?? "User",
        email: user.email ?? "",
        avatar: user.avatar ?? "/assets/images/profile.png"
      }))
    : [];

  const normalizedComments = Array.isArray(post.comments)
    ? post.comments.map((comment, commentIndex) => normalizeComment(comment, commentIndex))
    : [];

  return {
    id: post.id ?? post.postId ?? `${post.createdAt ?? index}-${index}`,
    content: post.content ?? post.message ?? post.text ?? "",
    createdAt: post.createdAt ?? post.created_at ?? new Date().toISOString(),
    visibility: post.visibility ?? post.postVisibility ?? "Public",
    imageUrl: post.imageUrl ?? post.image ?? post.mediaUrl ?? post.photoUrl ?? "",
    authorName: post.authorName ?? post.fullName ?? post.author?.fullName ?? post.author?.name ?? "Community member",
    authorEmail: post.authorEmail ?? post.email ?? post.author?.email ?? "",
    authorAvatar: post.authorAvatar ?? post.avatarUrl ?? post.avatar ?? "/assets/images/post_img.png",
    likes: Array.isArray(post.likes) ? post.likes : likedBy,
    likeCount:
      typeof post.likeCount === "number"
        ? post.likeCount
        : typeof post.reactions?.totalLikes === "number"
          ? post.reactions.totalLikes
          : Array.isArray(post.likes)
            ? post.likes.length
            : likedBy.length,
    comments: normalizedComments
  };
}

function normalizeComment(comment, index = 0) {
  const replies = Array.isArray(comment.replies)
    ? comment.replies.map((reply, replyIndex) => normalizeComment(reply, replyIndex))
    : [];

  const likes = Array.isArray(comment.likes)
    ? comment.likes.map((item, likeIndex) => ({
        id: item.id ?? `${item.email ?? item.name ?? likeIndex}`,
        name: item.name ?? item.fullName ?? item.email ?? "User",
        email: item.email ?? "",
        avatar: item.avatar ?? "/assets/images/profile.png"
      }))
    : Array.isArray(comment.reactions?.likedBy)
      ? comment.reactions.likedBy.map((user, likerIndex) => ({
          id: `${user.email ?? user.fullName ?? likerIndex}`,
          name: user.fullName ?? user.email ?? "User",
          email: user.email ?? "",
          avatar: user.avatar ?? "/assets/images/profile.png"
        }))
      : [];

  return {
    id: comment.id ?? `comment-${index}`,
    content: comment.content ?? "",
    authorName: comment.authorName ?? comment.author?.fullName ?? "Community member",
    authorEmail: comment.authorEmail ?? comment.author?.email ?? "",
    authorAvatar: comment.authorAvatar ?? "/assets/images/comment_img.png",
    createdAt: comment.createdAt ?? new Date().toISOString(),
    likes,
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

  return handleResponse(response);
}

export async function login(payload) {
  const response = await requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return handleResponse(response);
}

export async function fetchPosts(token) {
  const response = await requestJson("/api/posts", {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await handleResponse(response);
  return Array.isArray(data) ? data.map(normalizePost) : [];
}

export async function createPost(token, payload) {
  const response = await requestJson("/api/posts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

  return normalizePost(await handleResponse(response));
}

export async function uploadPostImage(token, file) {
  const formData = new FormData();
  formData.append(POST_IMAGE_UPLOAD_FIELD, file);

  const response = await requestMultipart(POST_IMAGE_UPLOAD_PATH, formData, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await handleResponse(response);
  const imageUrl = extractUploadedImageUrl(data);
  if (!imageUrl) {
    throw new Error("Upload succeeded but no image URL was returned");
  }

  return imageUrl;
}

