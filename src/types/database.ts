export type UserRole = "admin" | "accountant" | "viewer";
export type CustomerType = "company" | "individual";
export type InvoiceStatus =
  | "draft"
  | "issued"
  | "paid"
  | "partially_paid"
  | "unpaid"
  | "cancelled";
export type ZatcaStatus =
  | "not_submitted"
  | "pending"
  | "submitted"
  | "accepted"
  | "rejected"
  | "error";
export type InvoiceType =
  | "tax_invoice"
  | "simplified_tax_invoice"
  | "credit_note"
  | "debit_note";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name_ar: string;
  name_en: string;
  vat_number: string;
  cr_number: string;
  building_no: string;
  street_ar: string;
  street_en: string;
  district_ar: string;
  district_en: string;
  city_ar: string;
  city_en: string;
  postal_code: string;
  country_code: string;
  phone: string;
  email: string;
  website: string;
  iban: string;
  bank_account_number?: string;
  bank_name_ar: string;
  bank_name_en?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: string;
  company_id: string;
  default_vat_rate: number;
  invoice_prefix: string;
  include_qr_code: boolean;
  invoice_background_url?: string;
  invoice_footer_notes_ar: string;
  invoice_footer_notes_en: string;
  zatca_environment: "sandbox" | "production";
  zatca_production_csid?: string;
  zatca_compliance_csid?: string;
  zatca_api_secret?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  customer_type: CustomerType;
  name_ar: string;
  name_en?: string;
  company_name?: string;
  vat_number?: string;
  cr_number?: string;
  building_no?: string;
  street?: string;
  district?: string;
  city: string;
  postal_code?: string;
  country: string;
  phone?: string;
  email?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceItem {
  id: string;
  company_id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  default_price: number;
  vat_rate: number;
  unit_ar: string;
  unit_en: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  service_id?: string;
  item_order: number;
  description_ar: string;
  description_en?: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  discount_amount: number;
  taxable_amount: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  issue_date: string;
  issue_time: string;
  supply_date?: string;
  due_date?: string;
  status: InvoiceStatus;
  zatca_status: ZatcaStatus;

  // Monetary
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  vat_amount: number;
  grand_total: number;
  paid_amount: number;

  // ZATCA Metadata
  qr_code_data?: string;
  invoice_hash?: string;
  previous_invoice_hash?: string;
  zatca_uuid?: string;
  ubl_xml?: string;

  notes?: string;
  payment_terms?: string;
  payment_method?: string;

  created_by?: string;
  created_at: string;
  updated_at: string;

  // Joins
  customer?: Customer;
  items?: InvoiceItem[];
  company?: Company;
}

export interface InvoiceSequence {
  id: number;
  company_id: string;
  year: number;
  last_sequence_number: number;
  updated_at: string;
}

export interface InvoiceTemplate {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  background_image_url?: string;
  header_height?: number;
  footer_height?: number;
  primary_color?: string;
  accent_color?: string;
  font_family?: string;
  template_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ZatcaSubmission {
  id: string;
  invoice_id: string;
  submission_uuid: string;
  environment: "sandbox" | "production";
  request_payload?: any;
  response_payload?: any;
  zatca_status: ZatcaStatus;
  warning_messages?: any;
  error_code?: string;
  error_message?: string;
  submitted_by?: string;
  submitted_at: string;
  invoice?: Invoice;
}

export interface TaxRecord {
  id: string;
  company_id: string;
  invoice_id: string;
  tax_period: string;
  invoice_number: string;
  customer_vat_number?: string;
  taxable_sales: number;
  vat_collected: number;
  total_sales: number;
  zatca_status: ZatcaStatus;
  created_at: string;
  invoice?: Invoice;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: UserRole;
  company_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: any;
  new_data?: any;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

