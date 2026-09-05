import React, { useEffect, useState, useMemo } from "react";
import { InvoiceService } from "../services/invoiceService";
import { CompanyService } from "../services/companyService";
import { ZatcaService, ZatcaValidationResult, ZatcaSubmissionResult } from "../integrations/zatca";
import { Invoice, CompanySettings, ZatcaSubmission } from "../types/database";
import { StatusBadge } from "../components/common/StatusBadge";
import { CurrencyDisplay } from "../components/common/CurrencyDisplay";
import { useToast } from "../contexts/ToastContext";
import { LocalStore } from "../services/storage/localStore";
import {
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileCode,
  CheckSquare,
  Square,
  Sparkles,
  RefreshCw,
  Hash,
  Terminal,
  ExternalLink,
  Eye,
  AlertTriangle,
  QrCode,
  Copy,
  X,
  Shield,
  Layers,
} from "lucide-react";

export const ZatcaHub: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [submissions, setSubmissions] = useState<ZatcaSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "logs">("pending");

  // Inspection Modal State
  const [inspectingInvoice, setInspectingInvoice] = useState<Invoice | null>(null);
  const [validationResult, setValidationResult] = useState<ZatcaValidationResult | null>(null);
  const [generatedXml, setGeneratedXml] = useState<string>("");
  const [generatedHash, setGeneratedHash] = useState<string>("");
  const [generatedQr, setGeneratedQr] = useState<string>("");
  const [submissionResponse, setSubmissionResponse] = useState<ZatcaSubmissionResult | null>(null);
  const [inspectModalTab, setInspectModalTab] = useState<"validation" | "xml" | "hash_qr" | "response">("validation");

  const { success, error, warning, info } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [invList, settData] = await Promise.all([
        InvoiceService.getInvoices(),
        CompanyService.getSettings(),
      ]);
      setInvoices(invList);
      setSettings(settData);
      setSubmissions(LocalStore.getSubmissions());
    } catch (err) {
      console.error("Error loading ZATCA hub data:", err);
      error("تعذر تحميل بيانات منصة الزكاة");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    const unsubmittedInvoices = invoices.filter(
      (i) => i.zatca_status !== "accepted",
    );
    if (selectedIds.length === unsubmittedInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unsubmittedInvoices.map((i) => i.id));
    }
  };

  const toggleSelectInvoice = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Inspect invoice validation & generated artifacts
  const handleInspectInvoice = async (invoice: Invoice) => {
    setInspectingInvoice(invoice);
    const val = ZatcaService.validateInvoice(invoice);
    setValidationResult(val);

    const xml = ZatcaService.generateInvoiceXML(invoice);
    setGeneratedXml(xml);

    const hash = await ZatcaService.generateInvoiceHash(xml);
    setGeneratedHash(hash);

    const sellerName = invoice.company?.name_ar || "شركة العز للمقاولات";
    const vatNumber = invoice.company?.vat_number || "310123456700003";
    const timestamp = invoice.issue_date && invoice.issue_time
      ? `${invoice.issue_date}T${invoice.issue_time}`
      : new Date().toISOString();
    const totalAmount = (invoice.grand_total || 0).toFixed(2);
    const vatAmount = (invoice.vat_amount || 0).toFixed(2);

    const qr = await ZatcaService.generateQRCode({
      sellerName,
      vatNumber,
      timestamp,
      totalAmount,
      vatAmount,
      invoiceHash: hash,
    });
    setGeneratedQr(qr.qrDataUrl);

    setSubmissionResponse(null);
    setInspectModalTab(val.isValid ? "xml" : "validation");
  };

  // Submit Single Invoice
  const handleSubmitSingle = async (invoice: Invoice) => {
    setIsSubmitting(true);
    info("جاري معالجة وتوثيق الفاتورة وفق متطلبات هيئة الزكاة والضريبة...");
    try {
      const env = settings?.zatca_environment || "sandbox";
      const result = await ZatcaService.submitInvoice(invoice, { environment: env });
      setSubmissionResponse(result);

      if (result.success) {
        success(`تمت معالجة الفاتورة بنجاح: ${result.reportingStatus || "معتمدة"}`);
      } else {
        error(result.errorMessage || "تعذر اعتماد الفاتورة لدى هيئة الزكاة");
      }
      await loadData();
    } catch (err: any) {
      error(err.message || "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Submission
  const handleBatchSubmit = async () => {
    if (selectedIds.length === 0) {
      warning("يرجى تحديد فاتورة واحدة على الأقل للرفع");
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    const env = settings?.zatca_environment || "sandbox";

    for (const invId of selectedIds) {
      const inv = invoices.find((i) => i.id === invId);
      if (!inv) continue;
      try {
        const result = await ZatcaService.submitInvoice(inv, { environment: env });
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsSubmitting(false);
    setSelectedIds([]);
    await loadData();

    if (successCount > 0) {
      success(`تم توثيق واعتماد ${successCount} فاتورة لدى هيئة الزكاة والضريبة بنجاح`);
    }
    if (failCount > 0) {
      error(`تعذر اعتماد ${failCount} فاتورة (تحقق من بيانات الرقم الضريبي والبنود)`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    success(`تم نسخ ${label} إلى الحافظة`);
  };

  const unsubmittedList = invoices.filter((i) => i.zatca_status !== "accepted");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zatca-gold/20 text-zatca-gold text-xs font-bold mb-3 border border-zatca-gold/30">
              <ShieldCheck className="w-4 h-4" />
              منصة التكامل والربط مع هيئة الزكاة والضريبة والجمارك (ZATCA Integration Hub)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              توثيق الفواتير والامتثال الضريبي (Phase 1 & Phase 2)
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              توليد ملفات XML UBL 2.1 القياسية، وبصمة SHA-256 المشفرة، والباركود التفاعلي (TLV QR)، وتوثيق المعاملات عبر خوادم الزكاة.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-2xl bg-white/10 text-emerald-300 text-xs font-mono font-bold border border-white/15 backdrop-blur-sm">
              بيئة التشغيل:{" "}
              {settings?.zatca_environment === "production"
                ? "الإنتاج المباشر (Production Live)"
                : "بيئة المحاكاة والاختبار (Sandbox Simulation)"}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "pending"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>الفواتير بانتظار الرفع ({unsubmittedList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "logs"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>سجل إرساليات الزكاة ({submissions.length})</span>
        </button>
      </div>

      {activeTab === "pending" && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900"
              >
                {selectedIds.length > 0 &&
                selectedIds.length === unsubmittedList.length ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>تحديد الكل ({unsubmittedList.length})</span>
              </button>
              {selectedIds.length > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  تم تحديد {selectedIds.length} فاتورة
                </span>
              )}
            </div>

            {/* Arabic Action Button Required */}
            <button
              disabled={isSubmitting || selectedIds.length === 0}
              onClick={handleBatchSubmit}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الرفع للزكاة والضريبة...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>رفع للزكاة والضريبة</span>
                </>
              )}
            </button>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4 text-start">رقم الفاتورة</th>
                    <th className="py-3 px-4 text-start">العميل</th>
                    <th className="py-3 px-4 text-start">النوع</th>
                    <th className="py-3 px-4 text-start">تاريخ الإصدار</th>
                    <th className="py-3 px-4 text-end">المبلغ الخاضع</th>
                    <th className="py-3 px-4 text-end">الضريبة 15%</th>
                    <th className="py-3 px-4 text-end">الإجمالي</th>
                    <th className="py-3 px-4 text-center">حالة الزكاة</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unsubmittedList.map((inv) => {
                    const isSelected = selectedIds.includes(inv.id);

                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? "bg-emerald-50/60" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <button onClick={() => toggleSelectInvoice(inv.id)}>
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {inv.customer?.name_ar || inv.customer?.company_name || "عميل نقدي"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {inv.invoice_type === "simplified_tax_invoice" ? "مبسطة (B2C)" : "قياسية (B2B)"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {inv.issue_date}
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono">
                          <CurrencyDisplay amount={inv.taxable_amount || inv.subtotal} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono text-blue-700">
                          <CurrencyDisplay amount={inv.vat_amount} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono font-bold text-slate-900">
                          <CurrencyDisplay amount={inv.grand_total} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge zatcaStatus={inv.zatca_status} type="zatca" />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleInspectInvoice(inv)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                              title="فحص وتحقق من الفاتورة وXML"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>فحص</span>
                            </button>
                            <button
                              onClick={() => handleSubmitSingle(inv)}
                              disabled={isSubmitting}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>رفع للزكاة والضريبة</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {unsubmittedList.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 text-sm">
                        🎉 كافة الفواتير معتمدة ومرفوعة لدى هيئة الزكاة والضريبة والجمارك!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Log Tab */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">
              سجل استجابات ومعاملات هيئة الزكاة والضريبة (ZATCA Submissions Audit)
            </h3>
            <p className="text-xs text-slate-500">
              تتبع استجابات الـ API والمعرفات الموحدة UUID لعمليات الربط
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">معرف العملية (UUID)</th>
                  <th className="py-3 px-4 text-start">بيئة التشغيل</th>
                  <th className="py-3 px-4 text-start">وقت الرفع</th>
                  <th className="py-3 px-4 text-center">حالة الاستجابة</th>
                  <th className="py-3 px-4 text-start">تفاصيل النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-800 font-bold">
                      {sub.submission_uuid}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {sub.environment}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {new Date(sub.submitted_at).toLocaleString("ar-SA-u-nu-latn")}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge zatcaStatus={sub.zatca_status} type="zatca" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {sub.error_message ? (
                        <span className="text-rose-600 font-medium">
                          {sub.error_message}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">
                          تم التحقق والاعتماد بنجاح
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      لا توجد عمليات رفع مسجلة بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspection & Details Modal */}
      {inspectingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  فحص الفاتورة والامتثال الزكوي ({inspectingInvoice.invoice_number})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  معاينة بنود التحقق، ملف XML UBL 2.1، وبصمة التشفير ورمز QR
                </p>
              </div>
              <button
                onClick={() => setInspectingInvoice(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setInspectModalTab("validation")}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
                  inspectModalTab === "validation"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-500"
                }`}
              >
                نتائج التحقق ({validationResult?.errors.length || 0} أخطاء)
              </button>
              <button
                onClick={() => setInspectModalTab("xml")}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
                  inspectModalTab === "xml"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-500"
                }`}
              >
                ملف UBL 2.1 XML
              </button>
              <button
                onClick={() => setInspectModalTab("hash_qr")}
                className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
                  inspectModalTab === "hash_qr"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-500"
                }`}
              >
                بصمة SHA-256 ورمز QR
              </button>
              {submissionResponse && (
                <button
                  onClick={() => setInspectModalTab("response")}
                  className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
                    inspectModalTab === "response"
                      ? "border-emerald-600 text-emerald-800"
                      : "border-transparent text-slate-500"
                  }`}
                >
                  استجابة الخادم (Response)
                </button>
              )}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {inspectModalTab === "validation" && (
                <div className="space-y-4">
                  {validationResult?.isValid ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-emerald-900">
                          الفاتورة متوافقة تماماً مع معايير ومتطلبات هيئة الزكاة والضريبة (Phase 1 & 2)
                        </h4>
                        <p className="text-[11px] text-emerald-800 mt-1">
                          كافة البيانات المطلوبة (الرقم الضريبي للمورد، البنود، الحسابات، وقيمة الضريبة 15%) مكتملة وصحيحة.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-rose-900">
                          توجد أخطاء تمنع اعتماد الفاتورة لدى هيئة الزكاة:
                        </h4>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-rose-800">
                          {validationResult?.errors.map((err, idx) => (
                            <li key={idx}>
                              <span className="font-mono font-bold">[{err.code}]</span> {err.messageAr}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {validationResult?.warnings && validationResult.warnings.length > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-amber-900">ملاحظات وتنبيهات غير حرجة:</h4>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-amber-800">
                          {validationResult.warnings.map((w, idx) => (
                            <li key={idx}>
                              <span className="font-mono font-bold">[{w.code}]</span> {w.messageAr}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {inspectModalTab === "xml" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">كود XML المعياري (UBL 2.1 Structure)</span>
                    <button
                      onClick={() => copyToClipboard(generatedXml, "ملف XML")}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ XML</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto max-h-80 leading-relaxed text-left" dir="ltr">
                    {generatedXml}
                  </pre>
                </div>
              )}

              {inspectModalTab === "hash_qr" && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700">بصمة التشفير (SHA-256 Invoice Hash)</span>
                      <button
                        onClick={() => copyToClipboard(generatedHash, "بصمة التشفير")}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ البصمة</span>
                      </button>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs font-bold text-slate-800 break-all text-left" dir="ltr">
                      {generatedHash}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    {generatedQr && (
                      <img
                        src={generatedQr}
                        alt="ZATCA TLV QR Code"
                        className="w-32 h-32 rounded-xl border border-slate-300 bg-white p-2 shadow-sm shrink-0"
                      />
                    )}
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">رمز الاستجابة السريعة المعتمد (TLV Base64 QR)</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        يحتوي على اسم المورد، الرقم الضريبي، التاريخ والوقت، إجمالي الفاتورة، وقيمة الضريبة المشفرة وفق اشتراطات هيئة الزكاة.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {inspectModalTab === "response" && submissionResponse && (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">معرف الإرسالية:</span>
                      <span className="font-mono text-slate-900">{submissionResponse.submissionId}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">حالة الاعتماد:</span>
                      <span className="font-mono text-emerald-800">{submissionResponse.reportingStatus}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">بيئة التشغيل:</span>
                      <span className="font-mono text-slate-800">{submissionResponse.environment}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={() => setInspectingInvoice(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl"
              >
                إغلاق
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  handleSubmitSingle(inspectingInvoice);
                  setInspectModalTab("response");
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>رفع للزكاة والضريبة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
