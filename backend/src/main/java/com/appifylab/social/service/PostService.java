package com.appifylab.social.service;

import com.appifylab.social.dto.CommentResponse;
import com.appifylab.social.dto.CreateCommentRequest;
import com.appifylab.social.dto.CreatePostRequest;
import com.appifylab.social.dto.LikerResponse;
import com.appifylab.social.dto.PostResponse;
import com.appifylab.social.dto.ReactionSummaryResponse;
import com.appifylab.social.dto.ToggleReactionRequest;
import com.appifylab.social.entity.Comment;
import com.appifylab.social.entity.Post;
import com.appifylab.social.entity.PostVisibility;
import com.appifylab.social.entity.Reaction;
import com.appifylab.social.entity.ReactionTargetType;
import com.appifylab.social.entity.UserAccount;
import com.appifylab.social.repository.CommentRepository;
import com.appifylab.social.repository.PostRepository;
import com.appifylab.social.repository.ReactionRepository;
import com.appifylab.social.repository.UserAccountRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ReactionRepository reactionRepository;
    private final UserAccountRepository userAccountRepository;

    public PostService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            ReactionRepository reactionRepository,
            UserAccountRepository userAccountRepository
    ) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.reactionRepository = reactionRepository;
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional(readOnly = true)
    public List<PostResponse> getFeed(Authentication authentication) {
        UserAccount currentUser = currentUser(authentication);
        List<Post> posts = postRepository.findByVisibilityOrAuthorIdOrderByCreatedAtDesc(PostVisibility.PUBLIC, currentUser.getId());
        if (posts.isEmpty()) {
            return List.of();
        }

        List<Long> postIds = posts.stream().map(Post::getId).toList();
        List<Comment> comments = commentRepository.findAllByPostIdInOrderByCreatedAtAsc(postIds);
        List<Long> commentIds = comments.stream().map(Comment::getId).toList();

        Map<Long, List<Comment>> commentsByPost = comments.stream()
                .collect(Collectors.groupingBy(comment -> comment.getPost().getId()));

        Map<Long, List<Comment>> repliesByParent = comments.stream()
                .filter(comment -> comment.getParentComment() != null)
                .collect(Collectors.groupingBy(comment -> comment.getParentComment().getId()));

        Map<Long, List<Reaction>> postReactions = reactionsByTargetId(ReactionTargetType.POST, postIds);
        Map<Long, List<Reaction>> commentReactions = commentIds.isEmpty()
                ? Map.of()
                : reactionsByTargetId(ReactionTargetType.COMMENT, commentIds);

        return posts.stream()
                .map(post -> toPostResponse(post, currentUser.getId(), commentsByPost, repliesByParent, postReactions, commentReactions))
                .toList();
    }

    @Transactional
    public PostResponse createPost(CreatePostRequest request, Authentication authentication) {
        UserAccount author = currentUser(authentication);

        Post post = new Post();
        post.setContent(request.content().trim());
        post.setImageUrl(normalizeNullable(request.imageUrl()));
        post.setVisibility(request.visibility() == null ? PostVisibility.PUBLIC : request.visibility());
        post.setAuthor(author);

        Post savedPost = postRepository.save(post);
        return toPostResponse(
                savedPost,
                author.getId(),
                Map.of(),
                Map.of(),
                Map.of(savedPost.getId(), List.of()),
                Map.of()
        );
    }

    @Transactional
    public CommentResponse addComment(Long postId, CreateCommentRequest request, Authentication authentication) {
        UserAccount author = currentUser(authentication);
        Post post = getPostForInteraction(postId, author);

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthor(author);
        comment.setContent(request.content().trim());

        Comment saved = commentRepository.save(comment);
        return toCommentResponse(saved, author.getId(), Map.of(), Map.of(saved.getId(), List.of()));
    }

    @Transactional
    public CommentResponse addReply(Long commentId, CreateCommentRequest request, Authentication authentication) {
        UserAccount author = currentUser(authentication);
        Comment parentComment = getCommentForInteraction(commentId, author);

        Comment reply = new Comment();
        reply.setPost(parentComment.getPost());
        reply.setParentComment(parentComment);
        reply.setAuthor(author);
        reply.setContent(request.content().trim());

        Comment saved = commentRepository.save(reply);
        return toCommentResponse(saved, author.getId(), Map.of(), Map.of(saved.getId(), List.of()));
    }

    @Transactional
    public ReactionSummaryResponse like(ToggleReactionRequest request, Authentication authentication) {
        UserAccount user = currentUser(authentication);
        validateTargetForInteraction(request.targetType(), request.targetId(), user);

        reactionRepository.findByUserIdAndTargetTypeAndTargetId(user.getId(), request.targetType(), request.targetId())
                .orElseGet(() -> {
                    Reaction reaction = new Reaction();
                    reaction.setUser(user);
                    reaction.setTargetType(request.targetType());
                    reaction.setTargetId(request.targetId());
                    return reactionRepository.save(reaction);
                });

        return reactionSummary(request.targetType(), request.targetId(), user.getId());
    }

    @Transactional
    public ReactionSummaryResponse unlike(ToggleReactionRequest request, Authentication authentication) {
        UserAccount user = currentUser(authentication);
        validateTargetForInteraction(request.targetType(), request.targetId(), user);

        reactionRepository.findByUserIdAndTargetTypeAndTargetId(user.getId(), request.targetType(), request.targetId())
                .ifPresent(reactionRepository::delete);

        return reactionSummary(request.targetType(), request.targetId(), user.getId());
    }

    @Transactional(readOnly = true)
    public List<LikerResponse> getLikers(ReactionTargetType targetType, Long targetId, Authentication authentication) {
        UserAccount user = currentUser(authentication);
        validateTargetForInteraction(targetType, targetId, user);

        return reactionRepository.findAllByTargetTypeAndTargetIdOrderByCreatedAtDesc(targetType, targetId).stream()
                .map(reaction -> new LikerResponse(reaction.getUser().getFullName(), reaction.getUser().getEmail()))
                .toList();
    }

    private PostResponse toPostResponse(
            Post post,
            Long currentUserId,
            Map<Long, List<Comment>> commentsByPost,
            Map<Long, List<Comment>> repliesByParent,
            Map<Long, List<Reaction>> postReactions,
            Map<Long, List<Reaction>> commentReactions
    ) {
        List<CommentResponse> commentResponses = commentsByPost.getOrDefault(post.getId(), List.of()).stream()
                .filter(comment -> comment.getParentComment() == null)
                .map(comment -> toCommentResponse(comment, currentUserId, repliesByParent, commentReactions))
                .toList();

        return new PostResponse(
                post.getId(),
                post.getContent(),
                post.getImageUrl(),
                post.getVisibility(),
                post.getAuthor().getFullName(),
                post.getAuthor().getEmail(),
                post.getCreatedAt(),
                toReactionSummary(postReactions.getOrDefault(post.getId(), List.of()), currentUserId),
                commentResponses
        );
    }

    private CommentResponse toCommentResponse(
            Comment comment,
            Long currentUserId,
            Map<Long, List<Comment>> repliesByParent,
            Map<Long, List<Reaction>> commentReactions
    ) {
        List<CommentResponse> replies = repliesByParent.getOrDefault(comment.getId(), List.of()).stream()
                .map(reply -> toCommentResponse(reply, currentUserId, repliesByParent, commentReactions))
                .toList();

        return new CommentResponse(
                comment.getId(),
                comment.getParentComment() == null ? null : comment.getParentComment().getId(),
                comment.getContent(),
                comment.getAuthor().getFullName(),
                comment.getAuthor().getEmail(),
                comment.getCreatedAt(),
                toReactionSummary(commentReactions.getOrDefault(comment.getId(), List.of()), currentUserId),
                replies
        );
    }

    private Map<Long, List<Reaction>> reactionsByTargetId(ReactionTargetType targetType, Collection<Long> targetIds) {
        if (targetIds.isEmpty()) {
            return Map.of();
        }

        return reactionRepository.findAllByTargetTypeAndTargetIdIn(targetType, targetIds).stream()
                .collect(Collectors.groupingBy(Reaction::getTargetId));
    }

    private ReactionSummaryResponse reactionSummary(ReactionTargetType targetType, Long targetId, Long currentUserId) {
        List<Reaction> reactions = reactionRepository.findAllByTargetTypeAndTargetIdOrderByCreatedAtDesc(targetType, targetId);
        return toReactionSummary(reactions, currentUserId);
    }

    private ReactionSummaryResponse toReactionSummary(List<Reaction> reactions, Long currentUserId) {
        List<Reaction> sorted = reactions.stream()
                .sorted(Comparator.comparing(Reaction::getCreatedAt).reversed())
                .toList();

        List<LikerResponse> likedBy = sorted.stream()
                .map(Reaction::getUser)
                .collect(Collectors.toMap(
                        UserAccount::getId,
                        user -> new LikerResponse(user.getFullName(), user.getEmail()),
                        (left, right) -> left,
                        LinkedHashMap::new
                ))
                .values()
                .stream()
                .limit(5)
                .toList();

        boolean likedByMe = sorted.stream().anyMatch(reaction -> Objects.equals(reaction.getUser().getId(), currentUserId));
        return new ReactionSummaryResponse(sorted.size(), likedByMe, likedBy);
    }

    private UserAccount currentUser(Authentication authentication) {
        String email = authentication.getName();
        return userAccountRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private Post getPostForInteraction(Long postId, UserAccount actor) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        if (post.getVisibility() == PostVisibility.PRIVATE && !Objects.equals(post.getAuthor().getId(), actor.getId())) {
            throw new IllegalArgumentException("You do not have access to this post");
        }

        return post;
    }

    private Comment getCommentForInteraction(Long commentId, UserAccount actor) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        Post post = comment.getPost();
        if (post.getVisibility() == PostVisibility.PRIVATE && !Objects.equals(post.getAuthor().getId(), actor.getId())) {
            throw new IllegalArgumentException("You do not have access to this comment");
        }

        return comment;
    }

    private void validateTargetForInteraction(ReactionTargetType targetType, Long targetId, UserAccount actor) {
        if (targetType == ReactionTargetType.POST) {
            getPostForInteraction(targetId, actor);
            return;
        }

        if (targetType == ReactionTargetType.COMMENT) {
            getCommentForInteraction(targetId, actor);
            return;
        }

        throw new IllegalArgumentException("Unsupported reaction target type");
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

