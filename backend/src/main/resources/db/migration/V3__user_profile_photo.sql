ALTER TABLE users
    ADD COLUMN profile_photo_url VARCHAR(1024) NOT NULL DEFAULT '/assets/images/profile.png';

UPDATE users
SET profile_photo_url = '/assets/images/profile.png'
WHERE profile_photo_url IS NULL OR BTRIM(profile_photo_url) = '';

