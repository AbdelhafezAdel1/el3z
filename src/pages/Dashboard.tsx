import React, { useEffect, useState, useMemo } from "react";
import { InvoiceService } from "../services/invoiceService";
import { Invoice } from "../types/database";
import { CurrencyDisplay } from "../components/common/CurrencyDisplay";
import { StatusBadge } from "../components/common/StatusBadge";
import { NavigationTab } from "../components/layout/Sidebar";
import {
  TrendingUp,
  Receipt,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
  Users,
  History,
  FileSpreadsheet,
  ArrowUpRight,
  Sparkles,
  FileText,
  CreditCard,
  Ban,
  Wrench,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  onViewInvoice: (id: string) => void;
}

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onViewInvoice,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const data = await InvoiceService.getInvoices();
      setInvoices(data);
    } catch (err) {
      console.error("Error loading real dashboard data from Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Real Metric Computations (Zero Mock Data) ---
  const activeInvoices = useMemo(
    () => invoices.filter((i) => i.status !== "cancelled"),
    [invoices],
  );

  const totalInvoicesCount = invoices.length;

  const totalSales = useMemo(
    () => activeInvoices.reduce((acc, i) => acc + (i.grand_total || 0), 0),
    [activeInvoices],
  );

  const totalVat = useMemo(
    () => activeInvoices.reduce((acc, i) => acc + (i.vat_amount || 0), 0),
    [activeInvoices],
  );

  const paidInvoices = useMemo(
    () => activeInvoices.filter((i) => i.status === "paid"),
    [activeInvoices],
  );
  const totalPaidAmount = useMemo(
    () => paidInvoices.reduce((acc, i) => acc + (i.grand_total || 0), 0),
    [paidInvoices],
  );

  const unpaidInvoices = useMemo(
    () =>
      activeInvoices.filter(
        (i) => i.status === "unpaid" || i.status === "partially_paid" || i.status === "issued",
      ),
    [activeInvoices],
  );
  const totalUnpaidAmount = useMemo(
    () =>
      unpaidInvoices.reduce(
        (acc, i) => acc + Math.max(0, (i.grand_total || 0) - (i.paid_amount || 0)),
        0,
      ),
    [unpaidInvoices],
  );

  const draftInvoices = useMemo(
    () => invoices.filter((i) => i.status === "draft"),
    [invoices],
  );
  const totalDraftAmount = useMemo(
    () => draftInvoices.reduce((acc, i) => acc + (i.grand_total || 0), 0),
    [draftInvoices],
  );

  const zatcaAcceptedCount = useMemo(
    () => invoices.filter((i) => i.zatca_status === "accepted").length,
    [invoices],
  );

  const zatcaRejectedCount = useMemo(
    () =>
      invoices.filter(
        (i) => i.zatca_status === "rejected" || i.zatca_status === "error",
      ).length,
    [invoices],
  );

  const zatcaPendingCount = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.zatca_status === "not_submitted" ||
          i.zatca_status === "pending",
      ).length,
    [invoices],
  );

  // --- Real Monthly Sales & VAT Calculation ---
  const currentYear = new Date().getFullYear();
  const monthlyData = useMemo(() => {
    const months = ARABIC_MONTHS.map((monthName, idx) => {
      const monthNum = idx + 1;
      // Filter invoices belonging to this month in current year
      const monthInvoices = activeInvoices.filter((inv) => {
        if (!inv.issue_date) return false;
        const d = new Date(inv.issue_date);
        return (
          d.getFullYear() === currentYear && d.getMonth() + 1 === monthNum
        );
      });

      const sales = monthInvoices.reduce(
        (sum, i) => sum + (i.grand_total || 0),
        0,
      );
      const vat = monthInvoices.reduce(
        (sum, i) => sum + (i.vat_amount || 0),
        0,
      );

      return {
        month: monthName,
        sales: Number(sales.toFixed(2)),
        vat: Number(vat.toFixed(2)),
        count: monthInvoices.length,
      };
    });

    return months;
  }, [activeInvoices, currentYear]);

  // --- Real Payment Status Pie Distribution ---
  const statusPieData = useMemo(() => {
    const data = [
      {
        name: "مدفوعة",
        value: paidInvoices.length,
        color: "#10b981", // Emerald
      },
      {
        name: "معلقة / غير مدفوعة",
        value: unpaidInvoices.length,
        color: "#f59e0b", // Amber
      },
      {
        name: "مسودة",
        value: draftInvoices.length,
        color: "#94a3b8", // Slate
      },
    ];
    // Filter out 0 value entries for clean render, but if all 0, provide empty indicator
    const hasData = data.some((d) => d.value > 0);
    if (!hasData) {
      return [{ name: "لا توجد فواتير", value: 1, color: "#e2e8f0" }];
    }
    return data.filter((d) => d.value > 0);
  }, [paidInvoices, unpaidInvoices, draftInvoices]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              نظام الفوترة والامتثال الضريبي (ZATCA) المباشر
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              شركة العز للمقاولات العامة
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              لوحة التحكم المركزية للمبيعات، الإقرارات الضريبية، وحالات الربط والاعتماد الإلكتروني.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("create_invoice")}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-lg transition-all hover:scale-[1.02] text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء فاتورة جديدة</span>
            </button>
            <button
              onClick={() => onNavigate("zatca")}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3 rounded-2xl border border-white/15 transition-all text-sm backdrop-blur-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>رفع للزكاة والضريبة ({zatcaPendingCount})</span>
            </button>
          </div>
        </div>

        <div className="absolute top-0 end-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 8 KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* 1. Total Invoices */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الفواتير الصادرة</span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {totalInvoicesCount}
            </span>
            <span className="text-xs font-bold text-slate-400">فاتورة مسجلة</span>
          </div>
        </div>

        {/* 2. Total Sales */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي المبيعات (شامل الضريبة)</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <CurrencyDisplay
              amount={totalSales}
              size="xl"
              className="text-emerald-950 font-black"
            />
            <p className="mt-1 text-[11px] text-slate-400 font-medium">
              الفواتير النشطة لعام {currentYear}
            </p>
          </div>
        </div>

        {/* 3. Total VAT (15%) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ضريبة القيمة المضافة (15%)</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <CurrencyDisplay
              amount={totalVat}
              size="xl"
              className="text-blue-950 font-black"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              المحصل الفعلي للإقرار الضريبي
            </p>
          </div>
        </div>

        {/* 4. Total Paid */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المبالغ المسددة (Paid)</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <CurrencyDisplay
              amount={totalPaidAmount}
              size="xl"
              className="text-emerald-800 font-black"
            />
            <p className="mt-1 text-[11px] text-emerald-700 font-bold">
              {paidInvoices.length} فاتورة مدفوعة بالكامل
            </p>
          </div>
        </div>

        {/* 5. Unpaid / Outstanding */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المستحقات المعلقة (Unpaid)</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <CurrencyDisplay
              amount={totalUnpaidAmount}
              size="xl"
              className="text-amber-950 font-black"
            />
            <p className="mt-1 text-[11px] text-amber-700 font-bold">
              {unpaidInvoices.length} فاتورة بانتظار التحصيل
            </p>
          </div>
        </div>

        {/* 6. Draft Invoices */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المسودات (Drafts)</span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <CurrencyDisplay
              amount={totalDraftAmount}
              size="xl"
              className="text-slate-700 font-black"
            />
            <p className="mt-1 text-[11px] text-slate-500 font-medium">
              {draftInvoices.length} مسودة غير معتمدة
            </p>
          </div>
        </div>

        {/* 7. ZATCA Accepted */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">معتمدة بهيئة الزكاة</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
              {zatcaAcceptedCount}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              امتثال تام 100%
            </span>
          </div>
        </div>

        {/* 8. ZATCA Rejected */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">مرفوضة / أخطاء الزكاة</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-700 font-mono">
              {zatcaRejectedCount}
            </span>
            <span className={`text-xs font-bold ${zatcaRejectedCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
              {zatcaRejectedCount > 0 ? "تتطلب مراجعة" : "لا توجد أخطاء"}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales & VAT Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                حركة المبيعات والضريبة الفعلية لعام {currentYear}
              </h3>
              <p className="text-xs text-slate-500">
                بيانات حقيقية مستخرجة مباشرة من قاعدة بيانات الفواتير
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              ريال سعودي (SAR)
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toLocaleString("en-US", { minimumFractionDigits: 2 })} ر.س`,
                    "",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    direction: "rtl",
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="left"
                  wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
                />
                <Bar
                  dataKey="sales"
                  name="المبيعات (شامل الضريبة)"
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="vat"
                  name="ضريبة 15%"
                  fill="#0284c7"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Payment Status Distribution (1 Col) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              حالات التحصيل والسداد
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              توزيع الفواتير حسب حالة السداد الفعلي
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, "فاتورة"]} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between">
            <span>إجمالي الفواتير بالنظام:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {totalInvoicesCount} فاتورة
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate("create_invoice")}
          className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all group text-center shadow-xs"
        >
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 group-hover:scale-110 transition-transform mb-2">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-slate-900">إنشاء فاتورة</span>
          <span className="text-[11px] text-slate-500 mt-0.5">ضريبية / مبسطة</span>
        </button>

        <button
          onClick={() => onNavigate("customers")}
          className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all group text-center shadow-xs"
        >
          <div className="p-3 rounded-2xl bg-blue-100 text-blue-700 group-hover:scale-110 transition-transform mb-2">
            <Users className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-slate-900">إدارة العملاء</span>
          <span className="text-[11px] text-slate-500 mt-0.5">سجلات وبيانات العملاء</span>
        </button>

        <button
          onClick={() => onNavigate("zatca")}
          className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 transition-all group text-center shadow-xs"
        >
          <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-slate-900">منصة الزكاة (ZATCA)</span>
          <span className="text-[11px] text-slate-500 mt-0.5">رفع وتوثيق الفواتير</span>
        </button>

        <button
          onClick={() => onNavigate("reports")}
          className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 transition-all group text-center shadow-xs"
        >
          <div className="p-3 rounded-2xl bg-purple-100 text-purple-700 group-hover:scale-110 transition-transform mb-2">
            <BarChart3 className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm text-slate-900">التقارير المالية</span>
          <span className="text-[11px] text-slate-500 mt-0.5">كشوفات المبيعات والإقرار</span>
        </button>
      </div>

      {/* Recent Invoices Table (Real Data) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              أحدث الفواتير المسجلة
            </h3>
            <p className="text-xs text-slate-500">
              قائمة الفواتير الحديثة الصادرة في النظام
            </p>
          </div>
          <button
            onClick={() => onNavigate("invoice_history")}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
          >
            <span>عرض كافة الفواتير</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
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
                <th className="py-3 px-4 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.slice(0, 6).map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                    {inv.invoice_number}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {inv.customer?.name_ar || inv.customer?.company_name || "عميل نقدي"}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {inv.issue_date}
                  </td>
                  <td className="py-3.5 px-4 text-end font-mono">
                    <CurrencyDisplay
                      amount={inv.taxable_amount || inv.subtotal}
                      size="sm"
                    />
                  </td>
                  <td className="py-3.5 px-4 text-end font-mono text-slate-700">
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
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onViewInvoice(inv.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 font-semibold transition-colors"
                    >
                      معاينة
                    </button>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-sm">
                    لا توجد فواتير بعد في قاعدة البيانات. اضغط على "إنشاء فاتورة جديدة" لإصدار أول فاتورة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
