import React, { useEffect, useState, useMemo } from "react";
import { CustomerService } from "../services/customerService";
import { Customer, CustomerType } from "../types/database";
import { CustomerFormData } from "../validation/customerSchema";
import { CustomerModal } from "../components/customers/CustomerModal";
import { CustomerDetailsModal } from "../components/customers/CustomerDetailsModal";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { EmptyState } from "../components/common/EmptyState";
import { TableSkeleton } from "../components/common/CurrencyDisplay";
import { useToast } from "../contexts/ToastContext";
import { NavigationTab } from "../routes";
import {
  Users,
  UserPlus,
  Search,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  FileText,
  Eye,
  Plus,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Receipt,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface CustomersProps {
  onNavigate?: (tab: NavigationTab) => void;
  onViewInvoice?: (invoiceId: string) => void;
}

export const Customers: React.FC<CustomersProps> = ({
  onNavigate,
  onViewInvoice,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CustomerType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [detailsCustomer, setDetailsCustomer] = useState<Customer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const { success, error, info } = useToast();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await CustomerService.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Error fetching customers:", err);
      const msg = err instanceof Error ? err.message : "تعذر جلب بيانات العملاء";
      setFetchError(msg);
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, pageSize]);

  // Open Form Modal (Add / Edit)
  const handleOpenFormModal = (customer?: Customer) => {
    setEditingCustomer(customer || null);
    setIsFormModalOpen(true);
  };

  // Save Customer (Create / Update)
  const handleSaveCustomer = async (data: CustomerFormData) => {
    setIsSaving(true);
    try {
      if (editingCustomer) {
        await CustomerService.updateCustomer(editingCustomer.id, data);
        success("تم تحديث بيانات العميل بنجاح");
      } else {
        await CustomerService.createCustomer({
          ...data,
          is_active: true,
        });
        success("تمت إضافة العميل الجديد بنجاح");
      }
      setIsFormModalOpen(false);
      setEditingCustomer(null);
      await loadCustomers();
    } catch (err) {
      console.error("Error saving customer:", err);
      error(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ بيانات العميل");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = (customer: Customer) => {
    setDetailsCustomer(customer);
    setIsDetailsOpen(true);
  };

  // Delete Customer
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await CustomerService.deleteCustomer(deleteTarget.id);
      success(`تم حذف العميل "${deleteTarget.name_ar}" بنجاح`);
      setDeleteTarget(null);
      await loadCustomers();
    } catch (err) {
      console.error("Error deleting customer:", err);
      error(err instanceof Error ? err.message : "تعذر حذف العميل");
    }
  };

  // Create Invoice for Customer
  const handleCreateInvoiceForCustomer = (customer: Customer) => {
    if (onNavigate) {
      onNavigate("create_invoice");
    }
  };

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name_ar?.toLowerCase().includes(q) ||
        c.name_en?.toLowerCase().includes(q) ||
        c.company_name?.toLowerCase().includes(q) ||
        c.vat_number?.includes(q) ||
        c.cr_number?.includes(q) ||
        c.phone?.includes(q) ||
        c.city?.toLowerCase().includes(q);

      const matchesType = typeFilter === "all" || c.customer_type === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.is_active) ||
        (statusFilter === "inactive" && !c.is_active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [customers, searchTerm, typeFilter, statusFilter]);

  // Pagination Logic
  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(startIdx, startIdx + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    const total = customers.length;
    const companies = customers.filter((c) => c.customer_type === "company").length;
    const individuals = customers.filter((c) => c.customer_type === "individual").length;
    const active = customers.filter((c) => c.is_active).length;
    return { total, companies, individuals, active };
  }, [customers]);

  const copyVat = (vat: string) => {
    navigator.clipboard.writeText(vat);
    info("تم نسخ الرقم الضريبي");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <span>إدارة العملاء (Customers Management)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سجل العملاء التجاريين والأفراد المتوافق مع الفوترة الإلكترونية وهيئة الزكاة والضريبة والجمارك
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadCustomers()}
            title="تحديث قائمة العملاء"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => handleOpenFormModal()}
            className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all text-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة عميل جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي العملاء</span>
            <span className="text-lg font-black text-slate-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">شركات ومؤسسات (B2B)</span>
            <span className="text-lg font-black text-blue-700">{stats.companies}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">أفراد ومستهلكين (B2C)</span>
            <span className="text-lg font-black text-purple-700">{stats.individuals}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">عملاء نشطون</span>
            <span className="text-lg font-black text-teal-700">{stats.active}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3.5" />
          <input
            type="text"
            placeholder="البحث بالاسم، الرقم الضريبي، السجل التجاري، الجوال، أو المدينة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-10 pe-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === "all"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الكل ({customers.length})
            </button>
            <button
              onClick={() => setTypeFilter("company")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                typeFilter === "company"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              شركات ({stats.companies})
            </button>
            <button
              onClick={() => setTypeFilter("individual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                typeFilter === "individual"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5 text-purple-600" />
              أفراد ({stats.individuals})
            </button>
          </div>
        </div>
      </div>

      {/* Error State Banner */}
      {fetchError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-rose-700 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => loadCustomers()}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && <TableSkeleton rows={5} cols={6} />}

      {/* Customers Table */}
      {!isLoading && paginatedCustomers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">النوع</th>
                  <th className="py-3 px-4 text-start">اسم العميل / المنشأة</th>
                  <th className="py-3 px-4 text-start">الرقم الضريبي (VAT)</th>
                  <th className="py-3 px-4 text-start">السجل التجاري (CR)</th>
                  <th className="py-3 px-4 text-start">العنوان الوطني</th>
                  <th className="py-3 px-4 text-start">الاتصال</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      {customer.customer_type === "company" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          شركة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <User className="w-3.5 h-3.5 text-purple-600" />
                          فرد
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleOpenDetails(customer)}
                        className="text-start font-bold text-slate-900 text-xs hover:text-emerald-700 transition-colors"
                      >
                        {customer.name_ar}
                      </button>
                      {customer.name_en && (
                        <p className="text-[11px] text-slate-400">
                          {customer.name_en}
                        </p>
                      )}
                      {customer.company_name &&
                        customer.company_name !== customer.name_ar && (
                          <p className="text-[11px] text-emerald-800 font-medium">
                            {customer.company_name}
                          </p>
                        )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold">
                      {customer.vat_number ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            {customer.vat_number}
                          </span>
                          <button
                            onClick={() => copyVat(customer.vat_number!)}
                            title="نسخ الرقم الضريبي"
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-700 transition-all"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">
                          غير مسجل
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {customer.cr_number || (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      <p className="truncate text-xs">
                        {customer.building_no ? `${customer.building_no} ` : ""}
                        {customer.street ? `${customer.street}، ` : ""}
                        {customer.district ? `${customer.district}، ` : ""}
                        {customer.city}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {customer.phone && (
                        <p className="font-mono text-[11px] font-semibold text-slate-800">
                          {customer.phone}
                        </p>
                      )}
                      {customer.email && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {customer.email}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenDetails(customer)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                          title="عرض التفاصيل وسجل الفواتير"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenFormModal(customer)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                          title="تعديل العميل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(customer)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="حذف العميل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                عرض{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(
                    (currentPage - 1) * pageSize + 1,
                    totalItems,
                  )}
                </span>{" "}
                إلى{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * pageSize, totalItems)}
                </span>{" "}
                من إجمالي{" "}
                <span className="font-bold text-slate-900">{totalItems}</span>{" "}
                عميل
              </span>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">لكل صفحة:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-hidden focus:border-emerald-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Page Navigation Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="الصفحة الأولى"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="الصفحة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 bg-emerald-50 text-emerald-900 font-bold rounded-lg border border-emerald-200 text-xs">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="الصفحة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="الصفحة الأخيرة"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && paginatedCustomers.length === 0 && (
        <EmptyState
          title="لا يوجد عملاء مطابقين"
          description={
            searchTerm || typeFilter !== "all"
              ? "لم نتمكن من العثور على أي عملاء يطابقون معايير البحث والفلترة المحددة."
              : "لم يتم تسجيل أي عملاء بعد. أضف عميلاً جديداً لبدء إصدار الفواتير الضريبية."
          }
          icon={<Users className="w-12 h-12 text-slate-300" />}
          action={
            searchTerm || typeFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("all");
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                إعادة ضبط البحث
              </button>
            ) : (
              <button
                onClick={() => handleOpenFormModal()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all"
              >
                إضافة عميل الآن
              </button>
            )
          }
        />
      )}

      {/* Customer Form Modal (Add / Edit with React Hook Form + Zod) */}
      <CustomerModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
        isLoading={isSaving}
      />

      {/* Customer Details & Invoice History Modal */}
      <CustomerDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setDetailsCustomer(null);
        }}
        customer={detailsCustomer}
        onEdit={(customer) => {
          setIsDetailsOpen(false);
          handleOpenFormModal(customer);
        }}
        onCreateInvoice={(customer) => {
          setIsDetailsOpen(false);
          handleCreateInvoiceForCustomer(customer);
        }}
        onViewInvoice={(invId) => {
          setIsDetailsOpen(false);
          if (onViewInvoice) onViewInvoice(invId);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="تأكيد حذف العميل"
        message={`هل أنت متأكد من رغبتك في حذف العميل "${deleteTarget?.name_ar}"؟ لا يمكن التراجع عن هذه العملية.`}
        confirmText="نعم، احذف العميل"
        cancelText="إلغاء"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
