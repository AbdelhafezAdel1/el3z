import {
  Company,
  CompanySettings,
  Customer,
  ServiceItem,
  Invoice,
  AuditLog,
  ZatcaSubmission,
  TaxRecord,
} from "../../types/database";

const STORAGE_KEYS = {
  COMPANY: "alezz_company",
  SETTINGS: "alezz_company_settings",
  CUSTOMERS: "alezz_customers",
  SERVICES: "alezz_services",
  INVOICES: "alezz_invoices",
  AUDIT_LOGS: "alezz_audit_logs",
  SUBMISSIONS: "alezz_zatca_submissions",
  TAX_RECORDS: "alezz_tax_records",
  SEQUENCE: "alezz_invoice_sequence",
};

// Default Company
export const defaultCompany: Company = {
  id: "a0000000-0000-0000-0000-000000000001",
  name_ar: "مؤسسة رند العز للمقاولات العامة",
  name_en: "Rand Al-Az General Contracting Est.",
  vat_number: "310814787400003",
  cr_number: "2051233487",
  building_no: "1234",
  street_ar: "شارع الملك فهد",
  street_en: "King Fahd Road",
  district_ar: "الخبر الشمالية",
  district_en: "Al-Khobar North",
  city_ar: "الخبر",
  city_en: "Al-Khobar",
  postal_code: "31952",
  country_code: "SA",
  phone: "0506025022",
  email: "a506025022@gmail.com",
  website: "",
  iban: "SA4480000000608010167890",
  bank_name_ar: "مصرف الراجحي",
  bank_name_en: "Al Rajhi Bank",
  logo_url: "/logo.jpg",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Default Company Settings
export const defaultSettings: CompanySettings = {
  id: "b0000000-0000-0000-0000-000000000001",
  company_id: defaultCompany.id,
  default_vat_rate: 15.0,
  invoice_prefix: "INV-",
  include_qr_code: true,
  invoice_background_url: "/images/invoice-bg.jpg",
  invoice_footer_notes_ar:
    "شكراً لتعاملكم معنا. الفاتورة معتمدة إلكترونياً ومتوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك.",
  invoice_footer_notes_en:
    "Thank you for your business. Digitally certified invoice conforming to ZATCA standards.",
  zatca_environment: "production",
  zatca_production_csid: "csid_prod_169853957575",
  zatca_compliance_csid: "csid_comp_1788636269390",
  zatca_api_secret: "+Y10IlbWU1P3ZdE+xnswZA7m9aHg2PgRexzruXHw1zA=",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Default Pre-Seeded Fixed Services
export const defaultServices: ServiceItem[] = [
  {
    id: "s0000000-0000-0000-0000-000000000001",
    company_id: defaultCompany.id,
    name_ar: "تركيب باب",
    name_en: "Door Installation",
    description_ar:
      "تركيب الأبواب الخشبية والمعدنية والزجاجية مع المفصلات والأقفال وضبط الموازنة بدقة واحترافية",
    description_en:
      "Installation of wooden, metallic, and glass doors including hinges, locks, and alignment.",
    default_price: 450.0,
    vat_rate: 15.0,
    unit_ar: "باب",
    unit_en: "Door",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "s0000000-0000-0000-0000-000000000002",
    company_id: defaultCompany.id,
    name_ar: "تصليح وصيانة أبواب",
    name_en: "Door Repair and Maintenance",
    description_ar:
      "خدمات الصيانة الدورية وإصلاح الخدوش والعيوب وتغيير الأقفال والمقابض وهياكل الأبواب",
    description_en:
      "Periodic maintenance, repair of scratches/defects, replacement of locks, handles, and door frames.",
    default_price: 250.0,
    vat_rate: 15.0,
    unit_ar: "خدمة",
    unit_en: "Service",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Default Customers
export const defaultCustomers: Customer[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    company_id: defaultCompany.id,
    customer_type: "company",
    name_ar: "مؤسسة النخبة العقارية للتطوير",
    name_en: "Al Nokhbah Real Estate Development Est.",
    company_name: "مؤسسة النخبة العقارية",
    vat_number: "310987654300003",
    cr_number: "1010654321",
    building_no: "4321",
    street: "شارع التخصصي",
    district: "حي المعذر",
    city: "الرياض",
    postal_code: "12311",
    country: "المملكة العربية السعودية",
    phone: "+966551234567",
    email: "finance@alnokhbah.sa",
    notes: "عميل تجاري رئيسي - مشاريع أبراج سكنية",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    company_id: defaultCompany.id,
    customer_type: "individual",
    name_ar: "عبدالله بن سعد القحطاني",
    name_en: "Abdullah Saad Al-Qahtani",
    building_no: "8890",
    street: "شارع أنس بن مالك",
    district: "حي الملقا",
    city: "الرياض",
    postal_code: "13524",
    country: "المملكة العربية السعودية",
    phone: "+966509876543",
    email: "a.qahtani@example.com",
    notes: "عميل أفراد - فيلا خاصة",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Initialize Storage if empty
export function initLocalStorage(): void {
  if (!localStorage.getItem(STORAGE_KEYS.COMPANY)) {
    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(defaultCompany));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify(defaultSettings),
    );
  }
  if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
    localStorage.setItem(
      STORAGE_KEYS.SERVICES,
      JSON.stringify(defaultServices),
    );
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    localStorage.setItem(
      STORAGE_KEYS.CUSTOMERS,
      JSON.stringify(defaultCustomers),
    );
  }
  if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SUBMISSIONS)) {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TAX_RECORDS)) {
    localStorage.setItem(STORAGE_KEYS.TAX_RECORDS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SEQUENCE)) {
    localStorage.setItem(STORAGE_KEYS.SEQUENCE, "100");
  }
}

