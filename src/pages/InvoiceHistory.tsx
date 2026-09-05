import React, { useEffect, useState, useMemo, useCallback } from "react";
import { InvoiceService } from "../services/invoiceService";
import { CustomerService } from "../services/customerService";
import { Invoice, InvoiceStatus, ZatcaStatus, Customer } from "../types/database";
import { CurrencyDisplay } from "../components/common/CurrencyDisplay";
import { StatusBadge } from "../components/common/StatusBadge";
import { downloadInvoicePDF, printInvoice } from "../components/invoices/InvoicePDF";
import { InvoicePreview } from "../components/invoices/InvoicePreview";
import { useToast } from "../contexts/ToastContext";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { EmptyState } from "../components/common/EmptyState";
import { NavigationTab } from "../components/layout/Sidebar";
import {
  History,
  Search,
  Download,
  Printer,
  Eye,
  Trash2,
  ShieldCheck,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Building2,
  Copy,
  Edit,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  FileText,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  Lock,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────── */
interface InvoiceHistoryProps {
  onNavigate: (tab: NavigationTab) => void;
  onViewInvoice: (id: string) => void;
  onEditInvoice?: (id: string) => void;
}

type SortField = "invoice_number" | "issue_date" | "grand_total" | "customer" | "status" | "zatca_status";
type SortDir = "asc" | "desc";

interface ConfirmState {
  type: "delete" | "cancel" | "duplicate" | "zatca" | null;
  invoice: Invoice | null;
  isLoading: boolean;
}

/* ─── Status rule helpers ─────────────────────────────── */
const canEdit = (inv: Invoice) => inv.zatca_status !== "accepted";
const canDelete = (inv: Invoice) => inv.zatca_status !== "accepted";
const canCancel = (inv: Invoice) =>
  inv.status !== "cancelled" && inv.zatca_status !== "accepted";
const canSubmitZatca = (inv: Invoice) => inv.zatca_status !== "accepted";

/* ─── Inline Mini PDF Preview Modal ─────────────────── */
const InlinePdfModal: React.FC<{
  invoice: Invoice;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
}> = ({ invoice, onClose, onDownload, onPrint }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
    <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              معاينة الفاتورة — {invoice.invoice_number}
            </h3>
            <p className="text-[11px] text-slate-500">
              {invoice.customer?.name_ar || "عميل نقدي"} · {invoice.issue_date}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>حفظ PDF</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] bg-slate-50/50">
        <div className="flex justify-center">
          <InvoicePreview invoice={invoice} />
        </div>
      </div>
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────── */
export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({
  onNavigate,
  onViewInvoice,
  onEditInvoice,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* Filters */
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [zatcaFilter, setZatcaFilter] = useState<"all" | ZatcaStatus>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* Sorting */
  const [sortField, setSortField] = useState<SortField>("issue_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* Pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* Modals */
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({
    type: null,
    invoice: null,
    isLoading: false,
  });

  /* Action menu for mobile */
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const { success, error, info } = useToast();

  /* ─── Load Data ─────────────────────────────────── */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invList, custList] = await Promise.all([
        InvoiceService.getInvoices(),
        CustomerService.getCustomers(),
      ]);
      setInvoices(invList);
      setCustomers(custList);
    } catch (err) {
      console.error("Error loading invoice history:", err);
      error("تعذر جلب سجل الفواتير");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Filter + Sort + Paginate (memoized) ──────── */
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer?.name_ar?.toLowerCase().includes(q) ||
        inv.customer?.name_en?.toLowerCase().includes(q) ||
        inv.customer?.company_name?.toLowerCase().includes(q) ||
        inv.customer?.vat_number?.includes(q);

      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      const matchZatca = zatcaFilter === "all" || inv.zatca_status === zatcaFilter;
      const matchCustomer =
        customerFilter === "all" || inv.customer_id === customerFilter;
      const matchFrom = !dateFrom || inv.issue_date >= dateFrom;
      const matchTo = !dateTo || inv.issue_date <= dateTo;

      return matchSearch && matchStatus && matchZatca && matchCustomer && matchFrom && matchTo;
    });
  }, [invoices, searchTerm, statusFilter, zatcaFilter, customerFilter, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "invoice_number":
          aVal = a.invoice_number;
          bVal = b.invoice_number;
          break;
        case "issue_date":
          aVal = a.issue_date;
          bVal = b.issue_date;
          break;
        case "grand_total":
          aVal = a.grand_total;
          bVal = b.grand_total;
          break;
        case "customer":
          aVal = a.customer?.name_ar || a.customer?.company_name || "";
          bVal = b.customer?.name_ar || b.customer?.company_name || "";
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "zatca_status":
          aVal = a.zatca_status;
          bVal = b.zatca_status;
          break;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  /* Reset page when filters change */
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, zatcaFilter, customerFilter, dateFrom, dateTo]);

  /* ─── Sort toggle ──────────────────────────────── */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3 h-3 text-slate-400 inline ms-1" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-emerald-600 inline ms-1" />
      : <ArrowDown className="w-3 h-3 text-emerald-600 inline ms-1" />;
  };

  /* ─── Confirm-gated actions ────────────────────── */
  const openConfirm = (type: ConfirmState["type"], invoice: Invoice) => {
    setMenuOpenId(null);
    setConfirm({ type, invoice, isLoading: false });
  };

  const closeConfirm = () =>
    setConfirm({ type: null, invoice: null, isLoading: false });

  const handleConfirmAction = async () => {
    if (!confirm.invoice || !confirm.type) return;
    const inv = confirm.invoice;

    setConfirm((c) => ({ ...c, isLoading: true }));

    try {
      switch (confirm.type) {
        case "delete": {
          if (!canDelete(inv)) {
            error(
              "لا يمكن حذف هذه الفاتورة",
              "يمكن حذف المسودات غير المرفوعة للزكاة فقط",
            );
            break;
          }
          await InvoiceService.deleteInvoice(inv.id);
          success("تم حذف الفاتورة بنجاح");
          setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
          break;
        }
        case "cancel": {
          if (!canCancel(inv)) {
            error("لا يمكن إلغاء هذه الفاتورة");
            break;
          }
          const updated = await InvoiceService.updateInvoiceStatus(inv.id, "cancelled");
          if (updated) {
            setInvoices((prev) =>
              prev.map((i) => (i.id === inv.id ? updated : i)),
            );
            success("تم إلغاء الفاتورة بنجاح");
          }
          break;
        }
        case "duplicate": {
          info("جاري نسخ الفاتورة...");
          const copy = await InvoiceService.duplicateInvoice(inv.id);
          success(
            "تم نسخ الفاتورة كمسودة جديدة",
            `رقم الفاتورة الجديدة: ${copy.invoice_number}`,
          );
          await loadData();
          break;
        }
        case "zatca": {
          if (!canSubmitZatca(inv)) {
            error("لا يمكن رفع هذه الفاتورة", "يجب إصدار الفاتورة أولاً قبل رفعها للزكاة");
            break;
          }
          const result = await InvoiceService.submitToZatca(inv.id);
          if (result.success) {
            success(result.message);
            setInvoices((prev) =>
              prev.map((i) => (i.id === inv.id ? result.invoice : i)),
            );
          } else {
            error(result.message);
          }
          break;
        }
      }
    } catch (err: any) {
      error(err.message || "حدث خطأ أثناء تنفيذ العملية");
    } finally {
      closeConfirm();
    }
  };

  /* ─── PDF / Print ──────────────────────────────── */
  const handleDownloadPDF = async (inv: Invoice) => {
    setMenuOpenId(null);
    setPreviewInvoice(null);
    info("جاري تجهيز ملف PDF عالي الدقة...");
    // Render preview first (it uses element ID), slight delay for DOM
    setPreviewInvoice(inv);
    setTimeout(async () => {
      const result = await downloadInvoicePDF(inv);
      if (result.success) {
        success("تم تحميل ملف الفاتورة بنجاح");
      } else {
        error("تعذر تصدير ملف PDF");
      }
      setPreviewInvoice(null);
    }, 400);
  };

  const handlePrint = (inv: Invoice) => {
    setMenuOpenId(null);
    setPreviewInvoice(null);
    info("جاري تجهيز الفاتورة للطباعة...");
    setPreviewInvoice(inv);
    setTimeout(async () => {
      await printInvoice("invoice-document-render");
      setPreviewInvoice(null);
    }, 450);
  };

  /* ─── Confirm Dialog Config ─────────────────────── */
  const confirmConfig = useMemo(() => {
    if (!confirm.type || !confirm.invoice) return null;
    const inv = confirm.invoice;
    const num = inv.invoice_number;

    switch (confirm.type) {
      case "delete":
        return {
          title: "حذف الفاتورة نهائياً",
          message: `هل تريد حذف الفاتورة ${num} بصورة نهائية؟ لا يمكن التراجع عن هذا الإجراء. يُسمح فقط بحذف المسودات غير المرفوعة.`,
          confirmText: "نعم، احذف الفاتورة",
          variant: "danger" as const,
        };
      case "cancel":
        return {
          title: "إلغاء الفاتورة",
          message: `هل تريد إلغاء الفاتورة ${num}؟ ستُوسم بحالة (ملغاة) وستُفقد إمكانية التحصيل. لا يمكن إلغاء الفواتير المعتمدة من هيئة الزكاة.`,
          confirmText: "نعم، ألغِ الفاتورة",
          variant: "warning" as const,
        };
      case "duplicate":
        return {
          title: "نسخ الفاتورة كمسودة جديدة",
          message: `سيتم نسخ جميع بنود الفاتورة ${num} إلى مسودة جديدة برقم تسلسلي جديد. يمكنك تعديل المسودة قبل إصدارها.`,
          confirmText: "نعم، انسخ الفاتورة",
          variant: "primary" as const,
        };
      case "zatca":
        return {
          title: "رفع الفاتورة إلى هيئة الزكاة والضريبة",
          message: `هل تريد رفع الفاتورة ${num} إلكترونياً لهيئة الزكاة والضريبة والجمارك؟ بعد الاعتماد لن تتمكن من تعديلها.`,
          confirmText: "نعم، ارفع الفاتورة",
          variant: "primary" as const,
        };
    }
  }, [confirm]);

  /* ─── Aggregate Summary ─────────────────────────── */
  const summary = useMemo(() => {
    const total = filtered.reduce((s, i) => s + (i.grand_total || 0), 0);
    const vatTotal = filtered.reduce((s, i) => s + (i.vat_amount || 0), 0);
    const paid = filtered.filter((i) => i.status === "paid").length;
    const draft = filtered.filter((i) => i.status === "draft").length;
    return { count: filtered.length, total, vatTotal, paid, draft };
  }, [filtered]);

  /* ─── Clear filters helper ───────────────────────── */
  const hasFilters =
    searchTerm || statusFilter !== "all" || zatcaFilter !== "all" ||
    customerFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setZatcaFilter("all");
    setCustomerFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  /* ═══════════════════════════════════════════════════ */
  /* RENDER                                             */
  /* ═══════════════════════════════════════════════════ */
  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* ── PAGE HEADER ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            سجل الفواتير (Invoice History)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            استعراض وتصفية وتصدير كافة الفواتير — مسودات، مصدرة، مدفوعة، وحالة الامتثال الزكوي
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => onNavigate("create_invoice")}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء فاتورة جديدة</span>
          </button>
        </div>
      </div>

      {/* ── KPI SUMMARY BAR ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي النتائج", value: summary.count + " فاتورة", color: "bg-slate-800 text-white" },
          { label: "إجمالي المبالغ", value: summary.total.toFixed(2) + " ر.س", color: "bg-emerald-800 text-white" },
          { label: "إجمالي الضريبة", value: summary.vatTotal.toFixed(2) + " ر.س", color: "bg-emerald-100 text-emerald-900" },
          { label: "مدفوعة / مسودات", value: `${summary.paid} / ${summary.draft}`, color: "bg-slate-100 text-slate-800" },
        ].map((kpi) => (
          <div key={kpi.label} className={`${kpi.color} p-3.5 rounded-2xl border border-white/10 shadow-xs`}>
            <div className="text-[10px] font-bold opacity-70 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-sm font-black mt-0.5 font-mono">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── FILTER BAR ──────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">تصفية وبحث الفواتير</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mr-auto flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-bold"
            >
              <X className="w-3 h-3" /> مسح كل الفلاتر
            </button>
          )}
        </div>

        {/* Row 1: Search + Customer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
            <input
              type="text"
              placeholder="ابحث برقم الفاتورة، اسم العميل، الرقم الضريبي..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-9 pe-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute end-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full ps-9 pe-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 bg-white appearance-none"
            >
              <option value="all">كل العملاء</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                  {c.company_name ? ` (${c.company_name})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Status + ZATCA + Date Range */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:border-emerald-500"
          >
            <option value="all">كل الحالات</option>
            <option value="draft">مسودة (Draft)</option>
            <option value="issued">مصدرة (Issued)</option>
            <option value="paid">مدفوعة (Paid)</option>
            <option value="partially_paid">مدفوعة جزئياً</option>
            <option value="unpaid">غير مدفوعة (Unpaid)</option>
            <option value="cancelled">ملغاة (Cancelled)</option>
          </select>

          <select
            value={zatcaFilter}
            onChange={(e) => setZatcaFilter(e.target.value as any)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:border-emerald-500"
          >
            <option value="all">كل حالات الزكاة</option>
            <option value="accepted">معتمدة (Accepted)</option>
            <option value="submitted">مرفوعة (Submitted)</option>
            <option value="not_submitted">غير مرفوعة</option>
            <option value="rejected">مرفوضة (Rejected)</option>
            <option value="error">خطأ (Error)</option>
          </select>

          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-3" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full ps-8 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
              title="من تاريخ"
            />
          </div>

          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-3" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full ps-8 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
              title="إلى تاريخ"
            />
          </div>
        </div>
      </div>

      {/* ── INVOICES TABLE ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Table */}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th
                    className="py-3 px-4 text-start font-bold text-slate-700 cursor-pointer hover:text-emerald-700 select-none whitespace-nowrap"
                    onClick={() => handleSort("invoice_number")}
                  >
                    رقم الفاتورة <SortIcon field="invoice_number" />
                  </th>
                  <th
                    className="py-3 px-4 text-start font-bold text-slate-700 cursor-pointer hover:text-emerald-700 select-none"
                    onClick={() => handleSort("customer")}
                  >
                    العميل <SortIcon field="customer" />
                  </th>
                  <th
                    className="py-3 px-4 text-start font-bold text-slate-700 cursor-pointer hover:text-emerald-700 select-none whitespace-nowrap"
                    onClick={() => handleSort("issue_date")}
                  >
                    تاريخ الإصدار <SortIcon field="issue_date" />
                  </th>
                  <th className="py-3 px-4 text-end font-bold text-slate-700 whitespace-nowrap">
                    الخاضع للضريبة
                  </th>
                  <th className="py-3 px-4 text-end font-bold text-slate-700 whitespace-nowrap">
                    الضريبة (15%)
                  </th>
                  <th
                    className="py-3 px-4 text-end font-bold text-slate-700 cursor-pointer hover:text-emerald-700 select-none whitespace-nowrap"
                    onClick={() => handleSort("grand_total")}
                  >
                    الإجمالي <SortIcon field="grand_total" />
                  </th>
                  <th
                    className="py-3 px-4 text-center font-bold text-slate-700 cursor-pointer hover:text-emerald-700 select-none"
                    onClick={() => handleSort("status")}
                  >
                    الحالة <SortIcon field="status" />
                  </th>
                  <th
                    className="py-3 px-4 text-center font-bold text-slate-700 cursor-pointer hover:text-emerald-700 select-none"
                    onClick={() => handleSort("zatca_status")}
                  >
                    هيئة الزكاة <SortIcon field="zatca_status" />
                  </th>
                  <th className="py-3 px-4 text-center font-bold text-slate-700">
                    الإجراءات
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginated.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                    onClick={() => onViewInvoice(inv.id)}
                  >
                    {/* Invoice Number */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-emerald-950 group-hover:text-emerald-700">
                          {inv.invoice_number}
                        </span>
                        {inv.zatca_status === "accepted" && (
                          <span title="مقفلة - معتمدة من الزكاة">
                            <Lock className="w-3 h-3 text-emerald-600" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {inv.invoice_type === "simplified_tax_invoice" ? "مبسطة" : "ضريبية"}
                        {inv.due_date && ` · يستحق ${inv.due_date}`}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900 truncate max-w-[140px]">
                        {inv.customer?.name_ar || inv.customer?.company_name || "عميل نقدي"}
                      </p>
                      {inv.customer?.vat_number && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          {inv.customer.vat_number}
                        </p>
                      )}
                    </td>

                    {/* Issue Date */}
                    <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {inv.issue_date}
                    </td>

                    {/* Taxable */}
                    <td className="py-4 px-4 text-end font-mono text-slate-700">
                      <CurrencyDisplay amount={inv.taxable_amount || inv.subtotal} size="sm" />
                    </td>

                    {/* VAT */}
                    <td className="py-4 px-4 text-end font-mono text-emerald-800">
                      <CurrencyDisplay amount={inv.vat_amount} size="sm" />
                    </td>

                    {/* Grand Total */}
                    <td className="py-4 px-4 text-end font-mono font-black text-slate-900">
                      <CurrencyDisplay amount={inv.grand_total} size="sm" />
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      <StatusBadge status={inv.status} type="invoice" />
                    </td>

                    {/* ZATCA */}
                    <td className="py-4 px-4 text-center">
                      <StatusBadge zatcaStatus={inv.zatca_status} type="zatca" />
                    </td>

                    {/* Actions */}
                    <td
                      className="py-4 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Desktop: icon strip */}
                      <div className="hidden sm:flex items-center justify-center gap-0.5">
                        {/* View */}
                        <ActionBtn
                          title="معاينة الفاتورة"
                          icon={<Eye className="w-4 h-4" />}
                          onClick={() => setPreviewInvoice(inv)}
                          color="text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                        />

                        {/* Edit (only drafts) */}
                        {canEdit(inv) ? (
                          <ActionBtn
                            title="تعديل المسودة"
                            icon={<Edit className="w-4 h-4" />}
                            onClick={() =>
                              onEditInvoice
                                ? onEditInvoice(inv.id)
                                : onViewInvoice(inv.id)
                            }
                            color="text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          />
                        ) : (
                          <ActionBtn
                            title="الفاتورة مقفلة - لا يمكن التعديل"
                            icon={<Lock className="w-4 h-4" />}
                            onClick={() => {}}
                            color="text-slate-300 cursor-not-allowed"
                          />
                        )}

                        {/* Duplicate */}
                        <ActionBtn
                          title="نسخ كمسودة جديدة"
                          icon={<Copy className="w-4 h-4" />}
                          onClick={() => openConfirm("duplicate", inv)}
                          color="text-slate-500 hover:text-violet-700 hover:bg-violet-50"
                        />

                        {/* Print */}
                        <ActionBtn
                          title="طباعة (A4)"
                          icon={<Printer className="w-4 h-4" />}
                          onClick={() => handlePrint(inv)}
                          color="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        />

                        {/* Save PDF */}
                        <ActionBtn
                          title="حفظ PDF"
                          icon={<Download className="w-4 h-4" />}
                          onClick={() => handleDownloadPDF(inv)}
                          color="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        />

                        {/* ZATCA Submit */}
                        {canSubmitZatca(inv) && (
                          <ActionBtn
                            title="رفع للزكاة والضريبة"
                            icon={<ShieldCheck className="w-4 h-4" />}
                            onClick={() => openConfirm("zatca", inv)}
                            color="text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          />
                        )}

                        {/* Cancel */}
                        {canCancel(inv) && (
                          <ActionBtn
                            title="إلغاء الفاتورة"
                            icon={<AlertTriangle className="w-4 h-4" />}
                            onClick={() => openConfirm("cancel", inv)}
                            color="text-slate-400 hover:text-amber-700 hover:bg-amber-50"
                          />
                        )}

                        {/* Delete */}
                        {canDelete(inv) && (
                          <ActionBtn
                            title="حذف الفاتورة"
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={() => openConfirm("delete", inv)}
                            color="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          />
                        )}
                      </div>

                      {/* Mobile: kebab menu */}
                      <div className="flex sm:hidden justify-center relative">
                        <button
                          onClick={() =>
                            setMenuOpenId((id) => (id === inv.id ? null : inv.id))
                          }
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpenId === inv.id && (
                          <MobileMenu
                            invoice={inv}
                            onView={() => { setMenuOpenId(null); setPreviewInvoice(inv); }}
                            onEdit={() => { setMenuOpenId(null); onEditInvoice ? onEditInvoice(inv.id) : onViewInvoice(inv.id); }}
                            onDuplicate={() => openConfirm("duplicate", inv)}
                            onDownload={() => handleDownloadPDF(inv)}
                            onPrint={() => handlePrint(inv)}
                            onZatca={canSubmitZatca(inv) ? () => openConfirm("zatca", inv) : undefined}
                            onCancel={canCancel(inv) ? () => openConfirm("cancel", inv) : undefined}
                            onDelete={canDelete(inv) ? () => openConfirm("delete", inv) : undefined}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && paginated.length === 0 && (
          <EmptyState
            title={hasFilters ? "لا توجد فواتير مطابقة للتصفية" : "لا توجد فواتير بعد"}
            description={
              hasFilters
                ? "حاول تعديل معايير البحث والتصفية أو مسح الفلاتر."
                : "ابدأ بإنشاء أول فاتورة ضريبية لعملائك."
            }
            action={
              hasFilters ? (
                <button
                  onClick={clearFilters}
                  className="bg-slate-700 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  مسح الفلاتر
                </button>
              ) : (
                <button
                  onClick={() => onNavigate("create_invoice")}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs"
                >
                  إنشاء أول فاتورة
                </button>
              )
            }
          />
        )}

        {/* ── PAGINATION ─────────────────────────────── */}
        {!isLoading && sorted.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>عرض</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white font-bold text-slate-700"
              >
                {[10, 20, 50, 100].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span>
                من أصل <strong className="text-slate-800">{sorted.length}</strong> نتيجة
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-white disabled:opacity-40"
              >
                الأول
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Page pills */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) {
                  p = i + 1;
                } else if (page <= 3) {
                  p = i + 1;
                } else if (page >= totalPages - 2) {
                  p = totalPages - 4 + i;
                } else {
                  p = page - 2 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                      page === p
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-white disabled:opacity-40"
              >
                الأخير
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── STATUS LEGEND ────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">دليل حالات الفواتير وصلاحيات الإجراءات</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-600">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Edit className="w-3 h-3 text-blue-500" /> التعديل (Edit)
            </span>
            <p>متاح للفواتير والمسودات غير المعتمدة رسمياً من هيئة الزكاة والضريبة.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Trash2 className="w-3 h-3 text-rose-500" /> الحذف (Delete)
            </span>
            <p>متاح لحذف الفواتير والمسودات غير المعتمدة من هيئة الزكاة والضريبة.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" /> المقفلة (Locked)
            </span>
            <p>الفواتير المعتمدة من هيئة الزكاة مقفلة قانونياً لمنع التلاعب (تُلغى بإشعار دائن).</p>
          </div>
        </div>
      </div>

      {/* ── INVOICE PREVIEW MODAL ───────────────────── */}
      {previewInvoice && (
        <InlinePdfModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onDownload={() => handleDownloadPDF(previewInvoice)}
          onPrint={() => handlePrint(previewInvoice)}
        />
      )}

      {/* ── CONFIRM DIALOG ──────────────────────────── */}
      {confirmConfig && confirm.invoice && (
        <ConfirmDialog
          isOpen={Boolean(confirm.type)}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          cancelText="إلغاء"
          variant={confirmConfig.variant}
          isLoading={confirm.isLoading}
          onConfirm={handleConfirmAction}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
};

/* ─── Sub-components ────────────────────────────────── */
const ActionBtn: React.FC<{
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}> = ({ title, icon, onClick, color = "" }) => (
  <button
    title={title}
    onClick={onClick}
    className={`p-1.5 rounded-lg transition-colors ${color}`}
  >
    {icon}
  </button>
);

const MobileMenu: React.FC<{
  invoice: Invoice;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onZatca?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}> = ({ invoice, onView, onEdit, onDuplicate, onDownload, onPrint, onZatca, onCancel, onDelete }) => (
  <div className="absolute end-0 top-8 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 min-w-[180px] py-1 text-xs">
    <MenuAction icon={<Eye className="w-3.5 h-3.5" />} label="معاينة" onClick={onView} />
    {canEdit(invoice) ? (
      <MenuAction icon={<Edit className="w-3.5 h-3.5" />} label="تعديل المسودة" onClick={onEdit} />
    ) : (
      <MenuAction icon={<Lock className="w-3.5 h-3.5" />} label="مقفلة (لا تعديل)" onClick={() => {}} disabled />
    )}
    <MenuAction icon={<Copy className="w-3.5 h-3.5" />} label="نسخ كمسودة" onClick={onDuplicate} />
    <MenuAction icon={<Printer className="w-3.5 h-3.5" />} label="طباعة (A4)" onClick={onPrint} />
    <MenuAction icon={<Download className="w-3.5 h-3.5" />} label="حفظ PDF" onClick={onDownload} />
    {onZatca && (
      <MenuAction icon={<ShieldCheck className="w-3.5 h-3.5" />} label="رفع للزكاة" onClick={onZatca} color="text-emerald-700" />
    )}
    {onCancel && (
      <MenuAction icon={<AlertTriangle className="w-3.5 h-3.5" />} label="إلغاء الفاتورة" onClick={onCancel} color="text-amber-700" />
    )}
    {onDelete && (
      <MenuAction icon={<Trash2 className="w-3.5 h-3.5" />} label="حذف" onClick={onDelete} color="text-rose-600" />
    )}
  </div>
);

const MenuAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}> = ({ icon, label, onClick, color = "text-slate-700", disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors text-start ${color} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);
