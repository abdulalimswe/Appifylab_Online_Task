package com.appifylab.social.service;

public final class UserProfileDefaults {

    public static final String DEFAULT_PROFILE_PHOTO_URL = "/assets/images/profile-avatar.png";

    private UserProfileDefaults() {
    }

    public static String resolveProfilePhotoUrl(String value) {
        if (value == null) {
            return DEFAULT_PROFILE_PHOTO_URL;
        }

        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return DEFAULT_PROFILE_PHOTO_URL;
        }

        return trimmed;
    }
}

