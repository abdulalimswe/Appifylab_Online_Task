ALTER TABLE users
    ALTER COLUMN profile_photo_url SET DEFAULT '/assets/images/profile-avatar.png';

UPDATE users
SET profile_photo_url = '/assets/images/profile-avatar.png'
WHERE profile_photo_url IS NULL
   OR BTRIM(profile_photo_url) = ''
   OR profile_photo_url = '/assets/images/profile.png'
   OR profile_photo_url = '/assets/images/profile-avater.png';

