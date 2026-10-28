import React from "react";
import { Voucher, Company } from "../../types/database";
import { formatSAR } from "../../lib/money";
import { numberToArabicWords } from "../../utils/numberToArabicWords";
import { printInvoice } from "../invoices/InvoicePDF";
import {
  Printer,
  X,
  Building2,
  Calendar,
  Hash,
  CreditCard,
  FileText,
  User,
  ShieldCheck,
} from "lucide-react";

interface VoucherPrintProps {
  voucher: Voucher;
  company?: Company;
  onClose: () => void;
}

export const VoucherPrint: React.FC<VoucherPrintProps> = ({
  voucher,
  company,
  onClose,
}) => {
  const comp: Company = company || {
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

  const isReceipt = voucher.type === "receipt";
  const tafqeet = numberToArabicWords(voucher.amount);

  const getPaymentMethodLabel = (mode: string) => {
    switch (mode) {
      case "cash":
        return "نقداً (Cash)";
      case "bank_transfer":
        return "تحويل بنكي (Bank Transfer)";
      case "cheque":
        return "شيك مصرفي (Cheque)";
      case "card":
        return "بطاقة مدى / ائتمان (Card)";
      default:
        return mode;
    }
  };

  const handlePrint = () => {
    printInvoice("voucher-document-render");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 my-auto max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl text-white font-black text-sm ${
                isReceipt ? "bg-emerald-600" : "bg-rose-600"
              }`}
            >
              {isReceipt ? "قبض" : "صرف"}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                معاينة {isReceipt ? "سند قبض مالي" : "سند صرف مالي"} — {voucher.voucher_number}
              </h3>
              <p className="text-[11px] text-slate-500">جاهز للطباعة المباشرة على ورقة واحدة A4</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Box */}
        <div className="p-4 sm:p-8 overflow-y-auto max-h-[82vh] bg-slate-100 flex justify-center">
          <div
            id="voucher-document-render"
            className="w-full max-w-[800px] bg-white p-8 sm:p-10 rounded-2xl border-2 border-slate-300 text-slate-900 shadow-md flex flex-col justify-between space-y-6"
            style={{
              fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
              minHeight: "680px",
            }}
          >
            {/* Header: Company Details & Logo */}
            <div className="flex items-center justify-between pb-5 border-b-2 border-slate-800">
              <div className="flex items-center gap-4">
                <img
                  src={comp.logo_url || "/logo.jpg"}
                  alt={comp.name_ar}
                  className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1"
                />
                <div>
                  <h1 className="font-black text-lg text-slate-900">{comp.name_ar}</h1>
                  <p className="text-xs text-slate-500 font-semibold">{comp.name_en}</p>
                  <div className="mt-1 flex items-center gap-4 text-xs text-slate-600">
                    <span>
                      س.ت: <strong className="font-mono">{comp.cr_number}</strong>
                    </span>
                    <span>
                      الرقم الضريبي:{" "}
                      <strong className="font-mono text-slate-900">{comp.vat_number}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Title & Badge */}
              <div className="text-center sm:text-end space-y-1">
                <div
                  className={`inline-block px-5 py-2 rounded-xl text-white font-black text-sm sm:text-base shadow-sm ${
                    isReceipt ? "bg-emerald-700" : "bg-rose-700"
                  }`}
                >
                  {isReceipt ? "سند قبض مالي (RECEIPT VOUCHER)" : "سند صرف مالي (PAYMENT VOUCHER)"}
                </div>
                <div className="flex items-center justify-end gap-2 text-xs text-slate-600 font-mono">
                  <span>الرقم: </span>
                  <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-300">
                    {voucher.voucher_number}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">التاريخ: {voucher.date}</div>
              </div>
            </div>

            {/* Amount Showcase Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">المبلغ بالأرقام:</span>
                <span className="font-mono font-black text-2xl text-slate-900 bg-white px-4 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                  {formatSAR(voucher.amount, "ar")}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 text-center sm:text-end">
                <span className="text-slate-500 font-normal">المبلغ كتابة: </span>
                <span className="text-emerald-900 font-black">{tafqeet}</span>
              </div>
            </div>

            {/* Voucher Body Details */}
            <div className="space-y-4 text-xs sm:text-sm leading-relaxed divide-y divide-slate-100">
              {/* Recipient / Payer */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-bold text-slate-700 w-48 shrink-0">
                  {isReceipt ? "استلمنا من المكرم / السادة:" : "سددنا للمكرم / السادة:"}
                </span>
                <span className="font-black text-slate-900 text-sm sm:text-base bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200 w-full">
                  {voucher.customer_name}
                </span>
              </div>

              {/* Payment Method */}
              <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-bold text-slate-700 w-48 shrink-0">طريقة السداد / الدفع:</span>
                <div className="flex flex-wrap items-center gap-3 w-full">
                  <span className="font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                    {getPaymentMethodLabel(voucher.payment_method)}
                  </span>
                  {voucher.reference_number && (
                    <span className="text-xs text-slate-600 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      رقم المرجع / الحوالة: <strong>{voucher.reference_number}</strong>
                    </span>
                  )}
                  {voucher.invoice_number && (
                    <span className="text-xs text-slate-600 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      مرتبط بالفاتورة: <strong>{voucher.invoice_number}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="pt-3 flex flex-col sm:flex-row items-start gap-2">
                <span className="font-bold text-slate-700 w-48 shrink-0">
                  وذلك لقاء (البيان والسبب):
                </span>
                <span className="font-semibold text-slate-900 bg-slate-50/60 p-3 rounded-xl border border-slate-200 w-full text-xs sm:text-sm">
                  {voucher.description}
                </span>
              </div>

              {/* Notes if any */}
              {voucher.notes && (
                <div className="pt-3 flex flex-col sm:flex-row items-start gap-2 text-xs">
                  <span className="font-bold text-slate-500 w-48 shrink-0">ملاحظات:</span>
                  <span className="text-slate-600 w-full">{voucher.notes}</span>
                </div>
              )}
            </div>

            {/* Official Bank Account Box */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-2">
              <span className="font-bold text-slate-900">
                الحساب المعتمد: {comp.bank_name_ar || "مصرف الراجحي"}
              </span>
              <span>
                رقم الحساب: <strong className="font-mono text-slate-900">{comp.bank_account_number || "695000010006086045924"}</strong>
              </span>
              <span>
                الآيبان (IBAN):{" "}
                <strong className="font-mono text-slate-900">{comp.iban || "SA2880000695608016045924"}</strong>
              </span>
            </div>

            {/* Official Signatures Row */}
            <div className="pt-8 border-t-2 border-slate-800 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">توقيع المستلم</span>
                <div className="border-b border-dashed border-slate-400 mx-4" />
                <span className="text-[11px] text-slate-400">التوقيع والاسم</span>
              </div>

              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">توقيع المحاسب</span>
                <div className="border-b border-dashed border-slate-400 mx-4" />
                <span className="text-[11px] text-slate-400">قسم الحسابات</span>
              </div>

              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">اعتماد الإدارة / الختم</span>
                <div className="border-b border-dashed border-slate-400 mx-4" />
                <span className="text-[11px] text-slate-400">شركة العز للمقاولات</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
