const now = Date.now();
const minutesAgo = (minutes) => new Date(now - minutes * 60 * 1000).toISOString();

export const storyCards = [
  { id: 1, label: "Your Story", image: "/assets/images/card_ppl1.png", type: "create" },
  { id: 2, label: "Ryan Roslansky", image: "/assets/images/card_ppl2.png", type: "active" },
  { id: 3, label: "Dylan Field", image: "/assets/images/card_ppl3.png", type: "inactive" },
  { id: 4, label: "Steve Jobs", image: "/assets/images/card_ppl4.png", type: "active" }
];

export const exploreItems = [
  { id: 1, label: "Learning", badge: "New", href: "#0" },
  { id: 2, label: "Insights", href: "#0" },
  { id: 3, label: "Find friends", href: "#0" },
  { id: 4, label: "Bookmarks", href: "#0" },
  { id: 5, label: "Group", href: "#0" },
  { id: 6, label: "Gaming", badge: "New", href: "#0" },
  { id: 7, label: "Settings", href: "#0" },
  { id: 8, label: "Save post", href: "#0" }
];

export const suggestedPeople = [
  { id: 1, name: "Steve Jobs", role: "CEO of Apple", image: "/assets/images/people1.png" },
  { id: 2, name: "Ryan Roslansky", role: "CEO of Linkedin", image: "/assets/images/people2.png" },
  { id: 3, name: "Dylan Field", role: "CEO of Figma", image: "/assets/images/people3.png" }
];

export const eventCards = [
  {
    id: 1,
    title: "No more terrorism no more cry",
    date: { day: "10", month: "Jul" },
    going: 17,
    image: "/assets/images/feed_event1.png"
  },
  {
    id: 2,
    title: "No more terrorism no more cry",
    date: { day: "10", month: "Jul" },
    going: 17,
    image: "/assets/images/feed_event1.png"
  }
];

export const rightSidebarPeople = [
  { id: 1, name: "Steve Jobs", role: "CEO of Apple", image: "/assets/images/people1.png", online: false, timeLabel: "5 minute ago" },
  { id: 2, name: "Ryan Roslansky", role: "CEO of Linkedin", image: "/assets/images/people2.png", online: true },
  { id: 3, name: "Dylan Field", role: "CEO of Figma", image: "/assets/images/people3.png", online: true },
  { id: 4, name: "Steve Jobs", role: "CEO of Apple", image: "/assets/images/people1.png", online: false, timeLabel: "5 minute ago" },
  { id: 5, name: "Ryan Roslansky", role: "CEO of Linkedin", image: "/assets/images/people2.png", online: true },
  { id: 6, name: "Dylan Field", role: "CEO of Figma", image: "/assets/images/people3.png", online: true },
  { id: 7, name: "Dylan Field", role: "CEO of Figma", image: "/assets/images/people3.png", online: true },
  { id: 8, name: "Steve Jobs", role: "CEO of Apple", image: "/assets/images/people1.png", online: false, timeLabel: "5 minute ago" }
];

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

