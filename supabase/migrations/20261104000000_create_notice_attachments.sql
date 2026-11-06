-- =============================================================================
-- Migration: Secure Notice Attachments, IST Timezone & Private Storage Bucket
-- =============================================================================

-- =============================================================================
-- 1. Standardize notice_type CHECK constraint on public.notices
-- =============================================================================

-- Drop existing constraint
ALTER TABLE public.notices 
  DROP CONSTRAINT IF EXISTS notices_notice_type_check;

-- Normalize any legacy rows to the standardized names
UPDATE public.notices SET notice_type = 'General Notices' WHERE notice_type = 'General Notice';
UPDATE public.notices SET notice_type = 'Admission Notices' WHERE notice_type = 'Admission';
UPDATE public.notices SET notice_type = 'Examination Notices' WHERE notice_type = 'Examination';

-- Apply strict check constraint for the 5 standardized categories
ALTER TABLE public.notices 
  ADD CONSTRAINT notices_notice_type_check 
  CHECK (
    notice_type IN (
      'General Notices',
      'Admission Notices',
      'Merit List',
      'Examination Notices',
      'Events'
    )
  );

-- =============================================================================
-- 2. Update Row Level Security on public.notices (India Timezone: IST)
-- =============================================================================

-- Safely drop existing public SELECT policies to prevent permissive OR bypass
DROP POLICY IF EXISTS "Public visitors can view published notices" ON public.notices;
DROP POLICY IF EXISTS "Allow public read access" ON public.notices;
DROP POLICY IF EXISTS "Public notices are viewable by everyone" ON public.notices;

-- Create the single, strict public SELECT policy using IST date evaluation
CREATE POLICY "Public visitors can view published notices"
  ON public.notices
  FOR SELECT
  TO public
  USING (
    is_published = true
    AND publish_date <= (now() AT TIME ZONE 'Asia/Kolkata')::date
    AND (expiry_date IS NULL OR expiry_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date)
  );

-- Note: "Admin can view all notices" is preserved for authenticated admins.

-- =============================================================================
-- 3. Create public.notice_attachments table, indexes, and grants FIRST
--    (Must exist before Storage RLS policies reference it)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notice_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL, -- Relative path in school-notices bucket (e.g. notices/{notice_id}/{attachment_id}.pdf)
  file_url TEXT NOT NULL,  -- Canonical reference / signed download endpoint
  file_name TEXT NOT NULL, -- Original uploaded filename (e.g. Merit_List.pdf)
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'image')),
  file_size INTEGER,      -- Size in bytes
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance & Relational Indexes
CREATE INDEX IF NOT EXISTS idx_notice_attachments_notice_id 
  ON public.notice_attachments(notice_id);

CREATE INDEX IF NOT EXISTS idx_notice_attachments_order 
  ON public.notice_attachments(notice_id, sort_order ASC, created_at ASC);

-- Explicit PostgreSQL Table Privilege Grants (RLS remains active boundary)
GRANT SELECT ON public.notice_attachments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notice_attachments TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.notice_attachments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Row Level Security Policies for notice_attachments
-- -----------------------------------------------------------------------------

-- Public visitors can view attachments ONLY for published, active IST notices
DROP POLICY IF EXISTS "Public visitors can view attachments of published notices" ON public.notice_attachments;
CREATE POLICY "Public visitors can view attachments of published notices"
  ON public.notice_attachments
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.notices n
      WHERE n.id = notice_attachments.notice_id
        AND n.is_published = true
        AND n.publish_date <= (now() AT TIME ZONE 'Asia/Kolkata')::date
        AND (n.expiry_date IS NULL OR n.expiry_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date)
    )
  );

-- Admins can view all attachments (including drafts and expired notices)
DROP POLICY IF EXISTS "Admin can view all notice attachments" ON public.notice_attachments;
CREATE POLICY "Admin can view all notice attachments"
  ON public.notice_attachments
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can insert notice attachments
DROP POLICY IF EXISTS "Admin can insert notice attachments" ON public.notice_attachments;
CREATE POLICY "Admin can insert notice attachments"
  ON public.notice_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can update notice attachments
DROP POLICY IF EXISTS "Admin can update notice attachments" ON public.notice_attachments;
CREATE POLICY "Admin can update notice attachments"
  ON public.notice_attachments
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete notice attachments
DROP POLICY IF EXISTS "Admin can delete notice attachments" ON public.notice_attachments;
CREATE POLICY "Admin can delete notice attachments"
  ON public.notice_attachments
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 4. Configure Private Storage Bucket: 'school-notices'
--    (Created after notice_attachments is ready for Storage RLS)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-notices',
  'school-notices',
  false, -- STRICTLY PRIVATE
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
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ];

-- -----------------------------------------------------------------------------
-- Storage Object Policies on storage.objects for 'school-notices'
-- -----------------------------------------------------------------------------

-- Admin has full CRUD access to school-notices bucket
DROP POLICY IF EXISTS "Admin can manage notice storage objects" ON storage.objects;
CREATE POLICY "Admin can manage notice storage objects"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'school-notices' AND public.is_admin())
  WITH CHECK (bucket_id = 'school-notices' AND public.is_admin());

-- Public can ONLY read storage objects matching published, active IST notices
-- Uses exact path matching against na.file_path
DROP POLICY IF EXISTS "Public can view published notice documents" ON storage.objects;
CREATE POLICY "Public can view published notice documents"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'school-notices'
    AND EXISTS (
      SELECT 1
      FROM public.notice_attachments na
      JOIN public.notices n ON n.id = na.notice_id
      WHERE na.file_path = storage.objects.name
        AND n.is_published = true
        AND n.publish_date <= (now() AT TIME ZONE 'Asia/Kolkata')::date
        AND (n.expiry_date IS NULL OR n.expiry_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date)
    )
  );

