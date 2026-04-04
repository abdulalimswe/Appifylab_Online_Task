package com.appifylab.social.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.appifylab.social.entity.PostVisibility;

public record CreatePostRequest(
        @NotBlank @Size(max = 2000) String content,
        @Size(max = 1024) String imageUrl,
        PostVisibility visibility
) {
}

