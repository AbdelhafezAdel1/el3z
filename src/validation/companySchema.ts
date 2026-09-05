import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(2, "اسم الشركة مطلوب"),
  name_en: z.string().optional(),
  vat_number: z
    .string()
    .regex(/^3\d{14}$/, "رقم الضريبة يجب أن يبدأ بـ 3 ويتكون من 15 رقمًا"),
  cr_number: z
    .string()
    .regex(/^\d{10}$/, "رقم السجل التجاري يجب أن يتكون من 10 أرقام")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^(\+9665|05)\d{8}$/, "رقم الجوال غير صحيح")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("البريد الإلكتروني غير صحيح")
    .optional()
    .or(z.literal("")),
  website: z.string().url("رابط الموقع غير صحيح").optional().or(z.literal("")),
  // National address
  building_number: z.string().optional(),
  street_name: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("SA"),
  postal_code: z.string().optional(),
  // Invoice settings
  default_vat_rate: z.number().min(0).max(100).default(15),
  default_payment_terms: z.number().int().min(0).default(30),
  invoice_prefix: z.string().default("INV"),
  invoice_notes: z.string().optional(),
  invoice_notes_en: z.string().optional(),
  // ZATCA
  zatca_environment: z.enum(["sandbox", "production"]).default("sandbox"),
  zatca_otp: z.string().optional(),
});

export type CompanyFormData = z.infer<typeof companySchema>;
