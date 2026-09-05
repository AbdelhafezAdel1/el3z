-- ==============================================================================
-- مؤسسة رند العز للمقاولات العامة - مصفوفة قاعدة البيانات وسياسات الأمان المتوافقة مع زاتكا
-- Rand Al-Az General Contracting Est. - ZATCA Phase 1 & 2 Ready PostgreSQL Architecture
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE customer_type AS ENUM ('company', 'individual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'partially_paid', 'unpaid', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE zatca_status AS ENUM ('not_submitted', 'pending', 'submitted', 'accepted', 'rejected', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_type AS ENUM ('tax_invoice', 'simplified_tax_invoice', 'credit_note', 'debit_note');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM ('cash', 'bank_transfer', 'credit_card', 'cheque', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'accountant'::user_role NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar TEXT NOT NULL DEFAULT 'مؤسسة رند العز للمقاولات العامة',
    name_en TEXT NOT NULL DEFAULT 'Rand Al-Az General Contracting Est.',
    vat_number VARCHAR(15) NOT NULL DEFAULT '300000000000003' CHECK (vat_number ~ '^3[0-9]{14}$'),
    cr_number VARCHAR(10) NOT NULL DEFAULT '2051233487' CHECK (cr_number ~ '^[0-9]{10}$'),
    building_no VARCHAR(10) DEFAULT '1234',
    street_ar TEXT DEFAULT 'شارع الملك فهد',
    street_en TEXT DEFAULT 'King Fahd Road',
    district_ar TEXT DEFAULT 'الخبر الشمالية',
    district_en TEXT DEFAULT 'Al-Khobar North',
    city_ar TEXT DEFAULT 'الخبر',
    city_en TEXT DEFAULT 'Al-Khobar',
    postal_code VARCHAR(10) DEFAULT '31952',
    country_code VARCHAR(5) DEFAULT 'SA',
    phone VARCHAR(20) DEFAULT '0506025022',
    email TEXT DEFAULT 'a506025022@gmail.com',
    website TEXT DEFAULT '',
    iban VARCHAR(34) DEFAULT 'SA4480000000608010167890',
    bank_name_ar TEXT DEFAULT 'مصرف الراجحي',
    bank_name_en TEXT DEFAULT 'Al Rajhi Bank',
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. COMPANY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    default_vat_rate NUMERIC(5, 2) DEFAULT 15.00 NOT NULL CHECK (default_vat_rate >= 0 AND default_vat_rate <= 100),
    invoice_prefix TEXT DEFAULT 'INV-' NOT NULL,
    include_qr_code BOOLEAN DEFAULT TRUE NOT NULL,
    invoice_background_url TEXT DEFAULT '/images/invoice-bg.jpg',
    invoice_footer_notes_ar TEXT DEFAULT 'شكراً لتعاملكم معنا. الفاتورة معتمدة إلكترونياً ومتوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك.',
    invoice_footer_notes_en TEXT DEFAULT 'Thank you for your business. Digitally certified invoice compliant with ZATCA.',
    zatca_environment TEXT DEFAULT 'sandbox' NOT NULL CHECK (zatca_environment IN ('sandbox', 'simulation', 'production')),
    zatca_production_csid TEXT,
    zatca_compliance_csid TEXT,
    zatca_api_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(company_id)
);

-- 6. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_type customer_type DEFAULT 'company'::customer_type NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    company_name TEXT,
    vat_number VARCHAR(15) CHECK (vat_number IS NULL OR vat_number = '' OR vat_number ~ '^3[0-9]{14}$'),
    cr_number VARCHAR(10) CHECK (cr_number IS NULL OR cr_number = '' OR cr_number ~ '^[0-9]{10}$'),
    building_no VARCHAR(10),
    street TEXT,
    district TEXT,
    city TEXT DEFAULT 'الخبر' NOT NULL,
    postal_code VARCHAR(10),
    country TEXT DEFAULT 'المملكة العربية السعودية' NOT NULL,
    phone VARCHAR(20),
    email TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    default_price NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (default_price >= 0),
    vat_rate NUMERIC(5, 2) DEFAULT 15.00 NOT NULL CHECK (vat_rate >= 0 AND vat_rate <= 100),
    unit_ar TEXT DEFAULT 'خدمة' NOT NULL,
    unit_en TEXT DEFAULT 'Service' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. INVOICE SEQUENCES TABLE (Atomic Concurrency Locking Table)
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    year INT NOT NULL CHECK (year >= 2020),
    last_sequence_number INT DEFAULT 0 NOT NULL CHECK (last_sequence_number >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(company_id, year)
);

