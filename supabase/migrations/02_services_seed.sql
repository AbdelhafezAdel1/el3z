-- ==============================================================================
-- مؤسسة رند العز للمقاولات العامة - بذور الخدمات الأساسية
-- Rand Al-Az General Contracting Est. - Initial Services Seed Data
-- ==============================================================================

-- Seed Initial Services
INSERT INTO public.services (
    id,
    company_id,
    name_ar,
    name_en,
    description_ar,
    description_en,
    default_price,
    vat_rate,
    unit_ar,
    unit_en,
    is_active,
    created_at,
    updated_at
) VALUES 
(
    's0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'تركيب باب',
    'Door Installation',
    'تركيب الأبواب الخشبية والمعدنية والزجاجية مع المفصلات والأقفال وضبط الموازنة بدقة واحترافية',
    'Installation of wooden, metallic, and glass doors including hinges, locks, and alignment.',
    450.00,
    15.00,
    'باب',
    'Door',
    TRUE,
    NOW(),
    NOW()
),
(
    's0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'تصليح وصيانة أبواب',
    'Door Repair and Maintenance',
    'خدمات الصيانة الدورية وإصلاح الخدوش والعيوب وتغيير الأقفال والمقابض وهياكل الأبواب',
    'Periodic maintenance, repair of scratches/defects, replacement of locks, handles, and door frames.',
    250.00,
    15.00,
    'خدمة',
    'Service',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    description_ar = EXCLUDED.description_ar,
    description_en = EXCLUDED.description_en,
    default_price = EXCLUDED.default_price,
    vat_rate = EXCLUDED.vat_rate,
    unit_ar = EXCLUDED.unit_ar,
    unit_en = EXCLUDED.unit_en,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
