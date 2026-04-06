package com.appifylab.social.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record CommentResponse(
        Long id,
        Long parentCommentId,
        String content,
        String authorName,
        String authorEmail,
        String authorAvatar,
        OffsetDateTime createdAt,
        ReactionSummaryResponse reactions,
        List<CommentResponse> replies
) {
}

