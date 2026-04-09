-- ================================================================
-- FIX: Storage RLS Policies for 'vaquejadas' bucket
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor → New Query
-- ================================================================

-- 1. Allow authenticated users to UPLOAD files to the vaquejadas bucket
CREATE POLICY "Authenticated users can upload to vaquejadas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vaquejadas');

-- 2. Allow authenticated users to UPDATE/REPLACE files (needed for upsert)
CREATE POLICY "Authenticated users can update files in vaquejadas"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'vaquejadas');

-- 3. Allow everyone (anon + auth) to READ/VIEW files (public bucket)
CREATE POLICY "Public read access to vaquejadas"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'vaquejadas');

-- 4. Allow authenticated users to DELETE their own files
CREATE POLICY "Authenticated users can delete files in vaquejadas"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'vaquejadas');

-- ================================================================
-- Also fix the ads_campaigns table RLS (if needed)
-- ================================================================

-- Allow authenticated users to INSERT new ads
CREATE POLICY "Authenticated users can create ads"
ON public.ads_campaigns
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to UPDATE ads
CREATE POLICY "Authenticated users can update ads"
ON public.ads_campaigns
FOR UPDATE
TO authenticated
USING (true);

-- Allow everyone to READ active ads (for the carousel)
CREATE POLICY "Public can read active ads"
ON public.ads_campaigns
FOR SELECT
TO public
USING (status = 'active');

-- Allow admin users to read ALL ads (including paused)
CREATE POLICY "Authenticated users can read all ads"
ON public.ads_campaigns
FOR SELECT
TO authenticated
USING (true);
