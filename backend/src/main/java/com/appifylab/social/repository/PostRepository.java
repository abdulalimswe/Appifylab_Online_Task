package com.appifylab.social.repository;

import com.appifylab.social.entity.Post;
import com.appifylab.social.entity.PostVisibility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    List<Post> findAllByOrderByCreatedAtDesc();

    List<Post> findByVisibilityOrAuthorIdOrderByCreatedAtDesc(PostVisibility visibility, Long authorId);
}

