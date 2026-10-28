import React, { useEffect, useState, useMemo } from "react";
import { Voucher, VoucherType, Company } from "../types/database";
import { VoucherService, VoucherStats } from "../services/voucherService";
import { CompanyService } from "../services/companyService";
import { CurrencyDisplay } from "../components/common/CurrencyDisplay";
import { VoucherModal } from "../components/vouchers/VoucherModal";
import { VoucherPrint } from "../components/vouchers/VoucherPrint";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  Eye,
  Edit,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  FileSpreadsheet,
  Download,
  Building2,
  X,
  CreditCard,
  FileText,
} from "lucide-react";

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

export const Vouchers: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<VoucherStats | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<VoucherType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<VoucherType>("receipt");
  const [voucherToEdit, setVoucherToEdit] = useState<Voucher | null>(null);

  const [previewVoucher, setPreviewVoucher] = useState<Voucher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { success, error, warning } = useToast();

  useEffect(() => {
    loadData();
  }, [activeTab, searchTerm, selectedYear, selectedMonth, selectedDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const monthFilter =
        selectedYear !== "all" && selectedMonth !== "all"
          ? `${selectedYear}-${selectedMonth}`
          : undefined;

      const [list, currentStats, comp] = await Promise.all([
        VoucherService.getVouchers({
          type: activeTab,
          searchTerm: searchTerm || undefined,
          year: selectedYear !== "all" ? selectedYear : undefined,
          month: monthFilter,
          date: selectedDate || undefined,
        }),
        VoucherService.getVoucherStats({
          year: selectedYear !== "all" ? selectedYear : undefined,
          month: monthFilter,
          date: selectedDate || undefined,
        }),
        CompanyService.getCompany(),
      ]);

      setVouchers(list);
      setStats(currentStats);
      setCompany(comp);
    } catch (err) {
      console.error("Error loading vouchers:", err);
      error("تعذر تحميل سجل سندات القبض والصرف");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReceipt = () => {
    setVoucherToEdit(null);
    setModalType("receipt");
    setIsModalOpen(true);
  };

  const handleCreatePayment = () => {
    setVoucherToEdit(null);
    setModalType("payment");
    setIsModalOpen(true);
  };

  const handleEditVoucher = (voucher: Voucher) => {
    setVoucherToEdit(voucher);
    setModalType(voucher.type);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await VoucherService.deleteVoucher(deleteTarget.id);
      success("تم حذف السند بنجاح");
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      error(err.message || "تعذر حذف السند");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearFilters = () => {
    setActiveTab("all");
    setSearchTerm("");
    setSelectedYear("all");
    setSelectedMonth("all");
    setSelectedDate("");
  };

  const hasActiveFilters =
    activeTab !== "all" ||
    Boolean(searchTerm) ||
    selectedYear !== "all" ||
    selectedMonth !== "all" ||
    Boolean(selectedDate);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    vouchers.forEach((v) => {
      if (v.date) years.add(v.date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [vouchers]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>إدارة النقدية والتحصيلات والمصروفات</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              سندات القبض والصرف الرسمية
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              إصدار وتوثيق وطباعة سندات القبض والصرف المعتمدة لمؤسسة رند العز للمقاولات مع التفقيط التلقائي.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCreateReceipt}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-lg transition-all hover:scale-105 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ سند قبض جديد</span>
            </button>
            <button
              onClick={handleCreatePayment}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-lg transition-all hover:scale-105 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ سند صرف جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receipts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي المقبوضات (سندات القبض)</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={stats?.totalReceipts || 0}
              size="lg"
              className="text-emerald-950 font-black"
            />
            <p className="mt-1 text-[11px] text-emerald-700 font-bold">
              {stats?.countReceipts || 0} سند قبض معتمد
            </p>
          </div>
        </div>

        {/* Total Payments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي المدفوعات (سندات الصرف)</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={stats?.totalPayments || 0}
              size="lg"
              className="text-rose-950 font-black"
            />
            <p className="mt-1 text-[11px] text-rose-700 font-bold">
              {stats?.countPayments || 0} سند صرف مسجل
            </p>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">صافي الحركة النقدية (الرصيد)</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <CurrencyDisplay
              amount={stats?.netBalance || 0}
              size="lg"
              className="text-blue-950 font-black"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              الفارق بين التحصيلات والمصروفات
            </p>
          </div>
        </div>

        {/* Total Vouchers Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي عدد السندات</span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {stats?.totalCount || 0}
            </span>
            <span className="text-xs font-bold text-slate-400">سند مسجل</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Tabs: All / Receipts / Payments */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              كافة السندات ({vouchers.length})
            </button>
            <button
              onClick={() => setActiveTab("receipt")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "receipt"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>سندات القبض</span>
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "payment"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 text-rose-800 hover:bg-rose-50"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>سندات الصرف</span>
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-bold"
            >
              <X className="w-3.5 h-3.5" />
              <span>إعادة تعيين الفلاتر</span>
            </button>
          )}
        </div>

        {/* Filters Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالرقم أو العميل أو البيان..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Year Filter */}
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

          {/* Month Filter */}
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

          {/* Specific Day Filter */}
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 focus:border-emerald-500"
              title="فلترة بيوم محدد"
            />
          </div>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              سجل سندات القبض والصرف
            </h3>
            <p className="text-xs text-slate-500">
              قائمة السندات المالية الصادرة ومتابعة المقبوضات والمصروفات
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
            {vouchers.length} سند مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-start">رقم السند</th>
                <th className="py-3 px-4 text-start">التاريخ</th>
                <th className="py-3 px-4 text-center">النوع</th>
                <th className="py-3 px-4 text-start">العميل / المستفيد</th>
                <th className="py-3 px-4 text-start">البيان والسبب</th>
                <th className="py-3 px-4 text-center">طريقة الدفع</th>
                <th className="py-3 px-4 text-end">المبلغ</th>
                <th className="py-3 px-4 text-center">الفاتورة المرتبطة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {v.voucher_number}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{v.date}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] ${
                        v.type === "receipt"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {v.type === "receipt" ? (
                        <>
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>سند قبض</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3 h-3" />
                          <span>سند صرف</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{v.customer_name}</td>
                  <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate" title={v.description}>
                    {v.description}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                      {v.payment_method === "cash"
                        ? "نقداً"
                        : v.payment_method === "cheque"
                        ? "شيك"
                        : v.payment_method === "card"
                        ? "مدى"
                        : "تحويل بنكي"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-end font-mono font-black">
                    <span
                      className={
                        v.type === "receipt" ? "text-emerald-800" : "text-rose-800"
                      }
                    >
                      {v.type === "receipt" ? "+" : "-"}
                      <CurrencyDisplay amount={v.amount} size="sm" />
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                    {v.invoice_number ? (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-bold">
                        {v.invoice_number}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setPreviewVoucher(v)}
                        title="معاينة وطباعة السند A4"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditVoucher(v)}
                        title="تعديل السند"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(v)}
                        title="حذف السند"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-800 text-slate-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {vouchers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-sm">
                    لا توجد سندات مسجلة مطابقة لخيارات البحث أو الفلترة. اضغط على "+ سند قبض جديد" أو "+ سند صرف جديد" لإضافة أول سند.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voucher Modal (Create / Edit) */}
      <VoucherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        initialType={modalType}
        voucherToEdit={voucherToEdit}
      />

      {/* Voucher Print Preview Modal */}
      {previewVoucher && (
        <VoucherPrint
          voucher={previewVoucher}
          company={company || undefined}
          onClose={() => setPreviewVoucher(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="تأكيد حذف السند"
        message={`هل أنت متأكد من حذف السند رقم "${deleteTarget?.voucher_number}" بمبلغ ${deleteTarget?.amount} ر.س؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف السند"
        cancelText="إلغاء"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
