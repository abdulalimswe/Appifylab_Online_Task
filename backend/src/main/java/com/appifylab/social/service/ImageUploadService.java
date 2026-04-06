package com.appifylab.social.service;

import com.appifylab.social.config.CloudinaryProperties;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
public class ImageUploadService {

    private static final Logger log = LoggerFactory.getLogger(ImageUploadService.class);

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

        if (isBlank(cloudinaryProperties.getCloudName())
                || isBlank(cloudinaryProperties.getApiKey())
                || isBlank(cloudinaryProperties.getApiSecret())) {
            throw new IllegalArgumentException("Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET");
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
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception | LinkageError exception) {
            log.warn("Cloudinary upload failed (cloud_name={})", cloudinaryProperties.getCloudName(), exception);
            throw new IllegalArgumentException(describeCloudinaryFailure(exception), exception);
        }
    }

    /**
     * The Cloudinary SDK and HTTP layer throw many different errors; credentials are only one possibility.
     * Surface the underlying message so operators see e.g. wrong cloud name, network, or API errors — not only "bad secret".
     */
    private static String describeCloudinaryFailure(Throwable exception) {
        String detail = deepestNonBlankMessage(exception);
        if (detail == null || detail.isBlank()) {
            return "Image upload failed (" + exception.getClass().getSimpleName() + "). Check network, CLOUDINARY_* values, and Cloudinary service status.";
        }
        return "Image upload failed: " + detail;
    }

    private static String deepestNonBlankMessage(Throwable exception) {
        String best = null;
        Throwable current = exception;
        int guard = 0;
        while (current != null && guard++ < 20) {
            String message = current.getMessage();
            if (message != null && !message.isBlank()) {
                best = message;
            }
            Throwable next = current.getCause();
            if (next == current) {
                break;
            }
            current = next;
        }
        return best;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}

