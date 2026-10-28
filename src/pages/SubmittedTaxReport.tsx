import React, { useEffect, useState, useMemo, useRef } from "react";
import { InvoiceService } from "../services/invoiceService";
import { CompanyService } from "../services/companyService";
import { Invoice, Company } from "../types/database";
import { CurrencyDisplay } from "../components/common/CurrencyDisplay";
import { StatusBadge } from "../components/common/StatusBadge";
import { InvoicePreview } from "../components/invoices/InvoicePreview";
import { downloadInvoicePDF, printInvoice } from "../components/invoices/InvoicePDF";
import { useToast } from "../contexts/ToastContext";
import { NavigationTab } from "../routes";
import {
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Calendar,
  Eye,
  Building2,
  Receipt,
  TrendingUp,
  Percent,
  CheckCircle2,
  X,
  FileText,
  Copy,
  Hash,
} from "lucide-react";

interface SubmittedTaxReportProps {
  onNavigate?: (tab: NavigationTab) => void;
  onViewInvoice?: (id: string) => void;
}

const ARABIC_MONTHS = [
  { value: "01", label: "يناير" },
  { value: "02", label: "فبراير" },
  { value: "03", label: "مارس" },
  { value: "04", label: "أبريل" },
  { value: "05", label: "مايو" },
  { value: "06", label: "يونيو" },
  { value: "07", label: "يوليو" },
  { value: "08", label: "أغسطس" },
  { value: "09", label: "سبتمبر" },
  { value: "10", label: "أكتوبر" },
  { value: "11", label: "نوفمبر" },
  { value: "12", label: "ديسمبر" },
];

