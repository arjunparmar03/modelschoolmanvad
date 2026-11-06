-- =============================================================================
-- Migration: 20261103000001_create_activity_images.sql
-- Description: Creates the relational activity_images table supporting multiple
--              photos per activity, configures RLS policies, and idempotently
--              backfills existing activity images.
-- =============================================================================

-- 1. Create the activity_images table
CREATE TABLE IF NOT EXISTS public.activity_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_activity_images_activity_url UNIQUE (activity_id, image_url)
);

-- 2. Performance and ordering indexes
CREATE INDEX IF NOT EXISTS idx_activity_images_activity_id 
  ON public.activity_images(activity_id);

CREATE INDEX IF NOT EXISTS idx_activity_images_sort 
  ON public.activity_images(activity_id, sort_order ASC, created_at ASC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.activity_images ENABLE ROW LEVEL SECURITY;

-- 4. Row Level Security Policies
DROP POLICY IF EXISTS "Public visitors can view activity images" ON public.activity_images;
CREATE POLICY "Public visitors can view activity images"
  ON public.activity_images
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admin can insert activity images" ON public.activity_images;
CREATE POLICY "Admin can insert activity images"
  ON public.activity_images
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can update activity images" ON public.activity_images;
CREATE POLICY "Admin can update activity images"
  ON public.activity_images
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete activity images" ON public.activity_images;
CREATE POLICY "Admin can delete activity images"
  ON public.activity_images
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 5. Safe Idempotent Backfill:
-- Copies existing image_url values from public.activities into public.activity_images
-- so current seed activities automatically have their canonical photo attached.
INSERT INTO public.activity_images (activity_id, image_url, caption, sort_order)
SELECT 
  id AS activity_id,
  image_url,
  title AS caption,
  0 AS sort_order
FROM public.activities
WHERE image_url IS NOT NULL AND image_url <> ''
ON CONFLICT (activity_id, image_url) DO NOTHING;

