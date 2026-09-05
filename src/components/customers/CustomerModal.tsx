import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, CustomerFormData } from "../../validation/customerSchema";
import { Customer } from "../../types/database";
import {
  UserPlus,
  Edit2,
  X,
  Check,
  Building2,
  User,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Building,
} from "lucide-react";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CustomerFormData) => Promise<void>;
  customer?: Customer | null;
  isLoading?: boolean;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customer,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name_ar: "",
      name_en: "",
      company_name: "",
      customer_type: "company",
      vat_number: "",
      cr_number: "",
      building_no: "",
      street: "",
      district: "",
      city: "الخبر",
      postal_code: "",
      country: "المملكة العربية السعودية",
      phone: "",
      email: "",
      notes: "",
    },
  });

  const customerType = watch("customer_type");

  useEffect(() => {
    if (customer) {
      reset({
        name_ar: customer.name_ar || "",
        name_en: customer.name_en || "",
        company_name: customer.company_name || "",
        customer_type: customer.customer_type || "company",
        vat_number: customer.vat_number || "",
        cr_number: customer.cr_number || "",
        building_no: customer.building_no || "",
        street: customer.street || "",
        district: customer.district || "",
        city: customer.city || "الخبر",
        postal_code: customer.postal_code || "",
        country: customer.country || "المملكة العربية السعودية",
        phone: customer.phone || "",
        email: customer.email || "",
        notes: customer.notes || "",
      });
    } else {
      reset({
        name_ar: "",
        name_en: "",
        company_name: "",
        customer_type: "company",
        vat_number: "",
        cr_number: "",
        building_no: "",
        street: "",
        district: "",
        city: "الخبر",
        postal_code: "",
        country: "المملكة العربية السعودية",
        phone: "",
        email: "",
        notes: "",
      });
    }
  }, [customer, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: CustomerFormData) => {
    await onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-slate-100 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shadow-xs">
              {customer ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {customer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
              </h3>
              <p className="text-xs text-slate-500">
                سجل بيانات العميل والامتثال الضريبي للفوترة الإلكترونية (زاتكا)
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
          {/* Customer Type Picker */}
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">نوع العميل:</span>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
              <input
                type="radio"
                value="company"
                checked={customerType === "company"}
                onChange={() => setValue("customer_type", "company")}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>منشأة / شركة (B2B)</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
              <input
                type="radio"
                value="individual"
                checked={customerType === "individual"}
                onChange={() => setValue("customer_type", "individual")}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span>فرد / مستهلك نهائي (B2C)</span>
            </label>
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم العميل (عربي) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register("name_ar")}
                placeholder="مثال: مؤسسة النخبة للتطوير"
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
                Customer Name (English)
              </label>
              <input
                type="text"
                {...register("name_en")}
                placeholder="e.g. Al Nokhbah Est."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {customerType === "company" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الاسم التجاري للمنشأة (Trade Name)
              </label>
              <input
                type="text"
                {...register("company_name")}
                placeholder="اسم المنشأة في السجل التجاري"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          )}

          {/* Tax & CR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الرقم الضريبي (VAT) - 15 رقماً
              </label>
              <input
                type="text"
                maxLength={15}
                {...register("vat_number")}
                placeholder="300000000000003"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {errors.vat_number ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.vat_number.message}
                </p>
              ) : (
                <span className="text-[10px] text-slate-400">
                  يبدأ بالرقم 3 وينتهي بالرقم 3 (15 خانة)
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم السجل التجاري (CR) - 10 أرقام
              </label>
              <input
                type="text"
                maxLength={10}
                {...register("cr_number")}
                placeholder="1010000000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {errors.cr_number && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.cr_number.message}
                </p>
              )}
            </div>
          </div>

          {/* National Address */}
          <div className="pt-2 text-xs font-bold text-emerald-800 flex items-center gap-1.5 border-t border-slate-200">
            <MapPin className="w-4 h-4" />
            <span>بيانات العنوان الوطني السعودي (Saudi National Address)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                رقم المبنى (4 أرقام)
              </label>
              <input
                type="text"
                maxLength={10}
                {...register("building_no")}
                placeholder="1234"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                اسم الشارع
              </label>
              <input
                type="text"
                {...register("street")}
                placeholder="شارع الملك فهد"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                الحي
              </label>
              <input
                type="text"
                {...register("district")}
                placeholder="الخبر الشمالية"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                المدينة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register("city")}
                placeholder="الخبر"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
              />
              {errors.city && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.city.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                الرمز البريدي (5 أرقام)
              </label>
              <input
                type="text"
                maxLength={10}
                {...register("postal_code")}
                placeholder="31952"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم الجوال / الهاتف
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  {...register("phone")}
                  placeholder="0506025022"
                  className="w-full ps-9 pe-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:border-emerald-500"
                />
              </div>
              {errors.phone && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="client@example.com"
                  className="w-full ps-9 pe-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات إضافية
            </label>
            <textarea
              rows={2}
              {...register("notes")}
              placeholder="شروط خاصة، تفاصيل المشاريع، جهات اتصال إضافية..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-emerald-500 resize-none"
            />
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
                  <span>{customer ? "حفظ التعديلات" : "إضافة العميل"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
