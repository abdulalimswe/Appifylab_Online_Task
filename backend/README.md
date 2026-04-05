# Social Backend (Spring Boot)

Production-ready backend service for authentication and social feed operations (posts, comments, replies, likes) built with Spring Boot, Java 21, PostgreSQL, JPA, JWT, and Flyway.

## Tech Stack

- Java 21
- Spring Boot 3.3.x
- Spring Security (JWT auth)
- Spring Data JPA (Hibernate)
- PostgreSQL
- Flyway migrations
- Maven

## Project Structure

- `src/main/java/com/appifylab/social/controller` - REST controllers
- `src/main/java/com/appifylab/social/service` - business logic
- `src/main/java/com/appifylab/social/repository` - data access layer
- `src/main/java/com/appifylab/social/entity` - JPA entities
- `src/main/java/com/appifylab/social/security` - JWT filter/service
- `src/main/resources/db/migration` - Flyway SQL migrations
- `src/test` - test profile and test bootstrap

## Prerequisites

- Java 21 installed
- Maven 3.9+
- PostgreSQL running locally (or via Docker)

## Environment Variables

Create your env values from `backend/.env.example`:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET` (Base64 encoded, strong secret)
- `JWT_EXPIRATION_MS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` (optional)

Example (zsh):

```bash
export DB_URL="jdbc:postgresql://localhost:5432/appifylab_social"
export DB_USERNAME="postgres"
export DB_PASSWORD="your_password"
export JWT_SECRET="your_base64_secret"
export JWT_EXPIRATION_MS="86400000"
export CLOUDINARY_CLOUD_NAME="your_cloud_name"
export CLOUDINARY_API_KEY="your_api_key"
export CLOUDINARY_API_SECRET="your_api_secret"
export CLOUDINARY_FOLDER="appifylab/posts"
```

## Run PostgreSQL with Docker (Optional)

From repository root:

```bash
docker compose up -d postgres
```

> Note: `docker-compose.yml` currently defines `POSTGRES_USER=root`. Make sure your `DB_USERNAME` matches the database user you run with.

## Run the Backend

From `backend/`:

```bash
mvn spring-boot:run
```

App default URL:

- `http://localhost:8080`

## Database Migrations

Flyway runs automatically at startup.

- `V1__init.sql` - users and posts
- `V2__feed_interactions.sql` - post visibility/image, comments, reactions

If migration fails, verify:

- DB exists
- user/password are correct
- user has schema permissions

## API Overview

Base path: `/api`

### Auth

- `POST /auth/register`
  - body:

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

- `POST /auth/login`
  - body:

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

Returns:

```json
{
  "token": "...",
  "email": "john@example.com",
  "fullName": "John Doe"
}
```

### Feed & Posts (JWT required)

Add header:

```http
Authorization: Bearer <token>
```

- `GET /posts` - fetch feed
- `POST /posts/upload-image` - upload post image (multipart/form-data)
  - field: `image`
  - returns:

```json
{
  "imageUrl": "https://res.cloudinary.com/..."
}
```

- `POST /posts` - create post
  - body:

```json
{
  "content": "My post text",
  "imageUrl": "https://example.com/image.jpg",
  "visibility": "PUBLIC"
}
```

### Comments / Replies

- `POST /posts/{postId}/comments`

```json
{
  "content": "Nice post"
}
```

- `POST /posts/comments/{commentId}/replies`

```json
{
  "content": "Thanks!"
}
```

### Reactions (Like / Unlike)

- `PUT /posts/reactions/like`
- `DELETE /posts/reactions/like`

```json
{
  "targetType": "POST",
  "targetId": 123
}
```

`targetType` values:

- `POST`
- `COMMENT`

- `GET /posts/reactions/{targetType}/{targetId}` - list users who liked

## Validation & Error Format

Validation and business errors are returned as JSON from `GlobalExceptionHandler`.

Example:

```json
{
  "timestamp": "2026-04-05T00:00:00Z",
  "status": 400,
  "message": "Validation failed",
  "details": {
    "email": "must be a well-formed email address"
  }
}
```

## Test

From `backend/`:

```bash
mvn test
```

## Production Notes

Before deploying:

- Do not use default secrets/passwords from `application.yml`
- Set all env vars from secure secret manager
- Configure CORS allowed origins per environment
- Use HTTPS behind reverse proxy
- Add monitoring/log shipping and health checks
- Add API integration tests for auth/feed/comment/reaction flows

## Quick Smoke Test

From repository root (backend must be running):

```bash
./scripts/smoke-test.sh
```

Custom base URL:

```bash
BASE_URL="http://localhost:8080" ./scripts/smoke-test.sh
```