// Helpers
export const LocalStore = {
  getCompany(): Company {
    initLocalStorage();
    try {
      return (
        JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPANY) || "{}") ||
        defaultCompany
      );
    } catch {
      return defaultCompany;
    }
  },
  saveCompany(company: Company): void {
    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(company));
  },
  getSettings(): CompanySettings {
    initLocalStorage();
    try {
      return (
        JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || "{}") ||
        defaultSettings
      );
    } catch {
      return defaultSettings;
    }
  },
  saveSettings(settings: CompanySettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },
  getCustomers(): Customer[] {
    initLocalStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || "[]");
    } catch {
      return defaultCustomers;
    }
  },
  saveCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },
  getServices(): ServiceItem[] {
    initLocalStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES) || "[]");
    } catch {
      return defaultServices;
    }
  },
  saveServices(services: ServiceItem[]): void {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
  },
  getInvoices(): Invoice[] {
    initLocalStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || "[]");
    } catch {
      return [];
    }
  },
  saveInvoices(invoices: Invoice[]): void {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  },
  getAuditLogs(): AuditLog[] {
    initLocalStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || "[]");
    } catch {
      return [];
    }
  },
  saveAuditLogs(logs: AuditLog[]): void {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  },
  getNextSequenceNumber(): string {
    initLocalStorage();
    const currentYear = new Date().getFullYear();
    const currentSeq =
      parseInt(localStorage.getItem(STORAGE_KEYS.SEQUENCE) || "100", 10) + 1;
    localStorage.setItem(STORAGE_KEYS.SEQUENCE, currentSeq.toString());
    const settings = this.getSettings();
    const prefix = settings.invoice_prefix || "INV-";
    return `${prefix}${currentYear}-${currentSeq.toString().padStart(6, "0")}`;
  },
  getSubmissions(): ZatcaSubmission[] {
    initLocalStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || "[]");
    } catch {
      return [];
    }
  },
  saveSubmissions(submissions: ZatcaSubmission[]): void {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  },
  getTaxRecords(): TaxRecord[] {
    initLocalStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TAX_RECORDS) || "[]");
    } catch {
      return [];
    }
  },
  saveTaxRecords(records: TaxRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.TAX_RECORDS, JSON.stringify(records));
  },
};
