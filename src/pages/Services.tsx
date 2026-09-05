import React, { useEffect, useState, useMemo } from "react";
import { ServiceCatalog } from "../services/serviceCatalog";
import { ServiceItem } from "../types/database";
import { ServiceFormData } from "../validation/serviceSchema";
import { ServiceModal } from "../components/services/ServiceModal";
import { CurrencyDisplay, TableSkeleton } from "../components/common/CurrencyDisplay";
import { useToast } from "../contexts/ToastContext";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { EmptyState } from "../components/common/EmptyState";
import {
  Wrench,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  DoorClosed,
  Tag,
  Percent,
} from "lucide-react";

export const Services: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);

  const { success, error, info } = useToast();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await ServiceCatalog.getServices();
      setServices(data);
    } catch (err) {
      console.error("Error loading services:", err);
      const msg = err instanceof Error ? err.message : "تعذر جلب قائمة الخدمات";
      setFetchError(msg);
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (service?: ServiceItem) => {
    setEditingService(service || null);
    setIsModalOpen(true);
  };

  const handleSaveService = async (formData: ServiceFormData) => {
    setIsSaving(true);
    try {
      if (editingService) {
        await ServiceCatalog.updateService(editingService.id, formData);
        success("تم تحديث بيانات الخدمة بنجاح");
      } else {
        await ServiceCatalog.createService(formData);
        success("تمت إضافة الخدمة الجديدة لدليل الخدمات بنجاح");
      }
      setIsModalOpen(false);
      setEditingService(null);
      await loadServices();
    } catch (err) {
      console.error("Error saving service:", err);
      error(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الخدمة");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (service: ServiceItem) => {
    try {
      const updatedStatus = !service.is_active;
      await ServiceCatalog.updateService(service.id, {
        is_active: updatedStatus,
      });
      success(
        updatedStatus
          ? `تم تفعيل الخدمة "${service.name_ar}"`
          : `تم تعطيل الخدمة "${service.name_ar}"`,
      );
      await loadServices();
    } catch (err) {
      console.error("Error toggling service status:", err);
      error("تعذر تغيير حالة تفعيل الخدمة");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await ServiceCatalog.deleteService(deleteTarget.id);
      success(`تم حذف الخدمة "${deleteTarget.name_ar}" من الدليل`);
      setDeleteTarget(null);
      await loadServices();
    } catch (err) {
      console.error("Error deleting service:", err);
      error(err instanceof Error ? err.message : "تعذر حذف الخدمة");
    }
  };

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name_ar.toLowerCase().includes(q) ||
        s.name_en.toLowerCase().includes(q) ||
        (s.description_ar && s.description_ar.toLowerCase().includes(q)) ||
        (s.description_en && s.description_en.toLowerCase().includes(q)) ||
        (s.unit_ar && s.unit_ar.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_active) ||
        (statusFilter === "inactive" && !s.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [services, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.is_active).length;
    const inactive = total - active;
    const avgPrice =
      total > 0
        ? services.reduce((acc, s) => acc + (Number(s.default_price) || 0), 0) / total
        : 0;

    return { total, active, inactive, avgPrice };
  }, [services]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Wrench className="w-6 h-6" />
            </div>
            <span>دليل الخدمات والأعمال (Services Catalog)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة بنود الأعمال والتركيبات والصيانة، الأسعار الافتراضية، ونسب الضريبة المعتمدة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadServices()}
            title="تحديث البيانات"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة خدمة جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي الخدمات</span>
            <span className="text-lg font-black text-slate-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">خدمات نشطة</span>
            <span className="text-lg font-black text-teal-700">{stats.active}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">خدمات معطلة</span>
            <span className="text-lg font-black text-slate-600">{stats.inactive}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">متوسط السعر</span>
            <CurrencyDisplay
              amount={stats.avgPrice}
              size="md"
              className="text-amber-800 font-black block"
            />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3.5" />
          <input
            type="text"
            placeholder="البحث بالاسم العربي، الإنجليزي، الوصف، أو الوحدة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-10 pe-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الكل ({services.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "active"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              نشطة ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "inactive"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              معطلة ({stats.inactive})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="عرض الشبكة"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "table"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="عرض الجدول"
            >
              <List className="w-4 h-4" />
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
            onClick={() => loadServices()}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && <TableSkeleton rows={4} cols={4} />}

      {/* Services Grid View */}
      {!isLoading && viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service) => {
            const price = Number(service.default_price) || 0;
            const vat = price * ((Number(service.vat_rate) || 15) / 100);
            const totalWithVat = price + vat;

            return (
              <div
                key={service.id}
                className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  service.is_active
                    ? "border-slate-200 hover:border-emerald-300"
                    : "border-slate-200 bg-slate-50/60 opacity-80"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-3 rounded-2xl shadow-xs ${
                          service.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 leading-snug">
                          {service.name_ar}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {service.name_en}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(service)}
                      title={service.is_active ? "تعطيل الخدمة" : "تفعيل الخدمة"}
                      className="transition-transform active:scale-95"
                    >
                      {service.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          نشطة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                          <XCircle className="w-3 h-3 text-slate-500" />
                          معطلة
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Description */}
                  {service.description_ar ? (
                    <p className="mt-3.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {service.description_ar}
                    </p>
                  ) : (
                    <p className="mt-3.5 text-xs text-slate-400 italic">
                      لا يوجد وصف مسجل لهذه الخدمة
                    </p>
                  )}
                </div>

                {/* Price & Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">
                      السعر الافتراضي
                    </span>
                    <div className="flex items-baseline gap-1">
                      <CurrencyDisplay
                        amount={service.default_price}
                        size="md"
                        className="text-emerald-950 font-black"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold">
                        / {service.unit_ar || "خدمة"}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                      شامل الضريبة: {totalWithVat.toFixed(2)} ر.س ({service.vat_rate}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(service)}
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                      title="تعديل الخدمة"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(service)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="حذف الخدمة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Services Table View */}
      {!isLoading && viewMode === "table" && filteredServices.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">الحالة</th>
                  <th className="py-3 px-4 text-start">اسم الخدمة (عربي / إنجليزي)</th>
                  <th className="py-3 px-4 text-start">الوصف</th>
                  <th className="py-3 px-4 text-start">الوحدة</th>
                  <th className="py-3 px-4 text-start">السعر قبل الضريبة</th>
                  <th className="py-3 px-4 text-start">الضريبة</th>
                  <th className="py-3 px-4 text-start">الإجمالي شامل الضريبة</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((service) => {
                  const price = Number(service.default_price) || 0;
                  const vat = price * ((Number(service.vat_rate) || 15) / 100);
                  const total = price + vat;

                  return (
                    <tr
                      key={service.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(service)}
                          title={service.is_active ? "تعطيل الخدمة" : "تفعيل الخدمة"}
                        >
                          {service.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              نشطة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              <XCircle className="w-3 h-3 text-slate-500" />
                              معطلة
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{service.name_ar}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {service.name_en}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {service.description_ar || "-"}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {service.unit_ar} ({service.unit_en})
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {price.toFixed(2)} ر.س
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-800">
                        {service.vat_rate}% ({vat.toFixed(2)} ر.س)
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-emerald-950">
                        {total.toFixed(2)} ر.س
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenModal(service)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                            title="تعديل الخدمة"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(service)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="حذف الخدمة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredServices.length === 0 && (
        <EmptyState
          title="لا توجد خدمات مطابقة"
          description={
            searchTerm || statusFilter !== "all"
              ? "لم يتم العثور على أي خدمات تطابق معايير البحث والفلترة المحددة."
              : "دليل الخدمات فارغ حالياً. أضف خدمات التركيب والصيانة للتسعير السريع عند إنشاء الفواتير."
          }
          icon={<Wrench className="w-12 h-12 text-slate-300" />}
          action={
            searchTerm || statusFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                إعادة ضبط البحث
              </button>
            ) : (
              <button
                onClick={() => handleOpenModal()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all"
              >
                إضافة خدمة الآن
              </button>
            )
          }
        />
      )}

      {/* Reusable Service Modal */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingService(null);
        }}
        onSave={handleSaveService}
        service={editingService}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="تأكيد حذف الخدمة"
        message={`هل أنت متأكد من رغبتك في حذف الخدمة "${deleteTarget?.name_ar}" من الدليل؟ لن يؤثر ذلك على الفواتير التي تم إصدارها سابقاً.`}
        confirmText="نعم، احذف الخدمة"
        cancelText="إلغاء"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
