# Appifylab Online Task - Full-Stack Social Feed

A full-stack social feed application built for the Appifylab selection task.

## Project Overview

This repository contains:

- A modern React frontend (`frontend`) powered by Vite
- A Spring Boot REST API backend (`backend`)
- PostgreSQL database support (local or Docker)
- JWT-based authentication
- Feed features: posts, comments/replies, likes, and image uploads

The original static HTML templates (`login.html`, `registration.html`, `feed.html`) and design assets are also kept in the root for reference.

## Current Product Scope

- Email/password registration and login
- Protected feed API with JWT bearer tokens
- Create/read posts with optional image URL
- Post comments and comment replies
- Like/unlike for posts and comments
- Default profile avatar auto-applied for users without a photo
- Google login/register UI section removed from client pages (email auth only)

## Repository Structure

- `frontend/` - React application (Vite)
- `backend/` - Spring Boot API
- `docker-compose.yml` - PostgreSQL container for local development
- `assets/` - static assets used by both legacy and React UI
- `scripts/smoke-test.sh` - quick backend auth/feed smoke test
- `backend/src/main/resources/db/migration/` - Flyway schema/version migrations

## Tech Stack

- Frontend: React 18, React Router, Vite 5
- Backend: Java 21, Spring Boot 3.3, Spring Security, JPA (Hibernate)
- Database: PostgreSQL 16
- Auth: JWT
- Migrations: Flyway
- Image storage: Cloudinary (for post image upload)

## Architecture (High Level)

- Frontend calls `/api/...` endpoints.
- During local dev, Vite proxies `/api` to `http://localhost:8080`.
- Backend validates JWT and processes feed operations.
- Backend persists data in PostgreSQL and runs Flyway on startup.
- Post image upload endpoint uses Cloudinary when configured.

## Quick Start (Recommended)

### 1) Start PostgreSQL with Docker

From repository root:

```bash
docker compose up -d postgres
```

> `docker-compose.yml` uses `POSTGRES_USER=root`, `POSTGRES_PASSWORD=REDACTED_DB_PASSWORD`, and DB `appifylab_social`.

### 2) Run Backend

From `backend/`:

```bash
mvn spring-boot:run
```

Backend runs at: `http://localhost:8080`

### 3) Run Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

## Environment Configuration

### Backend (`backend/.env.example`)

Main variables:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRATION_MS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`

Important:

- Ensure `DB_USERNAME` matches your PostgreSQL user.
- If using the provided Docker Compose defaults, use `root` for the DB user.
- If Cloudinary variables are empty, image upload endpoint may fail depending on your runtime config.

### Frontend (`frontend/.env.example`)

- `VITE_API_BASE_URL` (optional)

If empty/unset, frontend calls relative `/api/...` paths and relies on Vite proxy.

## API Summary

Base URL: `http://localhost:8080/api`

### Auth

- `POST /auth/register`
- `POST /auth/login`

Returns token + user fields (including `profilePhotoUrl`).

### Posts & Feed (JWT required)

- `GET /posts`
- `POST /posts`
- `POST /posts/upload-image` (multipart field: `image`)

### Comments & Replies (JWT required)

- `POST /posts/{postId}/comments`
- `POST /posts/comments/{commentId}/replies`

### Reactions (JWT required)

- `PUT /posts/reactions/like`
- `DELETE /posts/reactions/like`
- `GET /posts/reactions/{targetType}/{targetId}`

`targetType`: `POST` or `COMMENT`

## Default Profile Avatar Behavior

New users without an explicit profile photo automatically receive:

- `/assets/images/profile-avater.png`

This default is enforced across:

- Backend user profile defaults
- Auth response normalization
- Frontend auth/session state normalization

Related migration:

- `backend/src/main/resources/db/migration/V4__default_profile_avatar_rename.sql`

## Database Migrations

Flyway migrations execute automatically on backend startup.

Current migration set includes:

- `V1__init.sql`
- `V2__feed_interactions.sql`
- `V3__user_profile_photo.sql`
- `V4__default_profile_avatar_rename.sql`

## Smoke Test

After backend is running, from repository root:

```bash
./scripts/smoke-test.sh
```

Custom backend URL:

```bash
BASE_URL=http://localhost:8080 ./scripts/smoke-test.sh
```

## Troubleshooting

- `DB auth failed` -> verify `DB_USERNAME`/`DB_PASSWORD` matches your running PostgreSQL instance.
- `Frontend cannot reach API` -> confirm backend is on `:8080` and Vite proxy or `VITE_API_BASE_URL` is correct.
- `Flyway migration error` -> check DB connectivity, existing schema state, and migration history table.
- `401 Unauthorized` -> verify JWT token is present and sent as `Authorization: Bearer <token>`.
- `Image upload issues` -> confirm Cloudinary credentials are set correctly in backend environment.

## Additional Documentation

- `backend/README.md` - detailed backend documentation and API behavior
- `backend/.env.example` - backend environment template
- `frontend/.env.example` - frontend environment template

## Notes

- This root README is focused on setup and operational usage.
- The backend README contains deeper implementation details.
