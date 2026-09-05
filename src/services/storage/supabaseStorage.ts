import { supabase, isSupabaseConfigured } from "../../lib/supabase";

const ALLOWED_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

const ALLOWED_BG_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class SupabaseStorageService {
  private static COMPANY_BUCKET = "company-assets";
  private static INVOICES_BUCKET = "invoices";

  /**
   * Validates file mime type and size to prevent unsafe uploads
   */
  private static validateFile(
    file: File,
    allowedMimes: string[],
    maxSize: number = MAX_FILE_SIZE_BYTES,
  ): void {
    if (!file) {
      throw new Error("الملف غير صالح أو غير موجود");
    }

    if (file.size > maxSize) {
      throw new Error("حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)");
    }

    if (!allowedMimes.includes(file.type)) {
      throw new Error(
        `نوع الملف غير مسموح به (${file.type}). الأنواع المدعومة: PNG, JPG, WebP`,
      );
    }
  }

  /**
   * Upload Company Logo to Supabase Storage with base64 fallback
   */
  static async uploadLogo(file: File): Promise<string> {
    this.validateFile(file, ALLOWED_LOGO_MIME_TYPES);

    if (isSupabaseConfigured) {
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const sanitizedExt = ["png", "jpg", "jpeg", "webp", "svg"].includes(ext)
          ? ext
          : "png";
        const filePath = `logos/logo-${Date.now()}.${sanitizedExt}`;

        const { error: uploadError } = await supabase.storage
          .from(this.COMPANY_BUCKET)
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          });

        if (!uploadError) {
          const { data } = supabase.storage
            .from(this.COMPANY_BUCKET)
            .getPublicUrl(filePath);

          if (data?.publicUrl) {
            return data.publicUrl;
          }
        } else {
          console.warn("Supabase logo upload error, fallback to base64:", uploadError);
        }
      } catch (err) {
        console.warn("Supabase storage error:", err);
      }
    }

    // Fallback to Base64 data URL
    return this.fileToBase64(file);
  }

  /**
   * Upload Invoice Background Letterhead to Supabase Storage with base64 fallback
   */
  static async uploadInvoiceBackground(file: File): Promise<string> {
    this.validateFile(file, ALLOWED_BG_MIME_TYPES);

    if (isSupabaseConfigured) {
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const sanitizedExt = ["png", "jpg", "jpeg", "webp"].includes(ext)
          ? ext
          : "jpg";
        const filePath = `backgrounds/bg-${Date.now()}.${sanitizedExt}`;

        const { error: uploadError } = await supabase.storage
          .from(this.COMPANY_BUCKET)
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          });

        if (!uploadError) {
          const { data } = supabase.storage
            .from(this.COMPANY_BUCKET)
            .getPublicUrl(filePath);

          if (data?.publicUrl) {
            return data.publicUrl;
          }
        } else {
          console.warn("Supabase background upload error, fallback to base64:", uploadError);
        }
      } catch (err) {
        console.warn("Supabase storage error:", err);
      }
    }

    // Fallback to Base64 data URL
    return this.fileToBase64(file);
  }

  /**
   * Upload Generated Invoice PDF to Supabase Storage
   */
  static async uploadInvoicePDF(
    invoiceId: string,
    pdfBlob: Blob,
  ): Promise<string | null> {
    if (isSupabaseConfigured) {
      try {
        const filePath = `pdf/${invoiceId}.pdf`;

        const { error } = await supabase.storage
          .from(this.INVOICES_BUCKET)
          .upload(filePath, pdfBlob, {
            upsert: true,
            contentType: "application/pdf",
          });

        if (!error) {
          const { data } = supabase.storage
            .from(this.INVOICES_BUCKET)
            .getPublicUrl(filePath);

          return data?.publicUrl || null;
        }
      } catch (err) {
        console.warn("Supabase PDF storage upload failed:", err);
      }
    }
    return null;
  }

  /**
   * Convert File to Base64
   */
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }
}
