package com.appifylab.social.service;

import com.appifylab.social.config.CloudinaryProperties;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class ImageUploadService {

    private final Cloudinary cloudinary;
    private final CloudinaryProperties cloudinaryProperties;

    public ImageUploadService(Cloudinary cloudinary, CloudinaryProperties cloudinaryProperties) {
        this.cloudinary = cloudinary;
        this.cloudinaryProperties = cloudinaryProperties;
    }

    public String uploadPostImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }

        try {
            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", cloudinaryProperties.getFolder(),
                            "resource_type", "image"
                    )
            );

            Object secureUrl = uploadResult.get("secure_url");
            if (secureUrl == null) {
                throw new IllegalStateException("Cloudinary did not return a secure URL");
            }

            return secureUrl.toString();
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to upload image", exception);
        }
    }
}

