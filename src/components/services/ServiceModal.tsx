import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema, ServiceFormData } from "../../validation/serviceSchema";
import { ServiceItem } from "../../types/database";
import { CurrencyDisplay } from "../common/CurrencyDisplay";
import {
  Wrench,
  Edit2,
  Plus,
  X,
  Check,
  Calculator,
  Percent,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ServiceFormData) => Promise<void>;
  service?: ServiceItem | null;
  isLoading?: boolean;
}

const COMMON_UNITS = [
  { ar: "باب", en: "Door" },
  { ar: "خدمة", en: "Service" },
  { ar: "متر", en: "Meter" },
  { ar: "طقم", en: "Set" },
  { ar: "قطعة", en: "Piece" },
];

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  service,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name_ar: "",
      name_en: "",
      description_ar: "",
      description_en: "",
      default_price: 0,
      vat_rate: 15.0,
      unit_ar: "خدمة",
      unit_en: "Service",
      is_active: true,
    },
  });

  const watchPrice = watch("default_price") || 0;
  const watchVatRate = watch("vat_rate") !== undefined ? watch("vat_rate") : 15.0;
  const watchIsActive = watch("is_active");
  const watchUnitAr = watch("unit_ar");

  const vatAmount = Number(watchPrice) * (Number(watchVatRate) / 100);
  const totalPrice = Number(watchPrice) + vatAmount;

  useEffect(() => {
    if (service) {
      reset({
        name_ar: service.name_ar || "",
        name_en: service.name_en || "",
        description_ar: service.description_ar || "",
        description_en: service.description_en || "",
        default_price: service.default_price || 0,
        vat_rate: service.vat_rate !== undefined ? service.vat_rate : 15.0,
        unit_ar: service.unit_ar || "خدمة",
        unit_en: service.unit_en || "Service",
        is_active: service.is_active ?? true,
      });
    } else {
      reset({
        name_ar: "",
        name_en: "",
        description_ar: "",
        description_en: "",
        default_price: 0,
        vat_rate: 15.0,
        unit_ar: "خدمة",
        unit_en: "Service",
        is_active: true,
      });
    }
  }, [service, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: ServiceFormData) => {
    await onSave(data);
  };

  const handleUnitSelect = (unit: { ar: string; en: string }) => {
    setValue("unit_ar", unit.ar, { shouldValidate: true });
    setValue("unit_en", unit.en, { shouldValidate: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-8 shadow-2xl border border-slate-100 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shadow-xs">
              {service ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {service ? "تعديل بيانات الخدمة" : "إضافة خدمة جديدة للدليل"}
              </h3>
              <p className="text-xs text-slate-500">
                تسجيل بنود الأعمال والخدمات للتسعير والفوترة السريعة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          {/* Service Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الخدمة (عربي) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register("name_ar")}
                placeholder="مثال: تركيب باب"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {errors.name_ar && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.name_ar.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Service Name (English) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register("name_en")}
                placeholder="e.g. Door Installation"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {errors.name_en && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.name_en.message}
                </p>
              )}
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                وصف الخدمة ومواصفات العمل (عربي)
              </label>
              <textarea
                rows={2}
                {...register("description_ar")}
                placeholder="تفاصيل ونطاق أعمال التركيب أو الصيانة المشمولة..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Service Description (English)
              </label>
              <textarea
                rows={2}
                {...register("description_en")}
                placeholder="Scope of installation or maintenance work included..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all"
              />
            </div>
          </div>

          {/* Pricing & Units */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                السعر الافتراضي (ر.س) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("default_price")}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:border-emerald-500 transition-all"
              />
              {errors.default_price && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.default_price.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نسبة الضريبة (%) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register("vat_rate")}
                  placeholder="15"
                  className="w-full px-3 py-2 pe-7 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:border-emerald-500 transition-all"
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute end-2.5 top-2.5 pointer-events-none" />
              </div>
              {errors.vat_rate && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.vat_rate.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الوحدة (عربي) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register("unit_ar")}
                placeholder="باب / خدمة / متر"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-500 transition-all"
              />
              {errors.unit_ar && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.unit_ar.message}
                </p>
              )}
            </div>
          </div>

          {/* Unit Quick Select Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-bold">وحدات سريعة:</span>
            {COMMON_UNITS.map((unit) => (
              <button
                type="button"
                key={unit.ar}
                onClick={() => handleUnitSelect(unit)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                  watchUnitAr === unit.ar
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {unit.ar} ({unit.en})
              </button>
            ))}
          </div>

          {/* Live Price Calculator Summary Card */}
          <div className="p-3.5 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 rounded-2xl border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-950 font-bold">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-700" />
                معاينة احتساب الضريبة والإجمالي:
              </span>
              <span className="text-[11px] text-emerald-700">
                لكل 1 {watchUnitAr || "خدمة"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
              <div className="bg-white/90 p-2 rounded-xl border border-emerald-100 shadow-xs">
                <span className="text-[10px] text-slate-500 block">السعر قبل الضريبة</span>
                <span className="font-mono font-bold text-slate-900">
                  {Number(watchPrice).toFixed(2)} ر.س
                </span>
              </div>
              <div className="bg-white/90 p-2 rounded-xl border border-emerald-100 shadow-xs">
                <span className="text-[10px] text-slate-500 block">
                  الضريبة ({watchVatRate}%)
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  {vatAmount.toFixed(2)} ر.س
                </span>
              </div>
              <div className="bg-emerald-700 text-white p-2 rounded-xl shadow-xs">
                <span className="text-[10px] text-emerald-100 block">الإجمالي شامل الضريبة</span>
                <span className="font-mono font-bold text-white">
                  {totalPrice.toFixed(2)} ر.س
                </span>
              </div>
            </div>
          </div>

          {/* Active / Inactive Toggle Switch */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  watchIsActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">حالة تفعيل الخدمة</p>
                <p className="text-[11px] text-slate-500">
                  {watchIsActive
                    ? "الخدمة نشطة وتظهر تلقائياً في قائمة منتقي الخدمات عند إنشاء الفواتير"
                    : "الخدمة معطلة مؤقتاً ومخفية من شاشات الفوترة"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setValue("is_active", !watchIsActive)}
              className="p-1 text-slate-600 hover:text-emerald-700 transition-colors"
            >
              {watchIsActive ? (
                <ToggleRight className="w-8 h-8 text-emerald-700" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting || isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{service ? "حفظ التعديلات" : "إضافة الخدمة للدليل"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
