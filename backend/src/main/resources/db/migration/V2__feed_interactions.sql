ALTER TABLE posts
    ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'PUBLIC',
    ADD COLUMN image_url VARCHAR(1024);

CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    parent_comment_id BIGINT REFERENCES comments (id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    target_type VARCHAR(16) NOT NULL,
    target_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_reactions_user_target
    ON reactions (user_id, target_type, target_id);

CREATE INDEX idx_posts_visibility_created
    ON posts (visibility, created_at DESC);

CREATE INDEX idx_comments_post_created
    ON comments (post_id, created_at ASC);

CREATE INDEX idx_comments_parent
    ON comments (parent_comment_id);

CREATE INDEX idx_reactions_target
    ON reactions (target_type, target_id);

