export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
export type PaymentMethodType =
  | "cash"
  | "bank_transfer"
  | "credit_card"
  | "cheque"
  | "other";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name_ar: string;
          name_en: string;
          vat_number: string;
          cr_number: string;
          building_no: string | null;
          street_ar: string | null;
          street_en: string | null;
          district_ar: string | null;
          district_en: string | null;
          city_ar: string | null;
          city_en: string | null;
          postal_code: string | null;
          country_code: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          iban: string | null;
          bank_name_ar: string | null;
          bank_name_en: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name_ar?: string;
          name_en?: string;
          vat_number?: string;
          cr_number?: string;
          building_no?: string | null;
          street_ar?: string | null;
          street_en?: string | null;
          district_ar?: string | null;
          district_en?: string | null;
          city_ar?: string | null;
          city_en?: string | null;
          postal_code?: string | null;
          country_code?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          iban?: string | null;
          bank_name_ar?: string | null;
          bank_name_en?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name_ar?: string;
          name_en?: string;
          vat_number?: string;
          cr_number?: string;
          building_no?: string | null;
          street_ar?: string | null;
          street_en?: string | null;
          district_ar?: string | null;
          district_en?: string | null;
          city_ar?: string | null;
          city_en?: string | null;
          postal_code?: string | null;
          country_code?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          iban?: string | null;
          bank_name_ar?: string | null;
          bank_name_en?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      company_settings: {
        Row: {
          id: string;
          company_id: string;
          default_vat_rate: number;
          invoice_prefix: string;
          include_qr_code: boolean;
          invoice_background_url: string | null;
          invoice_footer_notes_ar: string | null;
          invoice_footer_notes_en: string | null;
          zatca_environment: "sandbox" | "simulation" | "production";
          zatca_production_csid: string | null;
          zatca_compliance_csid: string | null;
          zatca_api_secret: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          default_vat_rate?: number;
          invoice_prefix?: string;
          include_qr_code?: boolean;
          invoice_background_url?: string | null;
          invoice_footer_notes_ar?: string | null;
          invoice_footer_notes_en?: string | null;
          zatca_environment?: "sandbox" | "simulation" | "production";
          zatca_production_csid?: string | null;
          zatca_compliance_csid?: string | null;
          zatca_api_secret?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          default_vat_rate?: number;
          invoice_prefix?: string;
          include_qr_code?: boolean;
          invoice_background_url?: string | null;
          invoice_footer_notes_ar?: string | null;
          invoice_footer_notes_en?: string | null;
          zatca_environment?: "sandbox" | "simulation" | "production";
          zatca_production_csid?: string | null;
          zatca_compliance_csid?: string | null;
          zatca_api_secret?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          company_id: string;
          customer_type: CustomerType;
          name_ar: string;
          name_en: string | null;
          company_name: string | null;
          vat_number: string | null;
          cr_number: string | null;
          building_no: string | null;
          street: string | null;
          district: string | null;
          city: string;
          postal_code: string | null;
          country: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_type?: CustomerType;
          name_ar: string;
          name_en?: string | null;
          company_name?: string | null;
          vat_number?: string | null;
          cr_number?: string | null;
          building_no?: string | null;
          street?: string | null;
          district?: string | null;
          city?: string;
          postal_code?: string | null;
          country?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          customer_type?: CustomerType;
          name_ar?: string;
          name_en?: string | null;
          company_name?: string | null;
          vat_number?: string | null;
          cr_number?: string | null;
          building_no?: string | null;
          street?: string | null;
          district?: string | null;
          city?: string;
          postal_code?: string | null;
          country?: string;
          phone?: string | null;
          email?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          company_id: string;
          name_ar: string;
          name_en: string;
          description_ar: string | null;
          description_en: string | null;
          default_price: number;
          vat_rate: number;
          unit_ar: string;
          unit_en: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name_ar: string;
          name_en: string;
          description_ar?: string | null;
          description_en?: string | null;
          default_price?: number;
          vat_rate?: number;
          unit_ar?: string;
          unit_en?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name_ar?: string;
          name_en?: string;
          description_ar?: string | null;
          description_en?: string | null;
          default_price?: number;
          vat_rate?: number;
          unit_ar?: string;
          unit_en?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoice_sequences: {
        Row: {
          id: number;
          company_id: string;
          year: number;
          last_sequence_number: number;
          updated_at: string;
        };
        Insert: {
          id?: number;
          company_id: string;
          year: number;
          last_sequence_number?: number;
          updated_at?: string;
        };
        Update: {
          id?: number;
          company_id?: string;
          year?: number;
          last_sequence_number?: number;
          updated_at?: string;
        };
      };
      invoice_templates: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          is_default: boolean;
          background_image_url: string | null;
          header_height: number;
          footer_height: number;
          primary_color: string;
          accent_color: string;
          font_family: string;
          template_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          is_default?: boolean;
          background_image_url?: string | null;
          header_height?: number;
          footer_height?: number;
          primary_color?: string;
          accent_color?: string;
          font_family?: string;
          template_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          description?: string | null;
          is_default?: boolean;
          background_image_url?: string | null;
          header_height?: number;
          footer_height?: number;
          primary_color?: string;
          accent_color?: string;
          font_family?: string;
          template_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          customer_id: string;
          invoice_number: string;
          invoice_type: InvoiceType;
          issue_date: string;
          issue_time: string;
          supply_date: string | null;
          due_date: string | null;
          status: InvoiceStatus;
          zatca_status: ZatcaStatus;
          subtotal: number;
          discount_amount: number;
          taxable_amount: number;
          vat_amount: number;
          grand_total: number;
          paid_amount: number;
          qr_code_data: string | null;
          invoice_hash: string | null;
          previous_invoice_hash: string | null;
          zatca_uuid: string;
          ubl_xml: string | null;
          notes: string | null;
          payment_terms: string | null;
          payment_method: PaymentMethodType;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_id: string;
          invoice_number: string;
          invoice_type?: InvoiceType;
          issue_date: string;
          issue_time?: string;
          supply_date?: string | null;
          due_date?: string | null;
          status?: InvoiceStatus;
          zatca_status?: ZatcaStatus;
          subtotal?: number;
          discount_amount?: number;
          taxable_amount?: number;
          vat_amount?: number;
          grand_total?: number;
          paid_amount?: number;
          qr_code_data?: string | null;
          invoice_hash?: string | null;
          previous_invoice_hash?: string | null;
          zatca_uuid?: string;
          ubl_xml?: string | null;
          notes?: string | null;
          payment_terms?: string | null;
          payment_method?: PaymentMethodType;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          customer_id?: string;
          invoice_number?: string;
          invoice_type?: InvoiceType;
          issue_date?: string;
          issue_time?: string;
          supply_date?: string | null;
          due_date?: string | null;
          status?: InvoiceStatus;
          zatca_status?: ZatcaStatus;
          subtotal?: number;
          discount_amount?: number;
          taxable_amount?: number;
          vat_amount?: number;
          grand_total?: number;
          paid_amount?: number;
          qr_code_data?: string | null;
          invoice_hash?: string | null;
          previous_invoice_hash?: string | null;
          zatca_uuid?: string;
          ubl_xml?: string | null;
          notes?: string | null;
          payment_terms?: string | null;
          payment_method?: PaymentMethodType;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          service_id: string | null;
          item_order: number;
          description_ar: string;
          description_en: string | null;
          quantity: number;
          unit_price: number;
          discount_rate: number;
          discount_amount: number;
          taxable_amount: number;
          vat_rate: number;
          vat_amount: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          service_id?: string | null;
          item_order?: number;
          description_ar: string;
          description_en?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_rate?: number;
          discount_amount?: number;
          taxable_amount?: number;
          vat_rate?: number;
          vat_amount?: number;
          line_total?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          service_id?: string | null;
          item_order?: number;
          description_ar?: string;
          description_en?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_rate?: number;
          discount_amount?: number;
          taxable_amount?: number;
          vat_rate?: number;
          vat_amount?: number;
          line_total?: number;
          created_at?: string;
        };
      };
      zatca_submissions: {
        Row: {
          id: string;
          invoice_id: string;
          submission_uuid: string;
          environment: "sandbox" | "simulation" | "production";
          request_payload: Json | null;
          response_payload: Json | null;
          zatca_status: ZatcaStatus;
          warning_messages: Json | null;
          error_code: string | null;
          error_message: string | null;
          submitted_by: string | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          submission_uuid?: string;
          environment?: "sandbox" | "simulation" | "production";
          request_payload?: Json | null;
          response_payload?: Json | null;
          zatca_status: ZatcaStatus;
          warning_messages?: Json | null;
          error_code?: string | null;
          error_message?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          submission_uuid?: string;
          environment?: "sandbox" | "simulation" | "production";
          request_payload?: Json | null;
          response_payload?: Json | null;
          zatca_status?: ZatcaStatus;
          warning_messages?: Json | null;
          error_code?: string | null;
          error_message?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
        };
      };
      tax_records: {
        Row: {
          id: string;
          company_id: string;
          invoice_id: string;
          tax_period: string;
          invoice_number: string;
          customer_vat_number: string | null;
          taxable_sales: number;
          vat_collected: number;
          total_sales: number;
          zatca_status: ZatcaStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          invoice_id: string;
          tax_period: string;
          invoice_number: string;
          customer_vat_number?: string | null;
          taxable_sales: number;
          vat_collected: number;
          total_sales: number;
          zatca_status: ZatcaStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          invoice_id?: string;
          tax_period?: string;
          invoice_number?: string;
          customer_vat_number?: string | null;
          taxable_sales?: number;
          vat_collected?: number;
          total_sales?: number;
          zatca_status?: ZatcaStatus;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          company_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          company_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          company_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

export type {
  Profile,
  Company,
  CompanySettings,
  Customer,
  ServiceItem,
  InvoiceItem,
  Invoice,
  InvoiceSequence,
  InvoiceTemplate,
  ZatcaSubmission,
  TaxRecord,
  AuditLog,
} from "@/types/database";
