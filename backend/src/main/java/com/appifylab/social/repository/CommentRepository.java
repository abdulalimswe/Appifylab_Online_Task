package com.appifylab.social.repository;

import com.appifylab.social.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findAllByPostIdInOrderByCreatedAtAsc(Collection<Long> postIds);
}

