package com.appifylab.social.dto;

import com.appifylab.social.entity.ReactionTargetType;
import jakarta.validation.constraints.NotNull;

public record ToggleReactionRequest(
        @NotNull ReactionTargetType targetType,
        @NotNull Long targetId
) {
}

