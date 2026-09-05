-- =====================================================================
-- ALEZZ GENERAL CONTRACTING (شركة العز للمقاولات العامة)
-- Supabase PostgreSQL Database Schema & Row-Level Security (RLS) Policies
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'accountant', 'viewer')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar TEXT NOT NULL,
    name_en TEXT,
    vat_number TEXT NOT NULL,
    cr_number TEXT NOT NULL,
    building_no TEXT,
    street_ar TEXT,
    street_en TEXT,
    district_ar TEXT,
    district_en TEXT,
    city_ar TEXT NOT NULL,
    city_en TEXT,
    postal_code TEXT,
    country_code TEXT NOT NULL DEFAULT 'SA',
    phone TEXT,
    email TEXT,
    website TEXT,
    iban TEXT,
    bank_name_ar TEXT,
    bank_name_en TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Company Settings Table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    default_vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
    include_qr_code BOOLEAN NOT NULL DEFAULT true,
    invoice_background_url TEXT,
    invoice_footer_notes_ar TEXT,
    invoice_footer_notes_en TEXT,
    zatca_environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (zatca_environment IN ('sandbox', 'production')),
    zatca_production_csid TEXT,
    zatca_compliance_csid TEXT,
    zatca_api_secret TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_type TEXT NOT NULL DEFAULT 'company' CHECK (customer_type IN ('company', 'individual')),
    name_ar TEXT NOT NULL,
    name_en TEXT,
    company_name TEXT,
    vat_number TEXT,
    cr_number TEXT,
    building_no TEXT,
    street TEXT,
    district TEXT,
    city TEXT NOT NULL,
    postal_code TEXT,
    country TEXT NOT NULL DEFAULT 'المملكة العربية السعودية',
    phone TEXT,
    email TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    default_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    unit_ar TEXT NOT NULL DEFAULT 'خدمة',
    unit_en TEXT NOT NULL DEFAULT 'Service',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_type TEXT NOT NULL DEFAULT 'tax_invoice' CHECK (invoice_type IN ('tax_invoice', 'simplified_tax_invoice', 'credit_note', 'debit_note')),
    issue_date DATE NOT NULL,
    issue_time TIME NOT NULL DEFAULT CURRENT_TIME,
    supply_date DATE,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'partially_paid', 'unpaid', 'cancelled')),
    zatca_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (zatca_status IN ('not_submitted', 'pending', 'submitted', 'accepted', 'rejected', 'error')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    qr_code_data TEXT,
    invoice_hash TEXT,
    previous_invoice_hash TEXT,
    zatca_uuid TEXT,
    ubl_xml TEXT,
    notes TEXT,
    payment_terms TEXT,
    payment_method TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Invoice Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    item_order INT NOT NULL DEFAULT 1,
    description_ar TEXT NOT NULL,
    description_en TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    vat_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 8. ZATCA Submissions Table
CREATE TABLE IF NOT EXISTS public.zatca_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    submission_uuid TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'sandbox',
    request_payload JSONB,
    response_payload JSONB,
    zatca_status TEXT NOT NULL DEFAULT 'submitted',
    warning_messages JSONB,
    error_code TEXT,
    error_message TEXT,
    submitted_by UUID REFERENCES public.profiles(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Audit Logs Table (Immutable)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    user_name TEXT,
    user_email TEXT,
    user_role TEXT,
    company_id UUID REFERENCES public.companies(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zatca_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile or admin can update any"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

-- Companies Policies
CREATE POLICY "Authenticated users can view companies"
    ON public.companies FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can modify company details"
    ON public.companies FOR ALL
    TO authenticated
    USING (public.is_admin());

-- Settings Policies
CREATE POLICY "Authenticated users can view company settings"
    ON public.company_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can update company settings"
    ON public.company_settings FOR ALL
    TO authenticated
    USING (public.is_admin());

-- Customers Policies
CREATE POLICY "Authenticated users can view customers"
    ON public.customers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins and Accountants can insert/update customers"
    ON public.customers FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')
    ));

CREATE POLICY "Admins and Accountants can update customers"
    ON public.customers FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')
    ));

-- Invoices & Invoice Items Policies
CREATE POLICY "Authenticated users can view invoices"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins and Accountants can manage invoices"
    ON public.invoices FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')
    ));

CREATE POLICY "Authenticated users can view invoice items"
    ON public.invoice_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins and Accountants can manage invoice items"
    ON public.invoice_items FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')
    ));

-- ZATCA Submissions Policies
CREATE POLICY "Authenticated users can view zatca submissions"
    ON public.zatca_submissions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins and Accountants can insert zatca submissions"
    ON public.zatca_submissions FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'accountant')
    ));

-- Audit Logs Policies (Strictly append-only, Admin can view all)
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Disallow UPDATE and DELETE on audit logs to guarantee immutability
-- (No UPDATE or DELETE policies created on audit_logs)
