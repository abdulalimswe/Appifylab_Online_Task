from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1800, 1100
BG = (244, 246, 251)
CARD = (255, 255, 255)
BORDER = (55, 125, 255)
TEXT = (17, 32, 50)
MUTED = (90, 104, 120)
LINE = (70, 90, 120)


def box(draw, x1, y1, x2, y2, title, subtitle=""):
    draw.rounded_rectangle((x1, y1, x2, y2), radius=22, fill=CARD, outline=BORDER, width=3)
    draw.text((x1 + 18, y1 + 16), title, fill=TEXT, font=FONT_TITLE)
    if subtitle:
        draw.multiline_text((x1 + 18, y1 + 56), subtitle, fill=MUTED, font=FONT_BODY, spacing=6)


def arrow(draw, p1, p2, label=""):
    draw.line((p1, p2), fill=LINE, width=4)
    x1, y1 = p1
    x2, y2 = p2
    # simple arrow head
    if abs(x2 - x1) > abs(y2 - y1):
        s = -1 if x2 < x1 else 1
        draw.polygon([(x2, y2), (x2 - 16 * s, y2 - 8), (x2 - 16 * s, y2 + 8)], fill=LINE)
    else:
        s = -1 if y2 < y1 else 1
        draw.polygon([(x2, y2), (x2 - 8, y2 - 16 * s), (x2 + 8, y2 - 16 * s)], fill=LINE)

    if label:
        lx = (x1 + x2) // 2 + 8
        ly = (y1 + y2) // 2 - 26
        draw.text((lx, ly), label, fill=TEXT, font=FONT_SMALL)


img = Image.new("RGB", (WIDTH, HEIGHT), BG)
draw = ImageDraw.Draw(img)
FONT_TITLE = ImageFont.load_default()
FONT_BODY = ImageFont.load_default()
FONT_SMALL = ImageFont.load_default()

# Header
draw.text((60, 30), "Appifylab Online Task - System Design", fill=TEXT, font=FONT_TITLE)
draw.text((60, 54), "Frontend (Vercel) + Backend (Render) + PostgreSQL + Cloudinary", fill=MUTED, font=FONT_BODY)

# Main boxes
box(
    draw,
    80,
    150,
    420,
    330,
    "Client Browser",
    "User interacts with UI\nLogin/Register\nFeed/Post/Comment/Reply",
)

box(
    draw,
    520,
    120,
    940,
    360,
    "Frontend - React + Vite (Vercel)",
    "Routes: /login, /register, /feed\nJWT kept in localStorage\nCalls backend /api endpoints",
)

box(
    draw,
    1060,
    120,
    1540,
    420,
    "Backend - Spring Boot (Render)",
    "Security: JWT filter + CORS\nAPIs: /api/auth, /api/posts\nFlyway migrations + JPA",
)

box(
    draw,
    1060,
    530,
    1540,
    760,
    "PostgreSQL (Render DB)",
    "Tables: users, posts, comments, reactions\nStores default profile avatar URL\nUsed by backend services",
)

box(
    draw,
    520,
    530,
    940,
    760,
    "Cloudinary",
    "Post image upload storage\nBackend uploads file\nReturns secure image URL",
)

box(
    draw,
    80,
    530,
    420,
    760,
    "GitHub Repo",
    "Source control\nmain branch deploy trigger\nUsed by Render + Vercel",
)

# Arrows / data flow
arrow(draw, (420, 230), (520, 230), "HTTPS")
arrow(draw, (940, 230), (1060, 230), "REST /api + JWT")
arrow(draw, (1250, 420), (1250, 530), "SQL")
arrow(draw, (1060, 620), (940, 620), "image upload")
arrow(draw, (760, 530), (760, 360), "image URL")
arrow(draw, (320, 530), (560, 360), "CI/CD deploy")
arrow(draw, (320, 530), (1080, 420), "deploy")

# Footer note
note = (
    "Key Security:\n"
    "- JWT auth for protected APIs\n"
    "- CORS allowlist includes frontend domain\n"
    "- Secrets via env vars on deployment platforms"
)
draw.multiline_text((80, 860), note, fill=TEXT, font=FONT_BODY, spacing=6)

output = "/Users/utin/IdeaProjects/Appifylab_Online_Task/docs/system-design.png"
img.save(output, "PNG")
print(output)

