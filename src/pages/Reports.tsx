import React, { useEffect, useState, useMemo } from "react";
import { InvoiceService } from "../services/invoiceService";
import { CustomerService } from "../services/customerService";
import { LocalStore } from "../services/storage/localStore";
import { Invoice, Customer, ZatcaSubmission, InvoiceStatus, ZatcaStatus } from "../types/database";
import { CurrencyDisplay } from "../components/common/CurrencyDisplay";
import { StatusBadge } from "../components/common/StatusBadge";
import { useToast } from "../contexts/ToastContext";
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  Receipt,
  Users,
  ShieldCheck,
  Printer,
  Clock,
  FileText,
  CalendarDays,
  CalendarRange,
  DollarSign,
  Search,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type ReportType =
  | "sales"
  | "vat"
  | "customer"
  | "daily"
  | "monthly"
  | "yearly"
  | "outstanding"
  | "zatca";

export const Reports: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [submissions, setSubmissions] = useState<ZatcaSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Report Tab
  const [reportType, setReportType] = useState<ReportType>("sales");

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [zatcaStatusFilter, setZatcaStatusFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<string>("all");

  const { success, error, info } = useToast();

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    setIsLoading(true);
    try {
      const [invList, custList] = await Promise.all([
        InvoiceService.getInvoices(),
        CustomerService.getCustomers(),
      ]);
      setInvoices(invList);
      setCustomers(custList);
      setSubmissions(LocalStore.getSubmissions());
    } catch (err) {
      console.error("Error loading reports data:", err);
      error("تعذر تحميل بيانات التقارير");
    } finally {
      setIsLoading(false);
    }
  };

  // Preset Date Handlers
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === "this_quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), currentQuarter * 3, 1)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === "this_year") {
      const firstDay = new Date(now.getFullYear(), 0, 1)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Date filter
      if (startDate && inv.issue_date < startDate) return false;
      if (endDate && inv.issue_date > endDate) return false;

      // Customer filter
      if (customerFilter !== "all" && inv.customer_id !== customerFilter) return false;

      // Status filter
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;

      // ZATCA status filter
      if (zatcaStatusFilter !== "all" && inv.zatca_status !== zatcaStatusFilter) return false;

      // Specific report constraints
      if (reportType === "outstanding") {
        if (inv.status === "paid" || inv.status === "cancelled") return false;
      }

      if (reportType === "daily") {
        const targetDate = startDate || new Date().toISOString().split("T")[0];
        if (inv.issue_date !== targetDate) return false;
      }

      return true;
    });
  }, [
    invoices,
    startDate,
    endDate,
    customerFilter,
    statusFilter,
    zatcaStatusFilter,
    reportType,
  ]);

  // Aggregated Summary Stats for Current View
  const reportTotals = useMemo(() => {
    const active = filteredInvoices.filter((i) => i.status !== "cancelled");
    const count = filteredInvoices.length;
    const taxable = active.reduce((s, i) => s + (i.taxable_amount || i.subtotal || 0), 0);
    const vat = active.reduce((s, i) => s + (i.vat_amount || 0), 0);
    const grand = active.reduce((s, i) => s + (i.grand_total || 0), 0);
    const paid = active.reduce((s, i) => s + (i.paid_amount || (i.status === "paid" ? i.grand_total : 0)), 0);
    const outstanding = Math.max(0, grand - paid);

    return { count, taxable, vat, grand, paid, outstanding };
  }, [filteredInvoices]);

  // Customer Summary Breakdown
  const customerBreakdown = useMemo(() => {
    return customers
      .map((c) => {
        const custInvoices = filteredInvoices.filter((i) => i.customer_id === c.id);
        const activeCust = custInvoices.filter((i) => i.status !== "cancelled");
        const total = activeCust.reduce((s, i) => s + (i.grand_total || 0), 0);
        const vat = activeCust.reduce((s, i) => s + (i.vat_amount || 0), 0);
        const paid = activeCust.reduce((s, i) => s + (i.paid_amount || (i.status === "paid" ? i.grand_total : 0)), 0);
        const outstanding = Math.max(0, total - paid);

        return {
          customer: c,
          invoiceCount: custInvoices.length,
          total,
          vat,
          paid,
          outstanding,
        };
      })
      .filter((cb) => cb.invoiceCount > 0 || customerFilter === cb.customer.id)
      .sort((a, b) => b.total - a.total);
  }, [customers, filteredInvoices, customerFilter]);

  // Monthly Aggregation Breakdown (For Monthly/Yearly Report)
  const monthlyBreakdown = useMemo(() => {
    const map: Record<string, { month: string; count: number; taxable: number; vat: number; total: number; paid: number }> = {};

    filteredInvoices.forEach((inv) => {
      if (inv.status === "cancelled") return;
      const monthKey = inv.issue_date ? inv.issue_date.slice(0, 7) : "Unknown"; // e.g. 2026-09
      if (!map[monthKey]) {
        map[monthKey] = {
          month: monthKey,
          count: 0,
          taxable: 0,
          vat: 0,
          total: 0,
          paid: 0,
        };
      }
      map[monthKey].count += 1;
      map[monthKey].taxable += inv.taxable_amount || inv.subtotal || 0;
      map[monthKey].vat += inv.vat_amount || 0;
      map[monthKey].total += inv.grand_total || 0;
      map[monthKey].paid += inv.paid_amount || (inv.status === "paid" ? inv.grand_total : 0);
    });

    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [filteredInvoices]);

  // --- Export CSV ---
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (reportType === "customer") {
      headers = [
        "اسم العميل",
        "الرقم الضريبي",
        "عدد الفواتير",
        "إجمالي المشتريات (ر.س)",
        "الضريبة (15%)",
        "المسدد (ر.س)",
        "المستحق المعلق (ر.س)",
      ];
      rows = customerBreakdown.map((cb) => [
        `"${cb.customer.name_ar || cb.customer.company_name}"`,
        `"${cb.customer.vat_number || "-"}"`,
        cb.invoiceCount,
        cb.total.toFixed(2),
        cb.vat.toFixed(2),
        cb.paid.toFixed(2),
        cb.outstanding.toFixed(2),
      ]);
    } else if (reportType === "monthly" || reportType === "yearly") {
      headers = ["الشهر / الفترة", "عدد الفواتير", "المبلغ الخاضع للضريبة", "الضريبة 15%", "الإجمالي شامل الضريبة", "المسدد"];
      rows = monthlyBreakdown.map((mb) => [
        `"${mb.month}"`,
        mb.count,
        mb.taxable.toFixed(2),
        mb.vat.toFixed(2),
        mb.total.toFixed(2),
        mb.paid.toFixed(2),
      ]);
    } else if (reportType === "zatca") {
      headers = ["رقم الفاتورة", "العميل", "معرف الإرسالية UUID", "بيئة العمل", "حالة الزكاة", "التاريخ"];
      rows = filteredInvoices.map((inv) => [
        `"${inv.invoice_number}"`,
        `"${inv.customer?.name_ar || "عميل نقدي"}"`,
        `"${inv.zatca_uuid || inv.id}"`,
        "Sandbox / Production",
        `"${inv.zatca_status}"`,
        `"${inv.issue_date}"`,
      ]);
    } else {
      headers = [
        "رقم الفاتورة",
        "العميل",
        "الرقم الضريبي",
        "تاريخ الإصدار",
        "المبلغ الخاضع للضريبة (ر.س)",
        "الضريبة 15% (ر.س)",
        "الإجمالي شامل الضريبة (ر.س)",
        "حالة السداد",
        "حالة الزكاة",
      ];
      rows = filteredInvoices.map((i) => [
        `"${i.invoice_number}"`,
        `"${i.customer?.name_ar || i.customer?.company_name || "عميل نقدي"}"`,
        `"${i.customer?.vat_number || "-"}"`,
        `"${i.issue_date}"`,
        (i.taxable_amount || i.subtotal || 0).toFixed(2),
        (i.vat_amount || 0).toFixed(2),
        (i.grand_total || 0).toFixed(2),
        `"${i.status}"`,
        `"${i.zatca_status}"`,
      ]);
    }

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Alezz_${reportType}_Report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("تم تصدير التقرير بنجاح (CSV / Excel)");
  };

  // --- Export / Print PDF ---
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2 border border-emerald-200/60">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            مركز التقارير المالية والإقرارات الضريبية
          </div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            منظومة التقارير والتحليلات الشاملة (Financial & Tax Reports)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تقارير المبيعات، الإقرار الضريبي، كشوفات حسابات العملاء، الفواتير المعلقة، وسجلات الزكاة
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>تصدير CSV / Excel</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة / PDF</span>
          </button>
        </div>
      </div>

      {/* 8 Specialized Report Type Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <button
          onClick={() => setReportType("sales")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            reportType === "sales"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>تقرير المبيعات الشامل</span>
        </button>

        <button
          onClick={() => setReportType("vat")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            reportType === "vat"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>تقرير الإقرار الضريبي (15%)</span>
        </button>

        <button
          onClick={() => setReportType("customer")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            reportType === "customer"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>كشف حسابات العملاء</span>
        </button>

        <button
          onClick={() => setReportType("daily")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            reportType === "daily"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>التقرير اليومي</span>
        </button>

        <button
          onClick={() => setReportType("monthly")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            reportType === "monthly"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>التقرير الشهري</span>
        </button>

        <button
          onClick={() => setReportType("yearly")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            reportType === "yearly"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>التقرير السنوي</span>
        </button>

        <button
          onClick={() => setReportType("outstanding")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            reportType === "outstanding"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>المستحقات المعلقة</span>
        </button>

        <button
          onClick={() => setReportType("zatca")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            reportType === "zatca"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-zatca-gold" />
          <span>إرساليات هيئة الزكاة</span>
        </button>
      </div>

      {/* Multidimensional Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => handlePresetChange("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                datePreset === "all" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"
              }`}
            >
              كافة الفترات
            </button>
            <button
              onClick={() => handlePresetChange("today")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                datePreset === "today" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => handlePresetChange("this_month")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                datePreset === "this_month" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => handlePresetChange("this_quarter")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                datePreset === "this_quarter" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"
              }`}
            >
              هذا الربع
            </button>
            <button
              onClick={() => handlePresetChange("this_year")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                datePreset === "this_year" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"
              }`}
            >
              هذا العام
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("custom");
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white"
            />
            <span className="text-xs font-bold text-slate-500">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset("custom");
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white"
            />
          </div>

          {/* Customer Filter */}
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
          >
            <option value="all">كافة العملاء</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar || c.company_name}
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
          >
            <option value="all">كافة حالات السداد</option>
            <option value="paid">مدفوعة</option>
            <option value="unpaid">غير مدفوعة</option>
            <option value="partially_paid">مدفوعة جزئياً</option>
            <option value="draft">مسودة</option>
          </select>

          {/* ZATCA Status Filter */}
          <select
            value={zatcaStatusFilter}
            onChange={(e) => setZatcaStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
          >
            <option value="all">كافة حالات الزكاة</option>
            <option value="accepted">معتمدة بالزكاة</option>
            <option value="pending">بانتظار الرفع</option>
            <option value="rejected">مرفوضة / خطأ</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block">عدد الفواتير</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
            {reportTotals.count}
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block">المبلغ الخاضع للضريبة</span>
          <CurrencyDisplay amount={reportTotals.taxable} size="sm" className="font-black text-slate-900 mt-1 block" />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-blue-600 block">ضريبة 15%</span>
          <CurrencyDisplay amount={reportTotals.vat} size="sm" className="font-black text-blue-950 mt-1 block" />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 block">الإجمالي شامل الضريبة</span>
          <CurrencyDisplay amount={reportTotals.grand} size="sm" className="font-black text-emerald-950 mt-1 block" />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 block">المسدد فعلياً</span>
          <CurrencyDisplay amount={reportTotals.paid} size="sm" className="font-black text-emerald-800 mt-1 block" />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 block">المستحق المعلق</span>
          <CurrencyDisplay amount={reportTotals.outstanding} size="sm" className="font-black text-amber-950 mt-1 block" />
        </div>
      </div>

      {/* Dynamic Report Data Table */}
      {reportType === "customer" ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">
              كشف حسابات ومبيعات العملاء الشامل
            </h3>
            <p className="text-xs text-slate-500">
              إجمالي المشتريات، الضريبة المحصلة، المبالغ المسددة، والأرصدة المستحقة لكل عميل
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">العميل</th>
                  <th className="py-3 px-4 text-start">الرقم الضريبي</th>
                  <th className="py-3 px-4 text-center">عدد الفواتير</th>
                  <th className="py-3 px-4 text-end">إجمالي المبيعات</th>
                  <th className="py-3 px-4 text-end">الضريبة (15%)</th>
                  <th className="py-3 px-4 text-end">المسدد</th>
                  <th className="py-3 px-4 text-end">المتبقي المعلق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerBreakdown.map((cb, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900 text-sm">
                      {cb.customer.name_ar}
                      {cb.customer.company_name && (
                        <span className="block text-[11px] text-slate-500 font-normal">
                          {cb.customer.company_name}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-700">
                      {cb.customer.vat_number || "-"}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                      {cb.invoiceCount}
                    </td>
                    <td className="py-4 px-4 text-end font-mono font-bold text-slate-900">
                      <CurrencyDisplay amount={cb.total} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-end font-mono text-blue-700">
                      <CurrencyDisplay amount={cb.vat} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-end font-mono text-emerald-700 font-semibold">
                      <CurrencyDisplay amount={cb.paid} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-end font-mono text-amber-700 font-bold">
                      <CurrencyDisplay amount={cb.outstanding} size="sm" />
                    </td>
                  </tr>
                ))}
                {customerBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      لا توجد بيانات مطابقة لخيارات التصفية المحددة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : reportType === "monthly" || reportType === "yearly" ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">
              التقرير المالي التراكمي حسب الفترات
            </h3>
            <p className="text-xs text-slate-500">
              توزيع المبيعات وضريبة القيمة المضافة والمبالغ المحصلة شهرياً
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">الشهر / الفترة</th>
                  <th className="py-3 px-4 text-center">عدد الفواتير</th>
                  <th className="py-3 px-4 text-end">المبلغ الخاضع للضريبة</th>
                  <th className="py-3 px-4 text-end">الضريبة (15%)</th>
                  <th className="py-3 px-4 text-end">الإجمالي شامل الضريبة</th>
                  <th className="py-3 px-4 text-end">المسدد فعلياً</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyBreakdown.map((mb, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900 text-sm">
                      {mb.month}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                      {mb.count}
                    </td>
                    <td className="py-4 px-4 text-end font-mono">
                      <CurrencyDisplay amount={mb.taxable} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-end font-mono text-blue-700 font-semibold">
                      <CurrencyDisplay amount={mb.vat} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-end font-mono font-bold text-slate-900">
                      <CurrencyDisplay amount={mb.total} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-end font-mono text-emerald-700 font-bold">
                      <CurrencyDisplay amount={mb.paid} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                تفاصيل الفواتير والمعاملات المالية
              </h3>
              <p className="text-xs text-slate-500">
                عرض تفصيلي حسب معايير التصفية والبحث المحددة
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {filteredInvoices.length} فاتورة
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">رقم الفاتورة</th>
                  <th className="py-3 px-4 text-start">العميل</th>
                  <th className="py-3 px-4 text-start">تاريخ الإصدار</th>
                  <th className="py-3 px-4 text-end">المبلغ الخاضع</th>
                  <th className="py-3 px-4 text-end">الضريبة (15%)</th>
                  <th className="py-3 px-4 text-end">الإجمالي شامل الضريبة</th>
                  <th className="py-3 px-4 text-center">حالة السداد</th>
                  <th className="py-3 px-4 text-center">حالة الزكاة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {inv.customer?.name_ar || inv.customer?.company_name || "عميل نقدي"}
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
                      <StatusBadge status={inv.status} type="invoice" />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge zatcaStatus={inv.zatca_status} type="zatca" />
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                      لا توجد فواتير مطابقة لخيارات التصفية المحددة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
