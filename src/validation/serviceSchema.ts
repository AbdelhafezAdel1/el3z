import { z } from "zod";

export const serviceSchema = z.object({
  name_ar: z.string().min(2, "اسم الخدمة باللغة العربية مطلوب (حرفان على الأقل)"),
  name_en: z.string().min(2, "اسم الخدمة باللغة الإنجليزية مطلوب (حرفان على الأقل)"),
  description_ar: z.string().optional().or(z.literal("")),
  description_en: z.string().optional().or(z.literal("")),
  default_price: z.coerce
    .number({ invalid_type_error: "السعر يجب أن يكون رقمًا صالحًا" })
    .min(0, "السعر لا يمكن أن يكون سالبًا"),
  vat_rate: z.coerce
    .number({ invalid_type_error: "نسبة الضريبة يجب أن تكون رقمًا" })
    .min(0, "نسبة الضريبة لا تقل عن 0%")
    .max(100, "نسبة الضريبة لا تزيد عن 100%")
    .default(15.0),
  unit_ar: z.string().min(1, "الوحدة بالعربية مطلوبة").default("خدمة"),
  unit_en: z.string().min(1, "الوحدة بالإنجليزية مطلوبة").default("Service"),
  is_active: z.boolean().default(true),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
