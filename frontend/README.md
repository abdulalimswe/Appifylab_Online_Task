# Frontend Documentation

React + Vite client for the Appifylab Online Task social feed.

## Overview

This frontend provides the full user-facing experience for:

- Authentication (email/password login and registration)
- Protected feed access via JWT session
- Creating posts (with optional image upload)
- Post comments and nested replies
- Post and comment like/unlike interactions

The UI is based on the provided design assets in the root `assets/` directory.

## UI Screenshots

The following screenshots are stored in the root `assets/` folder and document the main frontend flows.

### Login Page

![Login Page](../assets/LogIn%20Page.png)

### Register Page

![Register Page](../assets/Register%20Page.png)

### Feed Page

![Feed Page](../assets/Feed%20Page.png)

## Feature Highlights

- `Email auth only`: Google sign-in/register section is removed from the client UI.
- `Route protection`: `/feed` is guarded and redirects unauthenticated users to `/login`.
- `Session persistence`: auth data is stored in local storage (`appifylab_social_auth`).
- `Default avatar fallback`: users without a profile photo use `/assets/images/profile-avater.png`.
- `Graceful unauthorized handling`: API `401` triggers logout + redirect to login.

## Tech Stack

- React 18
- React Router v6
- Vite 5

## Directory Structure

```text
frontend/
  index.html
  package.json
  vite.config.js
  .env.example
  src/
    main.jsx               # App bootstrap + router + AuthProvider
    App.jsx                # Route map and redirects
    api/
      client.js            # API client, normalization, error handling
    components/
      AuthShell.jsx
      FeedBlocks.jsx
      ProtectedRoute.jsx
    context/
      AuthContext.jsx      # Auth/session state management
    data/
      feedSeeds.js         # Demo seed data fallback for feed
    pages/
      LoginPage.jsx
      RegistrationPage.jsx
      FeedPage.jsx
    styles/
      app.css
```

## Prerequisites

- Node.js (LTS recommended)
- npm
- Running backend API (default: `http://localhost:8080`)

## Setup and Run

From `frontend/`:

```bash
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

Build for production:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

## Environment Variables

Copy and adjust if needed:

```bash
cp .env.example .env
```

### Supported Variables

- `VITE_API_BASE_URL`
  - Empty/unset: frontend calls relative `/api/...` paths.
  - Full URL set: requests go directly to that backend host.
  - Production (Vercel): set `VITE_API_BASE_URL=https://appifylab-online-task-1.onrender.com`

- `VITE_POST_IMAGE_UPLOAD_PATH` (optional, advanced)
  - Default: `/api/posts/upload-image`

- `VITE_POST_IMAGE_UPLOAD_FIELD` (optional, advanced)
  - Default: `image`

## API Integration Behavior

- API helper is implemented in `src/api/client.js`.
- JSON requests are made through `requestJson()`.
- Multipart image uploads are made through `requestMultipart()`.
- Backend errors are normalized into user-friendly messages.
- `401` responses throw `UnauthorizedError` so the UI can force re-login.
- Network/CORS failures show a direct backend connectivity message for faster troubleshooting.

## Production Setup (Vercel -> Render)

1. In Vercel project settings, add env variable:
   - `VITE_API_BASE_URL=https://appifylab-online-task-1.onrender.com`
2. Redeploy frontend in Vercel.
3. In Render backend service env, set:
   - `APP_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://appifylab-one.vercel.app`
4. Redeploy backend in Render.
5. Verify login/register/feed calls from `https://appifylab-one.vercel.app`.

## Routing and Auth Flow

Defined in `src/App.jsx`:

- `/` -> redirects to `/feed` when authenticated, otherwise `/login`
- `/login` -> login page (redirects to `/feed` if already authenticated)
- `/register` -> registration page (redirects to `/feed` if already authenticated)
- `/feed` -> protected route via `ProtectedRoute`

Session state is managed in `src/context/AuthContext.jsx`.

## Default Avatar Rules

Frontend enforces fallback avatars in multiple places:

- Auth context fallback: `/assets/images/profile-avater.png`
- Feed header/profile UI fallback
- Like/comment user objects fallback where applicable

This ensures newly registered users render with a valid avatar even when backend photo fields are empty.

## Development Notes

- Vite dev server proxy (`vite.config.js`) maps `/api` to `http://localhost:8080`.
- Feed initially uses local seed data, then replaces with API data when available.
- Post creation supports image preview before upload.
- Comments support nested replies and reaction updates.

## NPM Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - create production bundle
- `npm run preview` - preview built app locally

## Troubleshooting

- `Cannot reach API`:
  - Confirm backend is running on `:8080` or set `VITE_API_BASE_URL`.

- `Always redirected to /login`:
  - Check whether token exists in local storage key `appifylab_social_auth`.
  - Verify backend JWT settings and token expiry.

- `Image upload fails`:
  - Confirm backend upload endpoint and Cloudinary config.
  - Check file size/type limits handled in `src/api/client.js`.

- `Styles/images missing`:
  - Ensure app runs from repository context where root `assets/` path is available.

## Related Documentation

- Root project docs: `README.md`
- Backend docs: `backend/README.md`
- Backend env template: `backend/.env.example`
- Frontend env template: `frontend/.env.example`
