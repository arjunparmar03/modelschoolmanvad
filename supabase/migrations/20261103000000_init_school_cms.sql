-- =============================================================================
-- Migration: 20261103000000_init_school_cms.sql
-- Description: Hardened Schema & Storage Initialization for Model School Manvad
-- Tables: gallery_images, activities, notices
-- Storage: school-media bucket + RLS policies
-- Security: Trusted app_metadata.role = 'admin' authorization, SVG exclusion, strict RLS
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. Helper Functions & Permissions
-- =============================================================================

-- Automated timestamp updater for tables with updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- SECURE ADMIN AUTHORIZATION FUNCTION
-- -----------------------------------------------------------------------------
-- Verifies that:
-- 1. auth.uid() IS NOT NULL (the user is authenticated).
-- 2. auth.role() = 'authenticated'.
-- 3. The user's trusted JWT app_metadata explicitly contains role = 'admin'.
--
-- Security guarantees:
-- - Fast, in-memory evaluation directly from verified JWT claims.
-- - No direct query fallback against auth.users.
-- - Uses strictly `app_metadata` (server-managed, trusted, protected).
-- - NEVER uses `user_metadata` (which is user-editable via client SDKs).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (
    auth.uid() IS NOT NULL
    AND auth.role() = 'authenticated'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
$$;

-- Explicit function execution privileges
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- =============================================================================
-- 2. Table: gallery_images
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_gallery_images_url_category UNIQUE (image_url, category)
);

-- Indexes for category filtering and sorting
CREATE INDEX IF NOT EXISTS idx_gallery_images_category ON public.gallery_images(category);
CREATE INDEX IF NOT EXISTS idx_gallery_images_created ON public.gallery_images(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Policies for gallery_images
DROP POLICY IF EXISTS "Public visitors can view gallery images" ON public.gallery_images;
CREATE POLICY "Public visitors can view gallery images"
  ON public.gallery_images
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admin can insert gallery images" ON public.gallery_images;
CREATE POLICY "Admin can insert gallery images"
  ON public.gallery_images
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can update gallery images" ON public.gallery_images;
CREATE POLICY "Admin can update gallery images"
  ON public.gallery_images
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete gallery images" ON public.gallery_images;
CREATE POLICY "Admin can delete gallery images"
  ON public.gallery_images
  FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- =============================================================================
-- 3. Table: activities
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_activities_title UNIQUE (title)
);

-- Index for ordering by activity date
CREATE INDEX IF NOT EXISTS idx_activities_date ON public.activities(activity_date DESC);

-- Automated timestamp trigger
DROP TRIGGER IF EXISTS trigger_activities_updated_at ON public.activities;
CREATE TRIGGER trigger_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Policies for activities
DROP POLICY IF EXISTS "Public visitors can view activities" ON public.activities;
CREATE POLICY "Public visitors can view activities"
  ON public.activities
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admin can insert activities" ON public.activities;
CREATE POLICY "Admin can insert activities"
  ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can update activities" ON public.activities;
CREATE POLICY "Admin can update activities"
  ON public.activities
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete activities" ON public.activities;
CREATE POLICY "Admin can delete activities"
  ON public.activities
  FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- =============================================================================
-- 4. Table: notices
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  notice_type TEXT NOT NULL CHECK (
    notice_type IN ('Merit List', 'Admission', 'Events', 'General Notice', 'Examination')
  ),
  attachment_url TEXT,
  publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for notice sorting, type filtering, and publishing state
CREATE INDEX IF NOT EXISTS idx_notices_published ON public.notices(is_published, publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_notices_type ON public.notices(notice_type);

-- Automated timestamp trigger
DROP TRIGGER IF EXISTS trigger_notices_updated_at ON public.notices;
CREATE TRIGGER trigger_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Policies for notices
DROP POLICY IF EXISTS "Public visitors can view published notices" ON public.notices;
CREATE POLICY "Public visitors can view published notices"
  ON public.notices
  FOR SELECT
  TO public
  USING (
    is_published = true AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
  );

DROP POLICY IF EXISTS "Admin can view all notices" ON public.notices;
CREATE POLICY "Admin can view all notices"
  ON public.notices
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can insert notices" ON public.notices;
CREATE POLICY "Admin can insert notices"
  ON public.notices
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can update notices" ON public.notices;
CREATE POLICY "Admin can update notices"
  ON public.notices
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete notices" ON public.notices;
CREATE POLICY "Admin can delete notices"
  ON public.notices
  FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- =============================================================================
-- 5. Supabase Storage: Bucket & Access Policies
-- =============================================================================

-- Create the public storage bucket for school media (images and notice attachments)
-- SVG is strictly omitted to prevent stored cross-site scripting (XSS) attacks.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-media',
  'school-media',
  true,
  26214400, -- 25 MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ];

