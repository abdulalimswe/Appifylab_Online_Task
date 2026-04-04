package com.appifylab.social.dto;

public record AuthResponse(
        String token,
        String email,
        String fullName
) {
}

