import { z } from "zod";

const phoneSchema = z
  .string()
  .refine(
    (val) => !val || /^(\+9665|05|\+966|01)\d{7,9}$/.test(val.replace(/\s|-/g, "")),
    "رقم الجوال / الهاتف غير صحيح (مثال: 0506025022)"
  )
  .optional()
  .or(z.literal(""));

const emailSchema = z
  .string()
  .refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    "البريد الإلكتروني غير صحيح"
  )
  .optional()
  .or(z.literal(""));

const vatSchema = z
  .string()
  .refine(
    (val) => !val || /^3\d{14}$/.test(val.trim()),
    "الرقم الضريبي السعودي يتكون من 15 رقماً ويبدأ بالرقم 3"
  )
  .optional()
  .or(z.literal(""));

const crSchema = z
  .string()
  .refine(
    (val) => !val || /^\d{10}$/.test(val.trim()),
    "رقم السجل التجاري يتكون من 10 أرقام"
  )
  .optional()
  .or(z.literal(""));

export const customerSchema = z.object({
  name_ar: z.string().min(2, "اسم العميل بالعربية مطلوب (حرفان على الأقل)"),
  name_en: z.string().optional().or(z.literal("")),
  company_name: z.string().optional().or(z.literal("")),
  customer_type: z.enum(["company", "individual"]),
  vat_number: vatSchema,
  cr_number: crSchema,
  building_no: z.string().optional().or(z.literal("")),
  street: z.string().optional().or(z.literal("")),
  district: z.string().optional().or(z.literal("")),
  city: z.string().min(2, "المدينة مطلوبة").default("الخبر"),
  postal_code: z.string().optional().or(z.literal("")),
  country: z.string().default("المملكة العربية السعودية"),
  phone: phoneSchema,
  email: emailSchema,
  notes: z.string().optional().or(z.literal("")),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
