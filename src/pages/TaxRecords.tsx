import React, { useEffect, useState, useMemo, useRef } from "react";
import { TaxService, TaxReportSummary } from "../services/taxService";
import { CompanyService } from "../services/companyService";
import { Company, Invoice } from "../types/database";
import { CurrencyDisplay } from "../components/common/CurrencyDisplay";
import { StatusBadge } from "../components/common/StatusBadge";
import { useToast } from "../contexts/ToastContext";
import { NavigationTab } from "../routes";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  ShieldCheck,
  Receipt,
  FileCheck,
  AlertCircle,
  Clock,
  Search,
  Printer,
  RefreshCw,
  X,
  Building2,
  TrendingUp,
  Percent,
  CheckCircle2,
  FileText,
  Eye,
  ArrowUpDown,
} from "lucide-react";

interface TaxRecordsProps {
  onNavigate?: (tab: NavigationTab) => void;
  onViewInvoice?: (id: string) => void;
}

export const TaxRecords: React.FC<TaxRecordsProps> = ({
  onNavigate,
  onViewInvoice,
}) => {
  const [taxSummary, setTaxSummary] = useState<TaxReportSummary | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Filters State
  const [periodFilter, setPeriodFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [zatcaStatusFilter, setZatcaStatusFilter] = useState("all");
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState("all");

  const printableReportRef = useRef<HTMLDivElement>(null);
  const { success, error, warning, info } = useToast();

  useEffect(() => {
    loadTaxData();
  }, [periodFilter, startDate, endDate, searchTerm, zatcaStatusFilter, invoiceTypeFilter]);

  const loadTaxData = async () => {
    setIsLoading(true);
    try {
      const [summary, comp] = await Promise.all([
        TaxService.getTaxSummary({
          period: periodFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          searchTerm: searchTerm || undefined,
          zatcaStatus: zatcaStatusFilter,
          invoiceType: invoiceTypeFilter,
        }),
        CompanyService.getCompany(),
      ]);

      setTaxSummary(summary);
      setCompany(comp);
    } catch (err) {
      console.error("Error fetching tax summary:", err);
      error("تعذر جلب بيانات السجل الضريبي");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setPeriodFilter("all");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setZatcaStatusFilter("all");
    setInvoiceTypeFilter("all");
  };

  const hasActiveFilters =
    periodFilter !== "all" ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(searchTerm) ||
    zatcaStatusFilter !== "all" ||
    invoiceTypeFilter !== "all";

  // CSV Export
  const handleExportCsv = () => {
    if (!taxSummary || taxSummary.invoices.length === 0) {
      warning("لا توجد سجلات ضريبية لتصديرها");
      return;
    }

    try {
      const csvContent = TaxService.generateTaxCSV(taxSummary);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const periodLabel = periodFilter === "all" ? "All_Periods" : periodFilter;
      link.setAttribute(
        "download",
        `الإقرار_الضريبي_${periodLabel}_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      success("تم تصدير ملف السجل والإقرار الضريبي بنجاح (CSV/Excel)");
    } catch (err) {
      console.error("CSV export error:", err);
      error("حدث خطأ أثناء تصدير ملف CSV");
    }
  };

  // PDF Report Export
  const handleExportPdf = async () => {
    if (!taxSummary || taxSummary.invoices.length === 0) {
      warning("لا توجد سجلات ضريبية لتصديرها");
      return;
    }

    const reportElement = printableReportRef.current;
    if (!reportElement) return;

    setIsExportingPdf(true);
    info("جاري إعداد وتوليد تقرير الإقرار الضريبي بصيغة PDF...");

    try {
      // Temporarily display the printable element for capture
      reportElement.style.display = "block";

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
      });

      reportElement.style.display = "none";

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const periodLabel = periodFilter === "all" ? "All" : periodFilter;
      pdf.save(`تقرير_الإقرار_الضريبي_${periodLabel}_${new Date().toISOString().split("T")[0]}.pdf`);
      success("تم تحميل تقرير الإقرار الضريبي (PDF) بنجاح");
    } catch (err) {
      console.error("PDF generation failed:", err);
      error("تعذر توليد تقرير PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Direct Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
            <span>السجل الضريبي وإقرار ضريبة القيمة المضافة (VAT Tax Records)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سجل المبيعات الخاضعة للضريبة الأساسية (15%) وإقرارات هيئة الزكاة والضريبة والجمارك (ZATCA Phase 1 & 2)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={loadTaxData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة الإقرار</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>تصدير تقرير PDF</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow-md transition-all hover:scale-[1.02]"
          >
            <Download className="w-4 h-4" />
            <span>تصدير ملف الإقرار (CSV/Excel)</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Taxable Base Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              المبيعات الخاضعة للضريبة 15%
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <CurrencyDisplay
              amount={taxSummary?.totalTaxableSales || 0}
              size="xl"
              className="text-slate-950 font-black"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              وعاء الضريبة الأساسي قبل احتساب 15%
            </p>
          </div>
        </div>

        {/* Card 2: Output VAT 15% */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">
              ضريبة المخرجات المستحقة (15% VAT)
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <CurrencyDisplay
              amount={taxSummary?.totalVatOutput || 0}
              size="xl"
              className="text-emerald-950 font-black"
            />
            <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>المبلغ المستحق سداده لهيئة الزكاة</span>
            </p>
          </div>
        </div>

        {/* Card 3: Total Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              إجمالي المبيعات شامل الضريبة
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <CurrencyDisplay
              amount={taxSummary?.totalGrandSales || 0}
              size="xl"
              className="text-slate-900 font-black"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              إجمالي الفواتير الصادرة للفترة المحددة
            </p>
          </div>
        </div>

        {/* Card 4: ZATCA Compliance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              الاعتماد والامتثال بهيئة الزكاة
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-emerald-900 font-mono">
                {taxSummary?.acceptedCount || 0}
              </span>
              <span className="text-xs text-slate-500 font-bold ms-1">
                من أصل {taxSummary?.invoiceCount || 0}
              </span>
            </div>
            <span className="text-xs font-black px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 font-mono">
              %{taxSummary?.complianceRate || 100}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            فواتير معتمدة ومشفرة بترميز TLV
          </p>
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-xs text-slate-900">
              خيارات التصفية والفترة الضريبية (Tax Filters & Period)
            </h3>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>إلغاء التصفية</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
            <input
              type="text"
              placeholder="ابحث برقم الفاتورة، اسم العميل، الرقم الضريبي..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-10 pe-4 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
            />
          </div>

          {/* Period Preset Dropdown */}
          <div>
            <select
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setStartDate("");
                setEndDate("");
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-emerald-500 font-semibold text-slate-700"
            >
              <option value="all">كافة الفترات المالية</option>
              <option value="2026-09">سبتمبر 2026 (الشهر الحالي)</option>
              <option value="2026-08">أغسطس 2026</option>
              <option value="2026-07">يوليو 2026</option>
              <option value="2026-Q3">الربع الثالث 2026 (Q3)</option>
              <option value="2026-Q2">الربع الثاني 2026 (Q2)</option>
              <option value="2026-Q1">الربع الأول 2026 (Q1)</option>
              <option value="2026">سنة 2026 كاملة</option>
            </select>
          </div>

          {/* ZATCA Status Filter */}
          <div>
            <select
              value={zatcaStatusFilter}
              onChange={(e) => setZatcaStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-emerald-500 font-semibold text-slate-700"
            >
              <option value="all">كل حالات الاعتماد بالزكاة</option>
              <option value="accepted">معتمدة بالزكاة (Accepted)</option>
              <option value="submitted">تم الرفع (Submitted)</option>
              <option value="not_submitted">غير مرفوعة (Not Submitted)</option>
              <option value="rejected">مرفوضة / خطأ (Rejected)</option>
            </select>
          </div>

          {/* Invoice Type Filter */}
          <div>
            <select
              value={invoiceTypeFilter}
              onChange={(e) => setInvoiceTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-emerald-500 font-semibold text-slate-700"
            >
              <option value="all">كافة أنواع الفواتير</option>
              <option value="tax_invoice">فاتورة ضريبية (B2B)</option>
              <option value="simplified_tax_invoice">فاتورة مبسطة (B2C)</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 min-w-16">
              من تاريخ:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodFilter("all");
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 min-w-16">
              إلى تاريخ:
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodFilter("all");
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Tax Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              تفاصيل الفواتير والعمليات الضريبية
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              بيانات المبيعات والضريبة المحصلة لكل فاتورة خاضعة للإقرار
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-700 font-bold">
              عدد الفواتير: {taxSummary?.invoiceCount || 0}
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-bold border border-emerald-200">
              الضريبة: {taxSummary?.totalVatOutput.toFixed(2)} ر.س
            </span>
          </div>
        </div>

        {/* Desktop Data Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 text-start"># الفاتورة</th>
                <th className="py-3.5 px-3 text-start">تاريخ الإصدار</th>
                <th className="py-3.5 px-4 text-start">العميل</th>
                <th className="py-3.5 px-4 text-start">الرقم الضريبي للعميل</th>
                <th className="py-3.5 px-3 text-end">المبلغ الخاضع للضريبة</th>
                <th className="py-3.5 px-3 text-center">النسبة</th>
                <th className="py-3.5 px-3 text-end">ضريبة القيمة المضافة</th>
                <th className="py-3.5 px-4 text-end">الإجمالي شامل الضريبة</th>
                <th className="py-3.5 px-3 text-center">اعتماد الزكاة</th>
                <th className="py-3.5 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(taxSummary?.invoices || []).map((inv, idx) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                    {inv.invoice_number}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">
                    {inv.issue_date}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div>
                      {inv.customer?.name_ar ||
                        inv.customer?.company_name ||
                        "عميل نقدي"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {inv.invoice_type === "tax_invoice" ? "شركة (B2B)" : "فرد (B2C)"}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    {inv.customer?.vat_number ? (
                      <span className="font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {inv.customer.vat_number}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">- غير مسجل -</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-end font-mono font-medium text-slate-800">
                    <CurrencyDisplay
                      amount={inv.taxable_amount || inv.subtotal}
                      size="sm"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-600">
                    15%
                  </td>
                  <td className="py-3.5 px-3 text-end font-mono text-emerald-950 font-bold">
                    <CurrencyDisplay amount={inv.vat_amount} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-end font-mono font-black text-slate-950">
                    <CurrencyDisplay amount={inv.grand_total} size="sm" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <StatusBadge zatcaStatus={inv.zatca_status} type="zatca" />
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {onViewInvoice && (
                      <button
                        onClick={() => onViewInvoice(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="عرض تفاصيل الفاتورة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!taxSummary || taxSummary.invoices.length === 0) && !isLoading && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    لا توجد سجلات ضريبية مطابقة لمعايير البحث والتصفية المحددة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Stacked Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {(taxSummary?.invoices || []).map((inv) => (
            <div key={inv.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-emerald-950">
                  {inv.invoice_number}
                </span>
                <StatusBadge zatcaStatus={inv.zatca_status} type="zatca" />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">
                    {inv.customer?.name_ar || inv.customer?.company_name || "عميل نقدي"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {inv.issue_date}
                  </span>
                </div>
                {inv.customer?.vat_number && (
                  <span className="font-mono text-[11px] text-emerald-900 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {inv.customer.vat_number}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">الخاضع للضريبة</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {(inv.taxable_amount || inv.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">الضريبة 15%</span>
                  <span className="font-mono font-bold text-emerald-900">
                    {(inv.vat_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">الإجمالي</span>
                  <span className="font-mono font-black text-slate-950">
                    {(inv.grand_total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {onViewInvoice && (
                <button
                  onClick={() => onViewInvoice(inv.id)}
                  className="w-full py-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة الفاتورة</span>
                </button>
              )}
            </div>
          ))}
          {(!taxSummary || taxSummary.invoices.length === 0) && !isLoading && (
            <div className="p-8 text-center text-slate-400 text-xs">
              لا توجد سجلات ضريبية مطابقة في هذه الفترة.
            </div>
          )}
        </div>
      </div>

      {/* Hidden Printable / PDF Template Layout */}
      <div
        ref={printableReportRef}
        style={{ display: "none" }}
        className="p-10 bg-white text-slate-900 max-w-[900px] mx-auto text-xs font-sans"
        dir="rtl"
      >
        {/* Printable Header */}
        <div className="border-b-2 border-emerald-900 pb-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-emerald-950">
              {company?.name_ar || "مؤسسة رند العز للمقاولات العامة"}
            </h1>
            <p className="text-xs text-slate-500">{company?.name_en}</p>
            <div className="mt-2 space-y-0.5 text-xs text-slate-700">
              <p>
                <span className="font-bold">الرقم الضريبي: </span>
                <span className="font-mono">{company?.vat_number || "310123456700003"}</span>
              </p>
              <p>
                <span className="font-bold">السجل التجاري: </span>
                <span className="font-mono">{company?.cr_number || "2051233487"}</span>
              </p>
            </div>
          </div>

          <div className="text-start bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h2 className="text-base font-black text-emerald-950 mb-1">
              تقرير الإقرار الضريبي للقيمة المضافة
            </h2>
            <p className="text-[11px] text-slate-600">
              الفترة: <span className="font-bold">{taxSummary?.period || "كافة الفترات"}</span>
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              تاريخ الطباعة: {new Date().toISOString().split("T")[0]}
            </p>
          </div>
        </div>

        {/* Printable Tax Totals Summary Box */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-bold block">عدد الفواتير</span>
            <span className="font-mono font-black text-base text-slate-900">
              {taxSummary?.invoiceCount || 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-bold block">الخاضع للضريبة (15%)</span>
            <span className="font-mono font-black text-base text-slate-900">
              {taxSummary?.totalTaxableSales.toFixed(2)} ر.س
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-800 font-bold block">ضريبة المخرجات (15%)</span>
            <span className="font-mono font-black text-base text-emerald-950">
              {taxSummary?.totalVatOutput.toFixed(2)} ر.س
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-bold block">المجموع شامل الضريبة</span>
            <span className="font-mono font-black text-base text-slate-900">
              {taxSummary?.totalGrandSales.toFixed(2)} ر.س
            </span>
          </div>
        </div>

        {/* Detailed Items Table for PDF */}
        <table className="w-full text-start text-[11px] border border-slate-200 mb-6">
          <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
            <tr>
              <th className="py-2 px-2.5 text-start">رقم الفاتورة</th>
              <th className="py-2 px-2 text-start">التاريخ</th>
              <th className="py-2 px-2.5 text-start">العميل</th>
              <th className="py-2 px-2 text-start">الرقم الضريبي</th>
              <th className="py-2 px-2.5 text-end">الخاضع للضريبة</th>
              <th className="py-2 px-2.5 text-end">الضريبة (15%)</th>
              <th className="py-2 px-2.5 text-end">الإجمالي</th>
              <th className="py-2 px-2 text-center">الاعتماد</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(taxSummary?.invoices || []).map((inv) => (
              <tr key={inv.id}>
                <td className="py-2 px-2.5 font-mono font-bold">{inv.invoice_number}</td>
                <td className="py-2 px-2 font-mono">{inv.issue_date}</td>
                <td className="py-2 px-2.5 font-semibold">
                  {inv.customer?.name_ar || inv.customer?.company_name || "عميل نقدي"}
                </td>
                <td className="py-2 px-2 font-mono">{inv.customer?.vat_number || "-"}</td>
                <td className="py-2 px-2.5 text-end font-mono">
                  {(inv.taxable_amount || inv.subtotal || 0).toFixed(2)}
                </td>
                <td className="py-2 px-2.5 text-end font-mono font-bold">
                  {(inv.vat_amount || 0).toFixed(2)}
                </td>
                <td className="py-2 px-2.5 text-end font-mono font-black">
                  {(inv.grand_total || 0).toFixed(2)}
                </td>
                <td className="py-2 px-2 text-center">
                  {inv.zatca_status === "accepted" ? "معتمد" : "قيد المعالجة"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Official Footer Declaration */}
        <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
          <div>
            <p>هذا المستند مستخرج آلياً من نظام الفوترة والامتثال الضريبي لمؤسسة رند العز للمقاولات العامة.</p>
            <p className="mt-1">معتمد ومطابق للائحة التنفيذية لهيئة الزكاة والضريبة والجمارك (ZATCA).</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800 mb-6">الختم والتوقيع الرسمي للمنشأة</p>
            <div className="w-32 border-b border-dashed border-slate-400 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};
