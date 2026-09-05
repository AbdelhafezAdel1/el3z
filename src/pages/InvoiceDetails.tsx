import React, { useEffect, useState } from "react";
import { InvoiceService } from "../services/invoiceService";
import { CompanyService } from "../services/companyService";
import {
  Invoice,
  Company,
  CompanySettings,
  InvoiceStatus,
} from "../types/database";
import { InvoicePreview } from "../components/invoices/InvoicePreview";
import {
  downloadInvoicePDF,
  printInvoice,
} from "../components/invoices/InvoicePDF";
import { StatusBadge } from "../components/common/StatusBadge";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { NavigationTab } from "../components/layout/Sidebar";
import {
  ArrowRight,
  Download,
  Printer,
  ShieldCheck,
  Send,
  Edit,
  CheckCircle2,
  Clock,
  Ban,
  FileCode,
  Copy,
  Hash,
  AlertCircle,
} from "lucide-react";

interface InvoiceDetailsProps {
  invoiceId: string;
  onNavigate: (tab: NavigationTab) => void;
  onEditInvoice?: (id: string) => void;
}

export const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  invoiceId,
  onNavigate,
  onEditInvoice,
}) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingZatca, setIsSubmittingZatca] = useState(false);
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { success, error, warning, info } = useToast();

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    setIsLoading(true);
    try {
      const [inv, comp, sett] = await Promise.all([
        InvoiceService.getInvoiceById(invoiceId),
        CompanyService.getCompany(),
        CompanyService.getSettings(),
      ]);

      if (!inv) {
        error("الفاتورة غير موجودة");
        onNavigate("invoice_history");
        return;
      }

      setInvoice(inv);
      setCompany(comp);
      setSettings(sett);
    } catch (err) {
      console.error("Error fetching invoice details:", err);
      error("تعذر جلب تفاصيل الفاتورة");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    info("جاري تجهيز وتوليد ملف PDF عالي الدقة...");
    const { success: ok } = await downloadInvoicePDF(invoice);
    if (ok) {
      success("تم تصدير وتحميل ملف الفاتورة بنجاح");
    } else {
      error("حدث خطأ أثناء تصدير ملف PDF");
    }
  };

  const handlePrint = () => {
    printInvoice("invoice-document-render");
  };

  const handleSubmitZatca = async () => {
    if (!invoice) return;
    setIsSubmittingZatca(true);
    try {
      const result = await InvoiceService.submitToZatca(invoice.id);
      if (result.success) {
        success(result.message);
        setInvoice(result.invoice);
      } else {
        error(result.message);
      }
    } catch (err: any) {
      error(err.message || "حدث خطأ أثناء الرفع للزكاة");
    } finally {
      setIsSubmittingZatca(false);
    }
  };

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return;
    try {
      const updated = await InvoiceService.updateInvoiceStatus(
        invoice.id,
        newStatus,
      );
      if (updated) {
        setInvoice(updated);
        success("تم تحديث حالة الفاتورة بنجاح");
      }
    } catch (err: any) {
      error(err.message || "تعذر تغيير حالة الفاتورة");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    setIsDeleting(true);
    try {
      await InvoiceService.deleteInvoice(invoice.id);
      success("تم حذف الفاتورة بنجاح");
      setShowDeleteConfirm(false);
      onNavigate("invoice_history");
    } catch (err: any) {
      error(err.message || "تعذر حذف الفاتورة");
      setIsDeleting(false);
    }
  };

  const handleDuplicateInvoice = async () => {
    if (!invoice) return;
    try {
      info("جاري نسخ الفاتورة كمسودة جديدة...");
      const copy = await InvoiceService.duplicateInvoice(invoice.id);
      success("تم نسخ الفاتورة كمسودة جديدة", `رقم الفاتورة: ${copy.invoice_number}`);
      if (onEditInvoice) {
        onEditInvoice(copy.id);
      } else {
        onNavigate("invoice_history");
      }
    } catch (err: any) {
      error(err.message || "تعذر نسخ الفاتورة");
    }
  };

  if (isLoading || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <span className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
        <p className="mt-3 text-xs text-slate-500 font-semibold">
          جاري تحميل الفاتورة...
        </p>
      </div>
    );
  }

  const isZatcaAccepted = invoice.zatca_status === "accepted";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumbs & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("invoice_history")}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="العودة لسجل الفواتير"
          >
            <ArrowRight className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 font-mono">
                {invoice.invoice_number}
              </h1>
              <StatusBadge status={invoice.status} type="invoice" />
              <StatusBadge zatcaStatus={invoice.zatca_status} type="zatca" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              تاريخ الإصدار:{" "}
              <span className="font-mono">{invoice.issue_date}</span> | العميل:{" "}
              <span className="font-semibold text-slate-800">
                {invoice.customer?.name_ar || invoice.customer?.company_name}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Button */}
          {!isZatcaAccepted && onEditInvoice && (
            <button
              onClick={() => onEditInvoice(invoice.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors"
              title="تعديل بيانات وبنود الفاتورة"
            >
              <Edit className="w-4 h-4 text-blue-600" />
              <span>تعديل</span>
            </button>
          )}

          {/* Duplicate Button */}
          <button
            onClick={handleDuplicateInvoice}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 font-bold text-xs transition-colors"
            title="نسخ الفاتورة كمسودة جديدة"
          >
            <Copy className="w-4 h-4 text-violet-600" />
            <span>نسخ كمسودة</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
            title="طباعة الفاتورة بمقاس A4"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>طباعة</span>
          </button>

          {/* Save PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
            title="حفظ وتصدير الفاتورة كملف PDF"
          >
            <Download className="w-4 h-4" />
            <span>حفظ PDF</span>
          </button>

          {/* Submit to ZATCA Button */}
          <button
            disabled={isSubmittingZatca || isZatcaAccepted}
            onClick={handleSubmitZatca}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all ${
              isZatcaAccepted
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 opacity-90 cursor-default"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isZatcaAccepted
                ? "معتمدة بالزكاة"
                : isSubmittingZatca
                  ? "جاري الرفع..."
                  : "رفع للزكاة والضريبة"}
            </span>
          </button>

          {/* Delete Button */}
          {!isZatcaAccepted && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs transition-colors"
              title="حذف الفاتورة نهائياً"
            >
              <Ban className="w-4 h-4 text-rose-600" />
              <span>حذف</span>
            </button>
          )}

          {/* Status Dropdown */}
          <select
            value={invoice.status}
            onChange={(e) =>
              handleStatusChange(e.target.value as InvoiceStatus)
            }
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:border-emerald-500 cursor-pointer"
          >
            <option value="draft">مسودة (Draft)</option>
            <option value="issued">مصدرة (Issued)</option>
            <option value="paid">مدفوعة (Paid)</option>
            <option value="partially_paid">مدفوعة جزئياً (Partial)</option>
            <option value="unpaid">غير مدفوعة (Unpaid)</option>
            <option value="cancelled">إلغاء الفاتورة (Cancelled)</option>
          </select>
        </div>
      </div>

      {/* ZATCA Audit Banner */}
      {isZatcaAccepted && (
        <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">
                تم اعتماد الفاتورة رسمياً لدى هيئة الزكاة والضريبة والجمارك
                (ZATCA)
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5 font-mono">
                Hash: {invoice.invoice_hash || "SHA-256 Verified"}
              </p>
            </div>
          </div>
          {invoice.ubl_xml && (
            <button
              onClick={() => setShowXmlModal(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-center"
            >
              <FileCode className="w-4 h-4" />
              <span>عرض مستند XML (UBL 2.1)</span>
            </button>
          )}
        </div>
      )}

      {/* Interactive A4 Invoice Canvas */}
      <div className="flex justify-center p-2 sm:p-6 bg-slate-200/60 rounded-3xl border border-slate-300/60 overflow-x-auto shadow-inner">
        <InvoicePreview
          invoice={invoice}
          company={company || undefined}
          settings={settings || undefined}
        />
      </div>

      {/* XML Modal */}
      {showXmlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-600" />
                ملف الفاتورة الإلكترونية المعياري (ZATCA UBL 2.1 XML)
              </h3>
              <button
                onClick={() => setShowXmlModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-xl">
              <pre className="whitespace-pre-wrap">{invoice.ubl_xml}</pre>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowXmlModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="حذف الفاتورة نهائياً"
        message={`هل أنت متأكد من رغبتك في حذف الفاتورة ${invoice.invoice_number} بصورة نهائية؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، احذف الفاتورة"
        cancelText="إلغاء"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteInvoice}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
