import React, { useEffect, useState } from "react";
import {
  Invoice,
  Company,
  CompanySettings,
} from "../../types/database";
import { formatSAR } from "../../lib/money";
import { generateQrDataUrl } from "../../integrations/zatca/qr";
import {
  Building2,
  Calendar,
  Hash,
} from "lucide-react";

interface InvoicePreviewProps {
  invoice: Invoice;
  company?: Company;
  settings?: CompanySettings;
  backgroundUrl?: string;
  className?: string;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  company,
  settings,
  backgroundUrl,
  className = "",
}) => {
  const comp: Company = company ||
    invoice.company || {
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
      iban: "SA2880000695608016045924",
      bank_account_number: "695000010006086045924",
      bank_name_ar: "مصرف الراجحي",
      bank_name_en: "Al Rajhi Bank",
      logo_url: "/logo.jpg",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

  const bgImage =
    backgroundUrl !== undefined
      ? backgroundUrl
      : (settings?.invoice_background_url || "/images/invoice-bg.jpg");

  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Generate ZATCA-compliant QR in real-time from available invoice data
  useEffect(() => {
    let cancelled = false;

    const generateQr = async () => {
      // If invoice already has saved QR data, use it directly
      if (invoice.qr_code_data) {
        const url = await generateQrDataUrl(invoice.qr_code_data);
        if (!cancelled) setQrDataUrl(url);
        return;
      }

      // Otherwise generate live from available invoice fields (during preview/creation)
      const sellerName = comp.name_ar || "شركة العز للمقاولات";
      const vatNumber = comp.vat_number;
      const totalAmount = (Number(invoice.grand_total) || 0).toFixed(2);
      const vatAmount = (Number(invoice.vat_amount) || 0).toFixed(2);

      // Only generate if we have minimum required ZATCA fields
      if (!vatNumber || vatNumber === "300000000000003" || Number(totalAmount) === 0) return;

      // Build TLV Base64 inline (Tags 1-5 per ZATCA Phase 1 spec)
      const encoder = new TextEncoder();
      const makeTlv = (tag: number, value: string): Uint8Array => {
        const valueBytes = encoder.encode(value);
        const tlv = new Uint8Array(2 + valueBytes.length);
        tlv[0] = tag;
        tlv[1] = valueBytes.length;
        tlv.set(valueBytes, 2);
        return tlv;
      };

      const timestamp = invoice.issue_date
        ? `${invoice.issue_date}T${invoice.issue_time || "00:00:00"}`
        : new Date().toISOString();

      const tags = [
        makeTlv(1, sellerName),
        makeTlv(2, vatNumber),
        makeTlv(3, timestamp),
        makeTlv(4, totalAmount),
        makeTlv(5, vatAmount),
      ];

      const total = tags.reduce((s, t) => s + t.length, 0);
      const combined = new Uint8Array(total);
      let offset = 0;
      for (const t of tags) { combined.set(t, offset); offset += t.length; }

      let binary = "";
      for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i]);
      const tlvBase64 = btoa(binary);

      const url = await generateQrDataUrl(tlvBase64);
      if (!cancelled) setQrDataUrl(url);
    };

    generateQr();
    return () => { cancelled = true; };
  }, [
    invoice.qr_code_data,
    invoice.grand_total,
    invoice.vat_amount,
    invoice.issue_date,
    invoice.issue_time,
    comp.name_ar,
    comp.vat_number,
  ]);

  const isSimplified = invoice.invoice_type === "simplified_tax_invoice";

  const getPaymentMethodName = (method?: string) => {
    switch (method) {
      case "cash":
        return "نقداً (Cash)";
      case "credit_card":
        return "بطاقة ائتمان / مدى (Card)";
      case "cheque":
        return "شيك مصرفي (Cheque)";
      case "bank_transfer":
      default:
        return "تحويل بنكي (Bank Transfer)";
    }
  };

  return (
    <div
      id="invoice-document-render"
      className={`relative w-full max-w-[840px] min-h-[1188px] bg-white text-slate-800 shadow-xl rounded-2xl border border-slate-200 text-xs sm:text-[13px] flex flex-col justify-between ${
        bgImage ? "px-8 sm:px-12 pt-28 pb-10" : "p-6 sm:p-9"
      } ${className}`}
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      {/* Watermark Logo in the middle of the invoice */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <img
          src={comp.logo_url || "/logo.jpg"}
          alt="Watermark Logo"
          className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] object-contain opacity-[0.09] select-none"
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* TOP SECTION */}
        <div>
          {/* Header Layout: Right = Company Info, Center = QR Code, Left = Invoice Badge & Number */}
          {!bgImage ? (
            <div className="flex flex-col sm:flex-row items-center justify-between pb-3.5 border-b-2 border-slate-800 gap-4 text-center sm:text-start">
              {/* Right: Company Info & Logo */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-start">
                <img
                  src={comp.logo_url || "/logo.jpg"}
                  alt={comp.name_ar}
                  className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1 bg-white shadow-xs mx-auto sm:mx-0"
                />
                <div className="text-center sm:text-start">
                  <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                    {comp.name_ar}
                  </h1>
                  <p className="text-xs text-slate-500 font-semibold tracking-wide mt-0.5">
                    {comp.name_en}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-0.5 text-xs text-slate-600">
                    <p>
                      <span className="font-bold text-slate-800">س.ت: </span>
                      <span className="font-mono">{comp.cr_number}</span>
                    </p>
                    <p>
                      <span className="font-bold text-slate-800">الرقم الضريبي: </span>
                      <span className="font-mono text-slate-900 font-bold">
                        {comp.vat_number}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Center: ZATCA QR Code */}
              <div className="p-1.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="ZATCA QR Code"
                    className="w-22 h-22 sm:w-24 sm:h-24 object-contain"
                  />
                ) : (
                  <div className="w-22 h-22 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                    رمز QR
                  </div>
                )}
              </div>

              {/* Left: Document Title Badge & Invoice Number — Centered in their box */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-full max-w-[210px] flex flex-col items-center justify-center gap-1.5 text-center mx-auto">
                  <div className="w-full bg-slate-900 text-white py-1.5 px-3 rounded-xl font-black text-xs sm:text-sm shadow-sm text-center flex items-center justify-center">
                    <span>{isSimplified ? "فاتورة ضريبية مبسطة" : "فاتورة ضريبية"}</span>
                  </div>
                  <div className="w-full bg-slate-100 text-slate-900 py-1.5 px-3 rounded-lg border border-slate-300 font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs text-center">
                    <Hash className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                    <span>{invoice.invoice_number || "INV-2026-XXXXXX"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* When official letterhead background is used */
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center pb-3 border-b-2 border-slate-800 gap-3 text-center">
              {/* Right Column: VAT & CR */}
              <div className="text-center sm:text-start space-y-0.5">
                <p className="text-xs sm:text-sm text-slate-800 font-bold">
                  الرقم الضريبي: <span className="font-mono text-slate-900">{comp.vat_number}</span>
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  س.ت: {comp.cr_number}
                </p>
              </div>

              {/* Center Column: QR */}
              <div className="flex justify-center">
                <div className="p-1 bg-white rounded-xl border border-slate-200 shadow-xs inline-flex items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="ZATCA QR Code"
                      className="w-20 h-20 sm:w-22 sm:h-22 object-contain"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                      QR
                    </div>
                  )}
                </div>
              </div>

              {/* Left Column: Centered Document Title Badge & Invoice Number in their dedicated section */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-full max-w-[210px] flex flex-col items-center justify-center gap-1.5 text-center mx-auto">
                  <div className="w-full bg-slate-900 text-white py-1.5 px-3 rounded-xl font-black text-xs sm:text-sm shadow-sm text-center flex items-center justify-center">
                    <span>{isSimplified ? "فاتورة ضريبية مبسطة" : "فاتورة ضريبية"}</span>
                  </div>
                  <div className="w-full bg-slate-100 text-slate-900 py-1.5 px-3 rounded-lg border border-slate-300 font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs text-center">
                    <Hash className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                    <span>{invoice.invoice_number || "INV-2026-XXXXXX"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* METADATA GRID: Customer Info & Invoice Dates — Centered within each div */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-3 sm:my-4 p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200 text-center">
            {/* Customer Details Box */}
            <div className="space-y-2 text-xs sm:text-[13px] flex flex-col items-center justify-center text-center p-2 rounded-xl bg-white/70 border border-slate-100">
              <div className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide flex items-center justify-center gap-1.5 pb-1 border-b border-slate-200 w-full">
                <Building2 className="w-4 h-4 text-slate-800" />
                <span>بيانات العميل (CUSTOMER DETAILS)</span>
              </div>
              <p className="font-bold text-sm sm:text-base text-slate-900">
                {invoice.customer?.name_ar ||
                  invoice.customer?.company_name ||
                  "عبدالحافظ"}
              </p>
              {invoice.customer?.name_en && (
                <p className="text-xs text-slate-500 font-medium">
                  {invoice.customer.name_en}
                </p>
              )}
              {invoice.customer?.vat_number && (
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-800">الرقم الضريبي: </span>
                  <span className="font-mono font-bold text-slate-900">
                    {invoice.customer.vat_number}
                  </span>
                </p>
              )}
              {invoice.customer?.cr_number && (
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-800">السجل التجاري: </span>
                  <span className="font-mono">{invoice.customer.cr_number}</span>
                </p>
              )}
              {invoice.customer?.city && (
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-800">العنوان: </span>
                  {invoice.customer.street ? `${invoice.customer.street}، ` : ""}
                  {invoice.customer.district ? `${invoice.customer.district}، ` : ""}
                  {invoice.customer.city}
                </p>
              )}
              {invoice.customer?.phone && (
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-800">الهاتف: </span>
                  <span className="font-mono">{invoice.customer.phone}</span>
                </p>
              )}
            </div>

            {/* Invoice Dates & Payment Box */}
            <div className="space-y-2 text-xs sm:text-[13px] flex flex-col items-center justify-center text-center p-2 rounded-xl bg-white/70 border border-slate-100">
              <div className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide flex items-center justify-center gap-1.5 pb-1 border-b border-slate-200 w-full">
                <Calendar className="w-4 h-4 text-slate-800" />
                <span>معلومات وتواريخ الفاتورة</span>
              </div>
              <p className="text-slate-700">
                <span className="font-semibold text-slate-800">تاريخ الإصدار (Issue Date): </span>
                <span className="font-mono font-bold text-slate-900">
                  {invoice.issue_date || new Date().toISOString().split("T")[0]}
                </span>
              </p>
              {invoice.supply_date && (
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-800">تاريخ التوريد (Supply Date): </span>
                  <span className="font-mono">{invoice.supply_date}</span>
                </p>
              )}
              {invoice.due_date && (
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-800">تاريخ الاستحقاق (Due Date): </span>
                  <span className="font-mono">{invoice.due_date}</span>
                </p>
              )}
              <p className="text-slate-700">
                <span className="font-semibold text-slate-800">طريقة الدفع: </span>
                <span className="font-bold text-slate-900">
                  {getPaymentMethodName(invoice.payment_method)}
                </span>
              </p>
              {invoice.payment_terms && (
                <p className="text-slate-500 text-xs">
                  <span className="font-semibold text-slate-800">الشروط: </span>
                  <span>{invoice.payment_terms}</span>
                </p>
              )}
            </div>
          </div>

          {/* LINE ITEMS TABLE — Centered headers and cells */}
          <div className="rounded-2xl border border-slate-200 shadow-xs mb-3 sm:mb-4 bg-white/90 overflow-visible">
            <table className="w-full text-xs sm:text-[13px]">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-2.5 px-2 text-center">#</th>
                  <th className="py-2.5 px-3 text-center">
                    الخدمة / البند (Description)
                  </th>
                  <th className="py-2.5 px-2 text-center">الكمية (Qty)</th>
                  <th className="py-2.5 px-2 text-center">سعر الوحدة</th>
                  <th className="py-2.5 px-2 text-center">الخاضع للضريبة</th>
                  <th className="py-2.5 px-2 text-center">الضريبة</th>
                  <th className="py-2.5 px-2 text-center">مبلغ الضريبة</th>
                  <th className="py-2.5 px-3 text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white/80">
                {(invoice.items && invoice.items.length > 0
                  ? invoice.items
                  : []
                ).map((item, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-white/80" : "bg-slate-50/70"}
                  >
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      <div>{item.description_ar}</div>
                      {item.description_en && (
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {item.description_en}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      {formatSAR(item.unit_price, "ar")}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      {formatSAR(item.taxable_amount, "ar")}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">
                      {item.vat_rate}%
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-800">
                      {formatSAR(item.vat_amount, "ar")}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-black text-slate-950">
                      {formatSAR(item.line_total, "ar")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTTOM SECTION: Left = Financial Totals, Right = Compact Notes, Below = Bank Strip */}
        <div className="pt-3 sm:pt-3.5 border-t-2 border-slate-800 mt-3 sm:mt-4">
          {/* Row 1: Totals strictly on the LEFT, Notes on the RIGHT */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-5 items-start">
            {/* Notes Column (Right in RTL - sm:col-span-5) */}
            <div className="sm:col-span-5 space-y-2.5 order-2 sm:order-1 text-start">
              {/* Notes — Only display what user writes */}
              {invoice.notes && invoice.notes.trim() !== "" && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs sm:text-[12.5px] leading-relaxed text-slate-700 shadow-2xs">
                  <div className="font-bold text-amber-900 pb-1 border-b border-amber-200/60 mb-1.5 flex items-center gap-1.5">
                    <span>ملاحظات الفاتورة</span>
                  </div>
                  <p className="whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}

              {invoice.payment_terms && invoice.payment_terms.trim() !== "" && (
                <div className="p-2.5 px-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs text-slate-700">
                  <span className="font-bold text-slate-900">شروط الدفع: </span>
                  <span>{invoice.payment_terms}</span>
                </div>
              )}
            </div>

            {/* Totals Column (Left in RTL - sm:col-span-7) — Enlarged to fill space prominently */}
            <div className="sm:col-span-7 order-1 sm:order-2">
              <div className="bg-slate-50/95 rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">المجموع الفرعي (Subtotal):</span>
                  <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">{formatSAR(invoice.subtotal || 0, "ar")}</span>
                </div>
                {Number(invoice.discount_amount) > 0 && (
                  <div className="flex items-center justify-between text-rose-600 font-bold">
                    <span>إجمالي الخصم (Discount):</span>
                    <span className="font-mono text-sm sm:text-base">-{formatSAR(invoice.discount_amount, "ar")}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-medium">الخاضع للضريبة (Taxable):</span>
                  <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">{formatSAR(invoice.taxable_amount || invoice.subtotal || 0, "ar")}</span>
                </div>
                <div className="flex items-center justify-between text-slate-800 font-semibold">
                  <span>ضريبة القيمة المضافة (15% VAT):</span>
                  <span className="font-mono font-black text-emerald-800 text-sm sm:text-base">+{formatSAR(invoice.vat_amount || 0, "ar")}</span>
                </div>

                {/* Grand Total Box — Enlarged, highlighted, filling page space */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="bg-slate-900 text-white rounded-xl p-3 sm:p-3.5 px-4 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-black text-sm sm:text-base tracking-wide">
                        المجموع الكلي:
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-300 font-normal">
                        Grand Total (Incl. VAT)
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                        {formatSAR(invoice.grand_total || 0, "ar")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Separate Bank Info Section under the Total with Account & IBAN Side-by-Side */}
          <div className="mt-3 p-2.5 px-4 bg-slate-50/90 rounded-xl border border-slate-200 text-xs sm:text-[12px] flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-slate-700 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>بيانات الحساب البنكي ({comp.bank_name_ar || "مصرف الراجحي"}):</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 sm:gap-x-6 gap-y-1">
              <div>
                <span className="text-slate-500 font-medium">رقم الحساب: </span>
                <span className="font-mono font-bold text-slate-900 select-all tracking-wider text-xs sm:text-[13px]">
                  {comp.bank_account_number || "695000010006086045924"}
                </span>
              </div>
              <span className="hidden sm:inline text-slate-300 font-bold">|</span>
              <div>
                <span className="text-slate-500 font-medium">الآيبان (IBAN): </span>
                <span className="font-mono font-bold text-slate-900 select-all tracking-wider text-xs sm:text-[13px]">
                  {comp.iban || "SA2880000695608016045924"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
