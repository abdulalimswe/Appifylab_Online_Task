package com.appifylab.social.dto;

import com.appifylab.social.entity.PostVisibility;

import java.time.OffsetDateTime;
import java.util.List;

public record PostResponse(
        Long id,
        String content,
        String imageUrl,
        PostVisibility visibility,
        String authorName,
        String authorEmail,
        OffsetDateTime createdAt,
        ReactionSummaryResponse reactions,
        List<CommentResponse> comments
) {
}

