-- Add cover_image_url column to profiles table for profile banners
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image_url TEXT;