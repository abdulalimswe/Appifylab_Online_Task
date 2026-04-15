const now = Date.now();
const minutesAgo = (minutes) => new Date(now - minutes * 60 * 1000).toISOString();


export const demoPosts = [
  {
    id: "demo-1",
    authorName: "Karim Saif",
    authorAvatar: "/assets/images/post_img.png",
    createdAt: minutesAgo(5),
    visibility: "Public",
    content: "-Healthy Tracking App",
    imageUrl: "/assets/images/timeline_img.png",
    likes: [
      { id: 1, name: "Jessica" },
      { id: 2, name: "Mike" },
      { id: 3, name: "Sonia" }
    ],
    comments: [
      {
        id: "demo-1-c1",
        authorName: "Radovan SkillArena",
        authorAvatar: "/assets/images/txt_img.png",
        content:
          "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.",
        createdAt: minutesAgo(21),
        likes: [{ id: 1, name: "Maya" }, { id: 2, name: "Oliver" }],
        replies: [
          {
            id: "demo-1-c1-r1",
            authorName: "Dylan Field",
            authorAvatar: "/assets/images/comment_img.png",
            content: "Great idea. The flow feels really polished.",
            createdAt: minutesAgo(18),
            likes: []
          }
        ]
      }
    ]
  },
  {
    id: "demo-2",
    authorName: "Alicia Brown",
    authorAvatar: "/assets/images/Avatar.png",
    createdAt: minutesAgo(12),
    visibility: "Private",
    content: "Launching a new design sprint today. The new feed design is cleaner, faster, and much easier to navigate on mobile.",
    imageUrl: "/assets/images/img5.png",
    likes: [{ id: 1, name: "You" }, { id: 2, name: "Nora" }],
    comments: []
  }
];

export function sortSeedPostsNewestFirst(posts) {
  return [...posts].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