export const SubmittedTaxReport: React.FC<SubmittedTaxReportProps> = ({
  onNavigate,
  onViewInvoice,
}) => {
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<string>("all");

  // Preview Modal
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const { success, warning, error, info } = useToast();

  useEffect(() => {
    loadSubmittedInvoices();
  }, []);

  const loadSubmittedInvoices = async () => {
    setIsLoading(true);
    try {
      const [invoices, comp] = await Promise.all([
        InvoiceService.getInvoices(),
        CompanyService.getCompany(),
      ]);

      setAllInvoices(invoices);
      setCompany(comp);
    } catch (err) {
      console.error("Error loading submitted tax report data:", err);
      error("تعذر تحميل كشف الفواتير المرفوعة للضريبة");
    } finally {
      setIsLoading(false);
    }
  };

  // STRICT RULE: ONLY invoices that were sent/submitted to ZATCA / Tax Authority
  const submittedInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      // Must be submitted or accepted by ZATCA
      const isSubmittedToTax =
        inv.zatca_status === "accepted" ||
        inv.zatca_status === "submitted" ||
        Boolean(inv.submitted_snapshot);

      if (!isSubmittedToTax) return false;

      // Filter by Search Term
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matchesNum = inv.invoice_number.toLowerCase().includes(term);
        const matchesCust =
          inv.customer?.name_ar?.toLowerCase().includes(term) ||
          inv.customer?.company_name?.toLowerCase().includes(term) ||
          inv.customer?.name_en?.toLowerCase().includes(term);
        const matchesVat = inv.customer?.vat_number?.includes(term);
        const matchesHash = inv.invoice_hash?.toLowerCase().includes(term);
        const matchesUuid = inv.zatca_uuid?.toLowerCase().includes(term);

        if (!matchesNum && !matchesCust && !matchesVat && !matchesHash && !matchesUuid) {
          return false;
        }
      }

      // Filter by Year
      if (selectedYear !== "all") {
        if (!inv.issue_date.startsWith(selectedYear)) return false;
      }

      // Filter by Month
      if (selectedMonth !== "all") {
        const invMonth = inv.issue_date.split("-")[1];
        if (invMonth !== selectedMonth) return false;
      }

      // Filter by Day
      if (selectedDate && inv.issue_date !== selectedDate) {
        return false;
      }

      // Filter by Invoice Type
      if (invoiceTypeFilter !== "all" && inv.invoice_type !== invoiceTypeFilter) {
        return false;
      }

      return true;
    });
  }, [allInvoices, searchTerm, selectedYear, selectedMonth, selectedDate, invoiceTypeFilter]);

  // Aggregate Submitted Metrics
  const metrics = useMemo(() => {
    let totalTaxable = 0;
    let totalVat = 0;
    let grandTotal = 0;
    let b2bCount = 0;
    let b2cCount = 0;

    submittedInvoices.forEach((inv) => {
      // Use submitted snapshot if available to guarantee exact reported figures
      const data = inv.submitted_snapshot || inv;
      totalTaxable += Number(data.taxable_amount || data.subtotal || 0);
      totalVat += Number(data.vat_amount || 0);
      grandTotal += Number(data.grand_total || 0);

      if (inv.invoice_type === "tax_invoice") {
        b2bCount++;
      } else {
        b2cCount++;
      }
    });

    return {
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalVat: Number(totalVat.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      count: submittedInvoices.length,
      b2bCount,
      b2cCount,
    };
  }, [submittedInvoices]);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    allInvoices.forEach((inv) => {
      if (inv.issue_date) years.add(inv.issue_date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [allInvoices]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedYear("all");
    setSelectedMonth("all");
    setSelectedDate("");
    setInvoiceTypeFilter("all");
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedYear !== "all" ||
    selectedMonth !== "all" ||
    Boolean(selectedDate) ||
    invoiceTypeFilter !== "all";

  // CSV Export for ZATCA Report
  const handleExportCSV = () => {
    if (submittedInvoices.length === 0) {
      warning("لا توجد فواتير مرفوعة للضريبة في هذا النطاق");
      return;
    }

    try {
      const headers = [
        "رقم الفاتورة",
        "تاريخ الإصدار",
        "نوع الفاتورة",
        "اسم العميل",
        "الرقم الضريبي للعميل",
        "المبلغ الخاضع للضريبة (SAR)",
        "ضريبة القيمة المضافة 15% (SAR)",
        "الإجمالي شامل الضريبة (SAR)",
        "حالة الاعتماد بالزكاة",
        "المعرف الزكوي UUID",
      ];

      const rows = submittedInvoices.map((inv) => {
        const data = inv.submitted_snapshot || inv;
        return [
          inv.invoice_number,
          inv.issue_date,
          inv.invoice_type === "tax_invoice" ? "فاتورة ضريبية B2B" : "فاتورة مبسطة B2C",
          `"${(data.customer?.name_ar || data.customer?.company_name || "عميل نقدي").replace(/"/g, '""')}"`,
          data.customer?.vat_number || "-",
          (data.taxable_amount || data.subtotal || 0).toFixed(2),
          (data.vat_amount || 0).toFixed(2),
          (data.grand_total || 0).toFixed(2),
          "معتمدة لدى الزكاة والضريبة",
          inv.zatca_uuid || "-",
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `كشف_الفواتير_المرفوعة_للضريبة_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      success("تم تصدير كشف الفواتير المرفوعة للضريبة بنجاح (Excel/CSV)");
    } catch (err) {
      error("تعذر تصدير ملف CSV");
    }
  };

  const handlePrintFullReport = () => {
    window.print();
  };

  const handleDownloadSingleInvoicePdf = async (inv: Invoice) => {
    info("جاري تجهيز الفاتورة بصيغة PDF...");
    const { success: ok } = await downloadInvoicePDF(inv);
    if (ok) {
      success("تم تنزيل الفاتورة بنجاح");
    } else {
      error("تعذر تنزيل ملف PDF");
    }
  };

  const handlePrintSingleInvoice = (inv: Invoice) => {
    setPreviewInvoice(inv);
    setTimeout(() => {
      printInvoice("invoice-document-render");
    }, 400);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>بيانات معتمدة 100% لدى هيئة الزكاة والضريبة والجمارك (ZATCA)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              كشف الضريبة على الفواتير المرفوعة للضريبة
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              كشف رسمي دقيق يعرض حصرياً الفواتير والبيانات التي تم رفعها واعتمادها لدى هيئة الزكاة، مع الحفاظ الكامل على نسخة الفاتورة المرسلة للضريبة دون اختلاط بأي مسودات أو تعديلات محلية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-lg transition-all hover:scale-105 text-xs sm:text-sm"
            >
              <Download className="w-4 h-4" />
              <span>تصدير كشف إكسل (CSV)</span>
            </button>
            <button
              onClick={handlePrintFullReport}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-2xl border border-white/20 transition-all text-xs sm:text-sm backdrop-blur-sm"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكشف الرسمي</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards (Metrics of Submitted Invoices) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reported Taxable Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المبيعات المعتمدة (قبل الضريبة)</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={metrics.totalTaxable}
              size="lg"
              className="text-emerald-950 font-black"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              الوعاء الضريبي المرفوع رسمياً
            </p>
          </div>
        </div>

        {/* Total VAT 15% */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الضريبة المرفوعة (15% VAT)</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={metrics.totalVat}
              size="lg"
              className="text-blue-950 font-black"
            />
            <p className="mt-1 text-[11px] text-blue-700 font-bold">
              ضريبة مخرجات مثبتة بالمنظومة
            </p>
          </div>
        </div>

        {/* Grand Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الإجمالي المعتمد (شامل الضريبة)</span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={metrics.grandTotal}
              size="lg"
              className="text-slate-900 font-black"
            />
            <p className="mt-1 text-[11px] text-emerald-700 font-bold">
              مطابق 100% لإشعارات ZATCA
            </p>
          </div>
        </div>

        {/* Count of Submitted Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الفواتير المرفوعة والمعتمدة</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-900 font-mono">
              {metrics.count}
            </span>
            <span className="text-xs font-bold text-slate-500">
              ({metrics.b2bCount} ضريبية · {metrics.b2cCount} مبسطة)
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-4 h-4 text-emerald-700" />
            <span>فلترة كشف الفواتير المرفوعة للضريبة</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="رقم الفاتورة، العميل، الرقم الضريبي..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500"
            />
          </div>

          {/* Year */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:border-emerald-500"
            >
              <option value="all">كل السنوات</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  سنة {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:border-emerald-500"
            >
              <option value="all">كل الشهور</option>
              {ARABIC_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value})
                </option>
              ))}
            </select>
          </div>

          {/* Specific Day */}
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 focus:border-emerald-500"
              title="فلترة بيوم محدد"
            />
          </div>

          {/* Invoice Type */}
          <div>
            <select
              value={invoiceTypeFilter}
              onChange={(e) => setInvoiceTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:border-emerald-500"
            >
              <option value="all">كافة الأنواع</option>
              <option value="tax_invoice">فاتورة ضريبية (B2B)</option>
              <option value="simplified_tax_invoice">فاتورة مبسطة (B2C)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submitted Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              الفواتير المعتمدة رسمياً لدى هيئة الزكاة والضريبة
            </h3>
            <p className="text-xs text-slate-500">
              بيانات حقيقية ثابتة تمثل ما تم تسليمه للإقرار الزكوي
            </p>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
            {submittedInvoices.length} فاتورة معتمدة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-start">رقم الفاتورة</th>
                <th className="py-3 px-4 text-start">تاريخ الإصدار</th>
                <th className="py-3 px-4 text-start">العميل</th>
                <th className="py-3 px-4 text-start">الرقم الضريبي للعميل</th>
                <th className="py-3 px-4 text-center">نوع الفاتورة</th>
                <th className="py-3 px-4 text-end">المبلغ قبل الضريبة</th>
                <th className="py-3 px-4 text-end">ضريبة 15%</th>
                <th className="py-3 px-4 text-end">الإجمالي شامل الضريبة</th>
                <th className="py-3 px-4 text-center">حالة الزكاة</th>
                <th className="py-3 px-4 text-center">المعرف الزكوي UUID</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submittedInvoices.map((inv) => {
                const data = inv.submitted_snapshot || inv;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{inv.issue_date}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {data.customer?.name_ar || data.customer?.company_name || "عميل نقدي"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {data.customer?.vat_number || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold">
                        {inv.invoice_type === "tax_invoice" ? "ضريبية B2B" : "مبسطة B2C"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-end font-mono">
                      <CurrencyDisplay amount={data.taxable_amount || data.subtotal || 0} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-end font-mono font-bold text-blue-900">
                      <CurrencyDisplay amount={data.vat_amount || 0} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-end font-mono font-black text-slate-900">
                      <CurrencyDisplay amount={data.grand_total || 0} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>معتمدة بالضريبة</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-[10px] text-slate-500 max-w-[120px] truncate" title={inv.zatca_uuid || "معتمد"}>
                      {inv.zatca_uuid ? `${inv.zatca_uuid.substring(0, 10)}...` : "معتمد"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          title="معاينة الفاتورة الأصلية المرفوعة"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadSingleInvoicePdf(inv)}
                          title="تحميل PDF"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintSingleInvoice(inv)}
                          title="طباعة A4 صفحة واحدة"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {submittedInvoices.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 text-sm">
                    لا توجد فواتير مرفوعة للضريبة حالياً مطابقة لشروط البحث. يمكنك الانتقال إلى "رفع الضريبة (ZATCA)" لاعتماد الفواتير الصادرة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 my-auto max-h-[95vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    معاينة الفاتورة المعتمدة ضريبياً — {previewInvoice.invoice_number}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    النسخة الأصلية المرفوعة لهيئة الزكاة والضريبة والجمارك (ZATCA)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => printInvoice("invoice-document-render")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة A4 صفحة واحدة</span>
                </button>
                <button
                  onClick={() => handleDownloadSingleInvoicePdf(previewInvoice)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل PDF</span>
                </button>
                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[78vh] bg-slate-50/50 flex justify-center">
              <InvoicePreview invoice={previewInvoice.submitted_snapshot || previewInvoice} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
