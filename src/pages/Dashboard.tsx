import React, { useEffect, useState, useMemo } from "react";
import { InvoiceService } from "../services/invoiceService";
import { CustomerService } from "../services/customerService";
import { VoucherService, VoucherStats } from "../services/voucherService";
import { Invoice, Customer, Voucher } from "../types/database";
import { CurrencyDisplay } from "../components/common/CurrencyDisplay";
import { StatusBadge } from "../components/common/StatusBadge";
import { NavigationTab } from "../routes";
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
  ArrowDownLeft,
  Sparkles,
  FileText,
  CreditCard,
  Ban,
  Wrench,
  BarChart3,
  Calendar,
  Filter,
  DollarSign,
  UserPlus,
  Check,
  X,
  Eye,
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
  AreaChart,
  Area,
} from "recharts";

interface DashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  onViewInvoice: (id: string) => void;
  onOpenCustomerModal?: () => void;
  onOpenServiceModal?: () => void;
}

const ARABIC_MONTHS = [
  { value: 1, name: "يناير" },
  { value: 2, name: "فبراير" },
  { value: 3, name: "مارس" },
  { value: 4, name: "أبريل" },
  { value: 5, name: "مايو" },
  { value: 6, name: "يونيو" },
  { value: 7, name: "يوليو" },
  { value: 8, name: "أغسطس" },
  { value: 9, name: "سبتمبر" },
  { value: 10, name: "أكتوبر" },
  { value: 11, name: "نوفمبر" },
  { value: 12, name: "ديسمبر" },
];

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onViewInvoice,
  onOpenCustomerModal,
  onOpenServiceModal,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Time Filters State
  type PresetFilter = "all" | "today" | "this_month" | "this_year" | "custom";
  const [activePreset, setActivePreset] = useState<PresetFilter>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterDay, setFilterDay] = useState<string>("");

  // Chart view mode
  const [chartMode, setChartMode] = useState<"sales_vat" | "cash_flow">("sales_vat");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [invData, custData, vouchData] = await Promise.all([
        InvoiceService.getInvoices(),
        CustomerService.getCustomers(),
        VoucherService.getVouchers(),
      ]);
      setInvoices(invData);
      setCustomers(custData);
      setVouchers(vouchData);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Preset Handlers
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const currentYearStr = useMemo(() => new Date().getFullYear().toString(), []);
  const currentMonthNum = useMemo(() => String(new Date().getMonth() + 1).padStart(2, "0"), []);

  const handleSelectPreset = (preset: PresetFilter) => {
    setActivePreset(preset);
    if (preset === "all") {
      setFilterYear("all");
      setFilterMonth("all");
      setFilterDay("");
    } else if (preset === "today") {
      setFilterYear(currentYearStr);
      setFilterMonth(currentMonthNum);
      setFilterDay(todayStr);
    } else if (preset === "this_month") {
      setFilterYear(currentYearStr);
      setFilterMonth(currentMonthNum);
      setFilterDay("");
    } else if (preset === "this_year") {
      setFilterYear(currentYearStr);
      setFilterMonth("all");
      setFilterDay("");
    }
  };

  const handleCustomYearChange = (year: string) => {
    setActivePreset("custom");
    setFilterYear(year);
  };

  const handleCustomMonthChange = (month: string) => {
    setActivePreset("custom");
    setFilterMonth(month);
  };

  const handleCustomDayChange = (day: string) => {
    setActivePreset("custom");
    setFilterDay(day);
  };

  const handleClearFilters = () => {
    setActivePreset("all");
    setFilterYear("all");
    setFilterMonth("all");
    setFilterDay("");
  };

  // Filtered Invoices based on Date Filters
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.status === "cancelled") return false;
      const invDate = inv.issue_date || "";

      if (filterDay) {
        return invDate === filterDay;
      }

      if (filterYear !== "all") {
        if (!invDate.startsWith(filterYear)) return false;
      }

      if (filterMonth !== "all") {
        const parts = invDate.split("-");
        if (parts.length >= 2 && parts[1] !== filterMonth) return false;
      }

      return true;
    });
  }, [invoices, filterYear, filterMonth, filterDay]);

  // Filtered Vouchers based on Date Filters
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const vDate = v.date || "";

      if (filterDay) {
        return vDate === filterDay;
      }

      if (filterYear !== "all") {
        if (!vDate.startsWith(filterYear)) return false;
      }

      if (filterMonth !== "all") {
        const parts = vDate.split("-");
        if (parts.length >= 2 && parts[1] !== filterMonth) return false;
      }

      return true;
    });
  }, [vouchers, filterYear, filterMonth, filterDay]);

  // --- KPI Metrics ---
  // 1. Customers Count
  const totalCustomersCount = customers.length;
  const activeCustomersCount = customers.filter((c) => c.is_active).length;
  const filteredCustomerIds = useMemo(() => {
    const ids = new Set<string>();
    filteredInvoices.forEach((i) => {
      if (i.customer_id) ids.add(i.customer_id);
    });
    return ids.size;
  }, [filteredInvoices]);

  // 2. Amounts Calculations
  const totalSales = useMemo(
    () => filteredInvoices.reduce((acc, i) => acc + (i.grand_total || 0), 0),
    [filteredInvoices],
  );

  const totalTaxable = useMemo(
    () => filteredInvoices.reduce((acc, i) => acc + (i.taxable_amount || i.subtotal || 0), 0),
    [filteredInvoices],
  );

  const totalVat = useMemo(
    () => filteredInvoices.reduce((acc, i) => acc + (i.vat_amount || 0), 0),
    [filteredInvoices],
  );

  const paidInvoices = useMemo(
    () => filteredInvoices.filter((i) => i.status === "paid"),
    [filteredInvoices],
  );
  const totalPaidAmount = useMemo(
    () => paidInvoices.reduce((acc, i) => acc + (i.grand_total || 0), 0),
    [paidInvoices],
  );

  const unpaidInvoices = useMemo(
    () =>
      filteredInvoices.filter(
        (i) => i.status === "unpaid" || i.status === "partially_paid" || i.status === "issued",
      ),
    [filteredInvoices],
  );
  const totalUnpaidAmount = useMemo(
    () =>
      unpaidInvoices.reduce(
        (acc, i) => acc + Math.max(0, (i.grand_total || 0) - (i.paid_amount || 0)),
        0,
      ),
    [unpaidInvoices],
  );

  // Vouchers Totals
  const totalReceipts = useMemo(
    () => filteredVouchers.filter((v) => v.type === "receipt").reduce((acc, v) => acc + (v.amount || 0), 0),
    [filteredVouchers],
  );
  const totalPayments = useMemo(
    () => filteredVouchers.filter((v) => v.type === "payment").reduce((acc, v) => acc + (v.amount || 0), 0),
    [filteredVouchers],
  );

  // ZATCA Metrics
  const zatcaAcceptedCount = useMemo(
    () => filteredInvoices.filter((i) => i.zatca_status === "accepted").length,
    [filteredInvoices],
  );
  const zatcaPendingCount = useMemo(
    () =>
      filteredInvoices.filter(
        (i) => i.zatca_status === "not_submitted" || i.zatca_status === "pending",
      ).length,
    [filteredInvoices],
  );

  // --- Dynamic Chart Data based on Filter ---
  const chartData = useMemo(() => {
    // If a specific month is selected, show daily data for that month (Days 1 to 31)
    if (filterMonth !== "all") {
      const daysCount = 31;
      const days = [];
      const mStr = filterMonth;
      const yrStr = filterYear !== "all" ? filterYear : currentYearStr;

      for (let day = 1; day <= daysCount; day++) {
        const dStr = String(day).padStart(2, "0");
        const fullDate = `${yrStr}-${mStr}-${dStr}`;

        const dayInvoices = filteredInvoices.filter((i) => i.issue_date === fullDate);
        const dayReceipts = filteredVouchers.filter((v) => v.type === "receipt" && v.date === fullDate);
        const dayPayments = filteredVouchers.filter((v) => v.type === "payment" && v.date === fullDate);

        const sales = dayInvoices.reduce((acc, i) => acc + (i.grand_total || 0), 0);
        const vat = dayInvoices.reduce((acc, i) => acc + (i.vat_amount || 0), 0);
        const receipts = dayReceipts.reduce((acc, v) => acc + (v.amount || 0), 0);
        const payments = dayPayments.reduce((acc, v) => acc + (v.amount || 0), 0);

        days.push({
          label: `${day}`,
          date: fullDate,
          sales: Number(sales.toFixed(2)),
          vat: Number(vat.toFixed(2)),
          receipts: Number(receipts.toFixed(2)),
          payments: Number(payments.toFixed(2)),
        });
      }
      return days;
    }

    // Default: Show Month-by-Month data
    const yr = filterYear !== "all" ? parseInt(filterYear, 10) : parseInt(currentYearStr, 10);
    return ARABIC_MONTHS.map((m) => {
      const monthNum = m.value;
      const monthInvoices = invoices.filter((inv) => {
        if (!inv.issue_date || inv.status === "cancelled") return false;
        const d = new Date(inv.issue_date);
        return d.getFullYear() === yr && d.getMonth() + 1 === monthNum;
      });

      const monthReceipts = vouchers.filter((v) => {
        if (!v.date || v.type !== "receipt") return false;
        const d = new Date(v.date);
        return d.getFullYear() === yr && d.getMonth() + 1 === monthNum;
      });

      const monthPayments = vouchers.filter((v) => {
        if (!v.date || v.type !== "payment") return false;
        const d = new Date(v.date);
        return d.getFullYear() === yr && d.getMonth() + 1 === monthNum;
      });

      const sales = monthInvoices.reduce((sum, i) => sum + (i.grand_total || 0), 0);
      const vat = monthInvoices.reduce((sum, i) => sum + (i.vat_amount || 0), 0);
      const receipts = monthReceipts.reduce((sum, v) => sum + (v.amount || 0), 0);
      const payments = monthPayments.reduce((sum, v) => sum + (v.amount || 0), 0);

      return {
        label: m.name,
        sales: Number(sales.toFixed(2)),
        vat: Number(vat.toFixed(2)),
        receipts: Number(receipts.toFixed(2)),
        payments: Number(payments.toFixed(2)),
      };
    });
  }, [filteredInvoices, filteredVouchers, invoices, vouchers, filterMonth, filterYear, currentYearStr]);

  // Payment Status Distribution Pie
  const statusPieData = useMemo(() => {
    const data = [
      { name: "مدفوعة", value: paidInvoices.length, color: "#10b981" },
      { name: "معلقة / غير مدفوعة", value: unpaidInvoices.length, color: "#f59e0b" },
      {
        name: "مسودة",
        value: filteredInvoices.filter((i) => i.status === "draft").length,
        color: "#94a3b8",
      },
    ];
    const hasData = data.some((d) => d.value > 0);
    if (!hasData) return [{ name: "لا توجد فواتير", value: 1, color: "#e2e8f0" }];
    return data.filter((d) => d.value > 0);
  }, [paidInvoices, unpaidInvoices, filteredInvoices]);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(currentYearStr);
    invoices.forEach((i) => {
      if (i.issue_date) years.add(i.issue_date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [invoices, currentYearStr]);

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* 1. Header Banner with Clear Welcome & System Status */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>نظام الفوترة الإلكترونية والسندات المعتمد (ZATCA)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              مؤسسة رند العز للمقاولات العامة
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              لوحة التحكم الشاملة لمتابعة عدد العملاء، المبالغ المالية، السندات، والإقرارات الضريبية المعتمدة.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate("create_invoice")}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2.5 rounded-2xl shadow-lg transition-all hover:scale-105 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء فاتورة</span>
            </button>
            <button
              onClick={() => onNavigate("customers")}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2.5 rounded-2xl border border-white/15 transition-all text-xs"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>إضافة عميل</span>
            </button>
            <button
              onClick={() => onNavigate("vouchers")}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-2.5 rounded-2xl border border-white/15 transition-all text-xs"
            >
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>سندات قبض وصرف</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Filter Bar (كل شهر، يوم، سنة) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <span>تحديد الفترة:</span>
            </span>

            <button
              onClick={() => handleSelectPreset("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePreset === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              كافة الفترات
            </button>

            <button
              onClick={() => handleSelectPreset("today")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePreset === "today"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              اليوم ({todayStr})
            </button>

            <button
              onClick={() => handleSelectPreset("this_month")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePreset === "this_month"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              هذا الشهر (شهر {currentMonthNum})
            </button>

            <button
              onClick={() => handleSelectPreset("this_year")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activePreset === "this_year"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              هذه السنة ({currentYearStr})
            </button>
          </div>

          {(activePreset !== "all" || filterYear !== "all" || filterMonth !== "all" || filterDay) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        {/* Detailed Pickers: Year / Month / Day */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Year Select */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">السنة:</span>
            <select
              value={filterYear}
              onChange={(e) => handleCustomYearChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium focus:border-emerald-500"
            >
              <option value="all">كل السنوات</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  سنة {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">الشهر:</span>
            <select
              value={filterMonth}
              onChange={(e) => handleCustomMonthChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium focus:border-emerald-500"
            >
              <option value="all">كل الشهور</option>
              {ARABIC_MONTHS.map((m) => (
                <option key={m.value} value={String(m.value).padStart(2, "0")}>
                  {m.name} ({String(m.value).padStart(2, "0")})
                </option>
              ))}
            </select>
          </div>

          {/* Day Date Picker */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold shrink-0">اليوم:</span>
            <input
              type="date"
              value={filterDay}
              onChange={(e) => handleCustomDayChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:border-emerald-500"
              title="تحديد يوم محدد"
            />
          </div>
        </div>
      </div>

      {/* 3. Core KPI Cards: Customers Count + Amounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Customers Count (عدد العملاء) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي عدد العملاء</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {totalCustomersCount}
            </span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg">
              {activeCustomersCount} عميل نشط
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {filteredCustomerIds} عميل لديهم فواتير في هذه الفترة
          </p>
        </div>

        {/* Card 2: Total Amounts (إجمالي المبالغ والمبيعات) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي المبيعات (شامل الضريبة)</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={totalSales}
              size="xl"
              className="text-emerald-950 font-black"
            />
            <p className="mt-1 text-[11px] text-slate-400 font-medium">
              المبلغ قبل الضريبة:{" "}
              <strong className="font-mono text-slate-700">
                {totalTaxable.toLocaleString("en-US", { minimumFractionDigits: 2 })} ر.س
              </strong>
            </p>
          </div>
        </div>

        {/* Card 3: 15% VAT Amount (مبلغ الضريبة) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ضريبة القيمة المضافة (15%)</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={totalVat}
              size="xl"
              className="text-blue-950 font-black"
            />
            <p className="mt-1 text-[11px] text-blue-700 font-bold">
              المحصل الفعلي للإقرار الضريبي
            </p>
          </div>
        </div>

        {/* Card 4: Paid Amount (المبالغ المسددة) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المبالغ المسددة (Paid)</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={totalPaidAmount}
              size="xl"
              className="text-emerald-800 font-black"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              متبقي تحصيل:{" "}
              <strong className="font-mono text-amber-700">
                {totalUnpaidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ر.س
              </strong>
            </p>
          </div>
        </div>

        {/* Card 5: Receipt Vouchers Amount (سندات القبض) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي سندات القبض (مقبوضات)</span>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-800">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={totalReceipts}
              size="lg"
              className="text-teal-950 font-black"
            />
            <p className="mt-1 text-[11px] text-teal-700 font-bold">
              مقبوضات نقدية وبنكية موثقة
            </p>
          </div>
        </div>

        {/* Card 6: Payment Vouchers Amount (سندات الصرف) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي سندات الصرف (مدفوعات)</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={totalPayments}
              size="lg"
              className="text-rose-950 font-black"
            />
            <p className="mt-1 text-[11px] text-rose-700 font-bold">
              مصروفات تشغيلية وتوريدات
            </p>
          </div>
        </div>

        {/* Card 7: ZATCA Accepted Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">فواتير معتمدة بالزكاة (ZATCA)</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
              {zatcaAcceptedCount}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              امتثال زكوي تام
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {zatcaPendingCount} فواتير بانتظار الرفع
          </p>
        </div>

        {/* Card 8: Total Invoices Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">عدد الفواتير بالفترة</span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {filteredInvoices.length}
            </span>
            <span className="text-xs font-bold text-slate-400">فاتورة</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            من إجمالي {invoices.length} في النظام
          </p>
        </div>
      </div>

      {/* 4. Chart Showcase (شارت عارض المبالغ) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Amounts Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                <span>شارت عارض المبالغ المالية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filterMonth !== "all"
                  ? `حركة المبالغ اليومية لشهر ${filterMonth} (يومياً)`
                  : `حركة المبالغ الشهرية لسنة ${filterYear !== "all" ? filterYear : currentYearStr}`}
              </p>
            </div>

            {/* Toggle Modes */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                onClick={() => setChartMode("sales_vat")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  chartMode === "sales_vat"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                المبيعات والضريبة
              </button>
              <button
                onClick={() => setChartMode("cash_flow")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  chartMode === "cash_flow"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                المقبوضات والمصروفات
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
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
                {chartMode === "sales_vat" ? (
                  <>
                    <Bar
                      dataKey="sales"
                      name="المبيعات شامل الضريبة"
                      fill="#059669"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="vat"
                      name="ضريبة 15%"
                      fill="#0284c7"
                      radius={[6, 6, 0, 0]}
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      dataKey="receipts"
                      name="سندات القبض (تحصيل)"
                      fill="#0d9488"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="payments"
                      name="سندات الصرف (مصروفات)"
                      fill="#e11d48"
                      radius={[6, 6, 0, 0]}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoices Status Distribution (1 Column) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">حالات التحصيل والسداد</h3>
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
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>فواتير الفترة المحددة:</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {filteredInvoices.length} فاتورة
            </span>
          </div>
        </div>
      </div>

      {/* 5. Quick Shortcut Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <button
          onClick={() => onNavigate("create_invoice")}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all text-center shadow-xs group"
        >
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 group-hover:scale-110 transition-transform mb-2">
            <Plus className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-slate-900">إنشاء فاتورة</span>
          <span className="text-[10px] text-slate-400 mt-0.5">ضريبية / مبسطة</span>
        </button>

        <button
          onClick={() => onNavigate("customers")}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 transition-all text-center shadow-xs group"
        >
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800 group-hover:scale-110 transition-transform mb-2">
            <Users className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-slate-900">إضافة عميل</span>
          <span className="text-[10px] text-slate-400 mt-0.5">{totalCustomersCount} عميل مسجل</span>
        </button>

        <button
          onClick={() => onNavigate("services")}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all text-center shadow-xs group"
        >
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800 group-hover:scale-110 transition-transform mb-2">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-slate-900">إضافة خدمة</span>
          <span className="text-[10px] text-slate-400 mt-0.5">دليل الخدمات</span>
        </button>

        <button
          onClick={() => onNavigate("vouchers")}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 transition-all text-center shadow-xs group"
        >
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 group-hover:scale-110 transition-transform mb-2">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-slate-900">سندات قبض وصرف</span>
          <span className="text-[10px] text-slate-400 mt-0.5">{vouchers.length} سند مالي</span>
        </button>

        <button
          onClick={() => onNavigate("zatca")}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all text-center shadow-xs group"
        >
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 group-hover:scale-110 transition-transform mb-2">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-slate-900">رفع الضريبة (ZATCA)</span>
          <span className="text-[10px] text-slate-400 mt-0.5">توثيق الفواتير</span>
        </button>

        <button
          onClick={() => onNavigate("submitted_tax_report")}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition-all text-center shadow-xs group"
        >
          <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800 group-hover:scale-110 transition-transform mb-2">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-slate-900">كشف الفواتير المرفوعة</span>
          <span className="text-[10px] text-slate-400 mt-0.5">معتمدة بالضريبة</span>
        </button>
      </div>

      {/* 6. Recent Invoices Table with Direct Preview & A4 Print */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              أحدث الفواتير الصادرة
            </h3>
            <p className="text-xs text-slate-500">
              قائمة الفواتير الحديثة مع إمكانية المعاينة والطباعة الفورية
            </p>
          </div>
          <button
            onClick={() => onNavigate("invoice_history")}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
          >
            <span>سجل الفواتير الكامل</span>
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
                <th className="py-3 px-4 text-end">المبلغ قبل الضريبة</th>
                <th className="py-3 px-4 text-end">ضريبة 15%</th>
                <th className="py-3 px-4 text-end">الإجمالي شامل الضريبة</th>
                <th className="py-3 px-4 text-center">حالة السداد</th>
                <th className="py-3 px-4 text-center">حالة الزكاة</th>
                <th className="py-3 px-4 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.slice(0, 6).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-950">
                    {inv.invoice_number}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {inv.customer?.name_ar || inv.customer?.company_name || "عميل نقدي"}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{inv.issue_date}</td>
                  <td className="py-3.5 px-4 text-end font-mono">
                    <CurrencyDisplay amount={inv.taxable_amount || inv.subtotal} size="sm" />
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
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>معاينة</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredInvoices.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 text-sm">
                    لا توجد فواتير مسجلة في الفترة المحددة.
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
