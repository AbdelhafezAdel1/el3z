-- ==============================================================================
-- مؤسسة رند العز للمقاولات العامة - إعداد مساحات تخزين ملفات الفواتير والشعارات
-- Rand Al-Az General Contracting Est. - Supabase Storage Buckets & Policies
-- ==============================================================================

-- 1. Create Storage Buckets for company assets and invoice PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('company-assets', 'company-assets', TRUE, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']),
    ('invoices', 'invoices', TRUE, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies for company-assets bucket
DO $$ BEGIN
    CREATE POLICY "Public Read Access for Company Assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'company-assets');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated Users can upload Company Assets"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated Users can update Company Assets"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Storage Policies for invoices bucket
DO $$ BEGIN
    CREATE POLICY "Public Read Access for Invoices"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'invoices');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated Users can upload Invoice PDFs"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