-- 9. INVOICE TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.invoice_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    background_image_url TEXT DEFAULT '/images/invoice-bg.jpg',
    header_height INT DEFAULT 130 CHECK (header_height >= 0),
    footer_height INT DEFAULT 90 CHECK (footer_height >= 0),
    primary_color TEXT DEFAULT '#047857' NOT NULL,
    accent_color TEXT DEFAULT '#c59b27' NOT NULL,
    font_family TEXT DEFAULT 'Cairo' NOT NULL,
    template_config JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. INVOICES TABLE (Core Accounting & ZATCA Record)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_type invoice_type DEFAULT 'tax_invoice'::invoice_type NOT NULL,
    issue_date DATE NOT NULL,
    issue_time TIME NOT NULL DEFAULT CURRENT_TIME,
    supply_date DATE,
    due_date DATE,
    status invoice_status DEFAULT 'draft'::invoice_status NOT NULL,
    zatca_status zatca_status DEFAULT 'not_submitted'::zatca_status NOT NULL,
    
    -- Monetary amounts stored in exact 2 decimal precision (Big.js equivalent in PostgreSQL)
    subtotal NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (discount_amount >= 0),
    taxable_amount NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (taxable_amount >= 0),
    vat_amount NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (vat_amount >= 0),
    grand_total NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (grand_total >= 0),
    paid_amount NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (paid_amount >= 0),
    
    -- ZATCA Phase 1 & 2 Security Metadata
    qr_code_data TEXT,
    invoice_hash VARCHAR(64),
    previous_invoice_hash VARCHAR(64),
    zatca_uuid UUID DEFAULT uuid_generate_v4() NOT NULL,
    ubl_xml TEXT,
    
    notes TEXT,
    payment_terms TEXT,
    payment_method payment_method_type DEFAULT 'bank_transfer'::payment_method_type NOT NULL,
    
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    item_order INT DEFAULT 1 NOT NULL CHECK (item_order > 0),
    description_ar TEXT NOT NULL,
    description_en TEXT,
    quantity NUMERIC(10, 2) DEFAULT 1.00 NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (unit_price >= 0),
    discount_rate NUMERIC(5, 2) DEFAULT 0.00 NOT NULL CHECK (discount_rate >= 0 AND discount_rate <= 100),
    discount_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (discount_amount >= 0),
    taxable_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (taxable_amount >= 0),
    vat_rate NUMERIC(5, 2) DEFAULT 15.00 NOT NULL CHECK (vat_rate >= 0 AND vat_rate <= 100),
    vat_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (vat_amount >= 0),
    line_total NUMERIC(14, 2) DEFAULT 0.00 NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. ZATCA SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.zatca_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    submission_uuid UUID DEFAULT uuid_generate_v4() NOT NULL,
    environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'simulation', 'production')),
    request_payload JSONB,
    response_payload JSONB,
    zatca_status zatca_status NOT NULL,
    warning_messages JSONB,
    error_code VARCHAR(100),
    error_message TEXT,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 13. TAX RECORDS TABLE (Quarterly & Monthly VAT Audit Trail)
