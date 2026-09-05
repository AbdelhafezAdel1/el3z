import { z } from "zod";

export const invoiceLineItemSchema = z.object({
  service_id: z.string().optional().or(z.literal("")),
  description_ar: z.string().min(1, "وصف البند بالعربية مطلوب"),
  description_en: z.string().optional().or(z.literal("")),
  quantity: z.coerce
    .number({ invalid_type_error: "الكمية يجب أن تكون رقمًا" })
    .positive("الكمية يجب أن تكون أكبر من صفر"),
  unit_price: z.coerce
    .number({ invalid_type_error: "السعر يجب أن يكون رقمًا" })
    .min(0, "السعر لا يمكن أن يكون سالبًا"),
  discount_rate: z.coerce
    .number()
    .min(0, "نسبة الخصم لا يمكن أن تكون سالبة")
    .max(100, "نسبة الخصم لا تتجاوز 100%")
    .default(0),
  vat_rate: z.coerce
    .number()
    .min(0, "نسبة الضريبة لا تقل عن 0%")
    .max(100, "نسبة الضريبة لا تزيد عن 100%")
    .default(15.0),
  unit_ar: z.string().optional().default("خدمة"),
  unit_en: z.string().optional().default("Service"),
});

export const invoiceSchema = z.object({
  customer_id: z.string().min(1, "يرجى اختيار العميل"),
  invoice_type: z
    .enum(["tax_invoice", "simplified_tax_invoice", "credit_note", "debit_note"])
    .default("tax_invoice"),
  issue_date: z.string().min(1, "تاريخ إصدار الفاتورة مطلوب"),
  supply_date: z.string().optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  payment_method: z
    .enum(["cash", "bank_transfer", "credit_card", "cheque", "other"])
    .default("bank_transfer"),
  notes: z.string().optional().or(z.literal("")),
  payment_terms: z.string().optional().or(z.literal("")),
  items: z
    .array(invoiceLineItemSchema)
    .min(1, "يجب إضافة بند واحد على الأقل في الفاتورة"),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type InvoiceLineItemFormData = z.infer<typeof invoiceLineItemSchema>;