-- Storage Object Policies on storage.objects
DROP POLICY IF EXISTS "Public can view school media" ON storage.objects;
CREATE POLICY "Public can view school media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'school-media');

DROP POLICY IF EXISTS "Admin can upload school media" ON storage.objects;
CREATE POLICY "Admin can upload school media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'school-media'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admin can update school media" ON storage.objects;
CREATE POLICY "Admin can update school media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'school-media'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'school-media'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admin can delete school media" ON storage.objects;
CREATE POLICY "Admin can delete school media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'school-media'
    AND public.is_admin()
  );


-- =============================================================================
-- 6. Verified Seed Data (Preserves Existing Local Website Content)
-- All 23 gallery file paths and 3 activity file paths physically exist in /public
-- =============================================================================

-- Seed Gallery Images (23 verified files across 12 categories)
INSERT INTO public.gallery_images (title, image_url, category) VALUES
  ('Chemistry Lab 1', '/chemistry-lab.jpg', 'Chemistry Lab'),
  ('Chemistry Lab 2', '/chemistry-lab-2.jpg', 'Chemistry Lab'),
  ('Chemistry Lab 3', '/chemistry-lab-3.jpg', 'Chemistry Lab'),
  ('Physics Lab 1', '/physics-lab-1.jpg', 'Physics Lab'),
  ('Physics Lab 2', '/physics-lab-2.jpg', 'Physics Lab'),
  ('Biology Lab', '/bio-lab.jpg', 'Biology Lab'),
  ('Play Room', '/play-room.jpg', 'Play Room'),
  ('Classroom 1', '/classroom.jpg', 'Classroom View'),
  ('Classroom 2', '/classroom-2.jpg', 'Classroom View'),
  ('Drawing Room 1', '/drawing-room-1.jpg', 'Drawing Room'),
  ('Drawing Room 2', '/drawing-room-2.jpg', 'Drawing Room'),
  ('Drawing Room 3', '/drawing-room-3.jpg', 'Drawing Room'),
  ('Atal Lab 1', '/atal-lab-1.jpg', 'Atal Lab'),
  ('Atal Lab 2', '/atal-lab-2.jpg', 'Atal Lab'),
  ('Atal Lab 3', '/atal-lab-3.jpg', 'Atal Lab'),
  ('School View', '/school-view.jpg', 'School View'),
  ('Vocational Lab', '/vocational-lab.jpg', 'Vocational Lab'),
  ('Corridor', '/corridor.jpg', 'Corridor'),
  ('Prayer Area 1', '/prayer-area-1.jpg', 'Prayer Area'),
  ('Prayer Area 2', '/prayer-area-2.jpg', 'Prayer Area'),
  ('Prayer Area 3', '/prayer-area-3.jpg', 'Prayer Area'),
  ('Green School 1', '/green-school-1.jpg', 'Green School'),
  ('Green School 2', '/green-school-2.jpg', 'Green School')
ON CONFLICT (image_url, category) DO NOTHING;

-- Seed Activities (3 verified files)
INSERT INTO public.activities (title, description, image_url, activity_date) VALUES
  ('Yoga & Sports', 'Physical fitness and wellness programs including yoga and outdoor sports activities', '/yoga-sports.jpg', CURRENT_DATE),
  ('Vocational Education', 'Skill-based education programs developing practical expertise and professional skills', '/vocational-education.jpg', CURRENT_DATE),
  ('Health Awareness', 'Health awareness campaigns and wellness programs including blood checking drives', '/health-awareness.jpg', CURRENT_DATE)
ON CONFLICT (title) DO NOTHING;