CREATE TABLE IF NOT EXISTS public.tax_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    tax_period VARCHAR(10) NOT NULL, -- e.g. '2026-Q1' or '2026-03'
    invoice_number VARCHAR(50) NOT NULL,
    customer_vat_number VARCHAR(15),
    taxable_sales NUMERIC(14, 2) NOT NULL CHECK (taxable_sales >= 0),
    vat_collected NUMERIC(14, 2) NOT NULL CHECK (vat_collected >= 0),
    total_sales NUMERIC(14, 2) NOT NULL CHECK (total_sales >= 0),
    zatca_status zatca_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 14. AUDIT LOGS TABLE (Tamper-Proof Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'CREATE_INVOICE', 'UPDATE_INVOICE', 'SUBMIT_ZATCA', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'invoice', 'customer', 'service', 'company_settings'
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 15. PERFORMANCE & SEARCH INDEXES
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_vat_number ON public.customers(vat_number);
CREATE INDEX IF NOT EXISTS idx_customers_cr_number ON public.customers(cr_number);
CREATE INDEX IF NOT EXISTS idx_services_company_id ON public.services(company_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_zatca_status ON public.invoices(zatca_status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_company ON public.invoice_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_zatca_submissions_invoice_id ON public.zatca_submissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tax_records_company_period ON public.tax_records(company_id, tax_period);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 16. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_companies_updated_at ON public.companies;
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER trg_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_invoice_templates_updated_at ON public.invoice_templates;
CREATE TRIGGER trg_invoice_templates_updated_at BEFORE UPDATE ON public.invoice_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 17. ATOMIC CONCURRENCY-SAFE INVOICE NUMBER GENERATOR
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_year INT;
    v_seq INT;
    v_prefix TEXT;
    v_formatted_number TEXT;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    SELECT COALESCE(invoice_prefix, 'INV-') INTO v_prefix
    FROM public.company_settings
    WHERE company_id = p_company_id;
    
    IF v_prefix IS NULL OR v_prefix = '' THEN
        v_prefix := 'INV-';
    END IF;

    -- Upsert and lock sequence row
    INSERT INTO public.invoice_sequences (company_id, year, last_sequence_number, updated_at)
    VALUES (p_company_id, v_year, 1, NOW())
    ON CONFLICT (company_id, year)
    DO UPDATE SET 
        last_sequence_number = public.invoice_sequences.last_sequence_number + 1,
        updated_at = NOW()
    RETURNING last_sequence_number INTO v_seq;

    -- Format as INV-2026-000001
    v_formatted_number := v_prefix || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
    
    RETURN v_formatted_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. ZATCA ACCEPTED INVOICE IMMUTABILITY PROTECTION TRIGGER
CREATE OR REPLACE FUNCTION protect_accepted_invoice_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.zatca_status = 'accepted' THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'ZATCA Compliance Violation: Invoices accepted by ZATCA cannot be deleted. You must issue a Credit Note or Debit Note instead.';
        END IF;
        IF TG_OP = 'UPDATE' AND (
            NEW.invoice_number <> OLD.invoice_number OR
            NEW.subtotal <> OLD.subtotal OR
            NEW.vat_amount <> OLD.vat_amount OR
            NEW.grand_total <> OLD.grand_total OR
            NEW.customer_id <> OLD.customer_id OR
            NEW.issue_date <> OLD.issue_date
        ) THEN
            RAISE EXCEPTION 'ZATCA Compliance Violation: Financial & identification fields of an accepted invoice cannot be modified. Issue a Credit Note.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_accepted_invoice ON public.invoices;
CREATE TRIGGER trg_protect_accepted_invoice
BEFORE UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION protect_accepted_invoice_immutability();

-- 19. AUTH TRIGGER FOR AUTO PROFILE CREATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'accountant'::user_role
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 20. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zatca_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
    SELECT COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'accountant'::user_role);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can view profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Companies Policies
CREATE POLICY "Authenticated users can select companies" ON public.companies
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update company" ON public.companies
    FOR UPDATE USING (auth.role() = 'authenticated' AND current_user_role() = 'admin');

-- Company Settings Policies
CREATE POLICY "Authenticated users can select settings" ON public.company_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update settings" ON public.company_settings
    FOR UPDATE USING (auth.role() = 'authenticated' AND current_user_role() = 'admin');

-- Customers Policies
CREATE POLICY "Authenticated users can view customers" ON public.customers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert customers" ON public.customers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers" ON public.customers
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete customers" ON public.customers
    FOR DELETE USING (auth.role() = 'authenticated' AND current_user_role() = 'admin');

-- Services Policies
CREATE POLICY "Authenticated users can view services" ON public.services
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert services" ON public.services
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update services" ON public.services
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete services" ON public.services
    FOR DELETE USING (auth.role() = 'authenticated' AND current_user_role() = 'admin');

-- Invoice Templates Policies
CREATE POLICY "Authenticated users can view templates" ON public.invoice_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage templates" ON public.invoice_templates
    FOR ALL USING (auth.role() = 'authenticated' AND current_user_role() = 'admin');

-- Invoices Policies
CREATE POLICY "Authenticated users can view invoices" ON public.invoices
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create invoices" ON public.invoices
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update non-accepted invoices" ON public.invoices
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete draft invoices" ON public.invoices
    FOR DELETE USING (auth.role() = 'authenticated' AND current_user_role() = 'admin' AND zatca_status <> 'accepted');

-- Invoice Items Policies
CREATE POLICY "Authenticated users can view invoice items" ON public.invoice_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert invoice items" ON public.invoice_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invoice items" ON public.invoice_items
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete invoice items" ON public.invoice_items
    FOR DELETE USING (auth.role() = 'authenticated');

-- ZATCA Submissions Policies
CREATE POLICY "Authenticated users can view zatca submissions" ON public.zatca_submissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert zatca submissions" ON public.zatca_submissions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Tax Records Policies
CREATE POLICY "Authenticated users can view tax records" ON public.tax_records
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage tax records" ON public.tax_records
    FOR ALL USING (auth.role() = 'authenticated');

-- Audit Logs Policies (Tamper-Proof: Select & Insert Only)
CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 21. SEED DATA (مؤسسة رند العز للمقاولات العامة)
INSERT INTO public.companies (
    id, name_ar, name_en, vat_number, cr_number, building_no, street_ar, street_en, 
    district_ar, district_en, city_ar, city_en, postal_code, country_code, phone, email, website, iban, bank_name_ar
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'مؤسسة رند العز للمقاولات العامة',
    'Rand Al-Az General Contracting Est.',
    '310123456700003',
    '2051233487',
    '1234',
    'شارع الملك فهد',
    'King Fahd Road',
    'الخبر الشمالية',
    'Al-Khobar North',
    'الخبر',
    'Al-Khobar',
    '31952',
    'SA',
    '0506025022',
    'a506025022@gmail.com',
    '',
    'SA4480000000608010167890',
    'مصرف الراجحي'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.company_settings (
    company_id, default_vat_rate, invoice_prefix, include_qr_code, 
    invoice_background_url, invoice_footer_notes_ar, invoice_footer_notes_en, zatca_environment
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    15.00,
    'INV-',
    TRUE,
    '/images/invoice-bg.jpg',
    'شكراً لتعاملكم معنا. الفاتورة معتمدة إلكترونياً ومتوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك.',
    'Thank you for your business. Digitally certified invoice compliant with ZATCA.',
    'sandbox'
) ON CONFLICT (company_id) DO NOTHING;

INSERT INTO public.invoice_templates (
    company_id, name, description, is_default, background_image_url, header_height, footer_height, primary_color, accent_color
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'النموذج الرسمي المعتمد (رند العز)',
    'نموذج الفاتورة الضريبية المعتمد مع ترويسة وتذييل مؤسسة رند العز للمقاولات العامة',
    TRUE,
    '/images/invoice-bg.jpg',
    130,
    90,
    '#047857',
    '#c59b27'
) ON CONFLICT DO NOTHING;

INSERT INTO public.services (
    company_id, name_ar, name_en, description_ar, description_en, default_price, vat_rate, unit_ar, unit_en, is_active
) VALUES 
(
    'a0000000-0000-0000-0000-000000000001',
    'تركيب باب',
    'Door Installation',
    'تركيب الأبواب الخشبية والمعدنية والزجاجية مع المفصلات والأقفال وضبط الموازنة بدقة واحترافية',
    'Installation of wooden, metallic, and glass doors including hinges, locks, and alignment.',
    450.00,
    15.00,
    'باب',
    'Door',
    TRUE
),
(
    'a0000000-0000-0000-0000-000000000001',
    'تصليح وصيانة أبواب',
    'Door Repair and Maintenance',
    'خدمات الصيانة الدورية وإصلاح الخدوش والعيوب وتغيير الأقفال والمقابض وهياكل الأبواب',
    'Periodic maintenance, repair of scratches/defects, replacement of locks, handles, and door frames.',
    250.00,
    15.00,
    'خدمة',
    'Service',
    TRUE
);

INSERT INTO public.customers (
    company_id, customer_type, name_ar, name_en, company_name, vat_number, cr_number, 
    building_no, street, district, city, postal_code, phone, email, notes
) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'company',
    'مؤسسة النخبة العقارية للتطوير',
    'Al Nokhbah Real Estate Development Est.',
    'مؤسسة النخبة العقارية',
    '310987654300003',
    '1010654321',
    '4321',
    'شارع الأمير تركي',
    'حي الكورنيش',
    'الخبر',
    '31952',
    '0551234567',
    'finance@alnokhbah.sa',
    'عميل تجاري رئيسي - مشاريع أبراج سكنية'
),
(
    'a0000000-0000-0000-0000-000000000001',
    'individual',
    'عبدالله بن سعد القحطاني',
    'Abdullah Saad Al-Qahtani',
    NULL,
    NULL,
    NULL,
    '8890',
    'شارع الملك عبدالعزيز',
    'حي الحزام الأخضر',
    'الخبر',
    '31952',
    '0509876543',
    'a.qahtani@example.com',
    'عميل أفراد - فيلا خاصة'
);
