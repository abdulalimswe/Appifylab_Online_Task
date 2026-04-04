package com.appifylab.social.controller;

import com.appifylab.social.dto.CommentResponse;
import com.appifylab.social.dto.CreateCommentRequest;
import com.appifylab.social.dto.CreatePostRequest;
import com.appifylab.social.dto.LikerResponse;
import com.appifylab.social.dto.PostResponse;
import com.appifylab.social.dto.ReactionSummaryResponse;
import com.appifylab.social.dto.ToggleReactionRequest;
import com.appifylab.social.entity.ReactionTargetType;
import com.appifylab.social.service.PostService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public List<PostResponse> getFeed(Authentication authentication) {
        return postService.getFeed(authentication);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse createPost(@Valid @RequestBody CreatePostRequest request, Authentication authentication) {
        return postService.createPost(request, authentication);
    }

    @PostMapping("/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(
            @PathVariable Long postId,
            @Valid @RequestBody CreateCommentRequest request,
            Authentication authentication
    ) {
        return postService.addComment(postId, request, authentication);
    }

    @PostMapping("/comments/{commentId}/replies")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addReply(
            @PathVariable Long commentId,
            @Valid @RequestBody CreateCommentRequest request,
            Authentication authentication
    ) {
        return postService.addReply(commentId, request, authentication);
    }

    @PutMapping("/reactions/like")
    public ReactionSummaryResponse like(
            @Valid @RequestBody ToggleReactionRequest request,
            Authentication authentication
    ) {
        return postService.like(request, authentication);
    }

    @DeleteMapping("/reactions/like")
    public ReactionSummaryResponse unlike(
            @Valid @RequestBody ToggleReactionRequest request,
            Authentication authentication
    ) {
        return postService.unlike(request, authentication);
    }

    @GetMapping("/reactions/{targetType}/{targetId}")
    public List<LikerResponse> getLikers(
            @PathVariable ReactionTargetType targetType,
            @PathVariable Long targetId,
            Authentication authentication
    ) {
        return postService.getLikers(targetType, targetId, authentication);
    }
}

