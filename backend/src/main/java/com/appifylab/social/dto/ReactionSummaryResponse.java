package com.appifylab.social.dto;

import java.util.List;

public record ReactionSummaryResponse(
        long totalLikes,
        boolean likedByMe,
        List<LikerResponse> likedBy
) {
}

