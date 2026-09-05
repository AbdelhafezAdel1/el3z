import React, { useState, useEffect } from "react";
import { Customer, Invoice } from "../../types/database";
import { CustomerService, CustomerStats } from "../../services/customerService";
import { CurrencyDisplay } from "../common/CurrencyDisplay";
import { StatusBadge } from "../common/StatusBadge";
import { EmptyState } from "../common/EmptyState";
import {
  Users,
  Building2,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Receipt,
  Calendar,
  Clock,
  Edit2,
  Plus,
  X,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  Hash,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "../../contexts/ToastContext";

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onEdit: (customer: Customer) => void;
  onCreateInvoice?: (customer: Customer) => void;
  onViewInvoice?: (invoiceId: string) => void;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customer,
  onEdit,
  onCreateInvoice,
  onViewInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<"profile" | "invoices">("profile");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalInvoices: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    outstandingBalance: 0,
  });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { info } = useToast();

  useEffect(() => {
    if (customer && isOpen) {
      loadCustomerData(customer.id);
    }
  }, [customer, isOpen]);

  const loadCustomerData = async (customerId: string) => {
    setIsLoadingData(true);
    try {
      const [invList, customerStats] = await Promise.all([
        CustomerService.getCustomerInvoices(customerId),
        CustomerService.getCustomerStats(customerId),
      ]);
      setInvoices(invList);
      setStats(customerStats);
    } catch (err) {
      console.error("Error loading customer details & invoices:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  if (!isOpen || !customer) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    info(`تم نسخ ${fieldName} إلى الحافظة`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl border border-slate-100 my-auto max-h-[92vh] overflow-y-auto">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl shadow-xs ${
                customer.customer_type === "company"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-purple-50 text-purple-700"
              }`}
            >
              {customer.customer_type === "company" ? (
                <Building2 className="w-6 h-6" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-slate-900">
                  {customer.name_ar}
                </h2>
                {customer.customer_type === "company" ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                    منشأة / شركة (B2B)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                    فرد (B2C)
                  </span>
                )}
                {customer.is_active ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    نشط
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                    معطل
                  </span>
                )}
              </div>
              {customer.name_en && (
                <p className="text-xs text-slate-400 font-medium">
                  {customer.name_en}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Financial KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 block">
              عدد الفواتير
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Receipt className="w-4 h-4 text-slate-500" />
              <span className="text-base font-black text-slate-900">
                {stats.totalInvoices}
              </span>
            </div>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/60">
            <span className="text-[10px] font-bold text-emerald-700 block">
              إجمالي المبيعات
            </span>
            <CurrencyDisplay
              amount={stats.totalInvoiced}
              size="sm"
              className="text-emerald-950 font-black mt-1 block"
            />
          </div>

          <div className="bg-teal-50/60 p-3.5 rounded-2xl border border-teal-200/60">
            <span className="text-[10px] font-bold text-teal-700 block">
              المبالغ المسددة
            </span>
            <CurrencyDisplay
              amount={stats.totalPaid}
              size="sm"
              className="text-teal-900 font-black mt-1 block"
            />
          </div>

          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/60">
            <span className="text-[10px] font-bold text-amber-700 block">
              الرصيد المتبقي
            </span>
            <CurrencyDisplay
              amount={stats.outstandingBalance}
              size="sm"
              className="text-amber-900 font-black mt-1 block"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-5">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "profile"
                ? "border-emerald-700 text-emerald-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="w-4 h-4" />
            <span>بيانات العميل والعنوان الوطني</span>
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "invoices"
                ? "border-emerald-700 text-emerald-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>سجل فواتير العميل ({invoices.length})</span>
          </button>
        </div>

        {/* Tab 1: Profile & Saudi National Address */}
        {activeTab === "profile" && (
          <div className="space-y-5 animate-in fade-in">
            {/* Commercial & Tax Info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>بيانات الامتثال والفوترة الضريبية (زاتكا)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-500 block">
                    الرقم الضريبي (VAT)
                  </span>
                  {customer.vat_number ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono font-bold text-xs bg-white px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-900">
                        {customer.vat_number}
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(customer.vat_number!, "الرقم الضريبي")
                        }
                        className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                        title="نسخ الرقم الضريبي"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">غير مسجل</span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block">
                    رقم السجل التجاري (CR)
                  </span>
                  {customer.cr_number ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono font-bold text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800">
                        {customer.cr_number}
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(customer.cr_number!, "السجل التجاري")
                        }
                        className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                        title="نسخ السجل التجاري"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">غير مسجل</span>
                  )}
                </div>
              </div>
            </div>

            {/* Saudi National Address */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>بيانات العنوان الوطني السعودي المعتمد</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">
                    رقم المبنى
                  </span>
                  <span className="font-semibold text-slate-800">
                    {customer.building_no || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">
                    اسم الشارع
                  </span>
                  <span className="font-semibold text-slate-800">
                    {customer.street || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">
                    الحي
                  </span>
                  <span className="font-semibold text-slate-800">
                    {customer.district || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">
                    المدينة والرمز البريدي
                  </span>
                  <span className="font-semibold text-slate-800">
                    {customer.city}{" "}
                    {customer.postal_code ? `(${customer.postal_code})` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Channels & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <h3 className="text-xs font-bold text-slate-800">قنوات الاتصال</h3>
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-4 h-4 text-emerald-700" />
                  <span className="font-mono text-slate-800">
                    {customer.phone || "لا يوجد هاتف مسجل"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-4 h-4 text-emerald-700" />
                  <span className="text-slate-800">
                    {customer.email || "لا يوجد بريد مسجل"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 mb-1">
                  ملاحظات إضافية
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {customer.notes || "لا توجد ملاحظات خاصة بهذا العميل."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Invoices History */}
        {activeTab === "invoices" && (
          <div className="space-y-4 animate-in fade-in">
            {isLoadingData ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400 font-bold">
                  جاري تحميل سجل الفواتير...
                </span>
              </div>
            ) : invoices.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 text-start">رقم الفاتورة</th>
                        <th className="py-2.5 px-3 text-start">تاريخ الإصدار</th>
                        <th className="py-2.5 px-3 text-start">حالة السداد</th>
                        <th className="py-2.5 px-3 text-start">حالة زاتكا</th>
                        <th className="py-2.5 px-3 text-start">المبلغ الإجمالي</th>
                        <th className="py-2.5 px-3 text-start">المدفوع</th>
                        <th className="py-2.5 px-3 text-center">عرض</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {inv.issue_date}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge
                              zatcaStatus={inv.zatca_status}
                              type="zatca"
                            />
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-slate-900">
                            {Number(inv.grand_total).toFixed(2)} ر.س
                          </td>
                          <td className="py-3 px-3 font-mono text-emerald-800">
                            {Number(inv.paid_amount || 0).toFixed(2)} ر.س
                          </td>
                          <td className="py-3 px-3 text-center">
                            {onViewInvoice && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onViewInvoice(inv.id);
                                }}
                                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="عرض تفاصيل الفاتورة"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="لا توجد فواتير سابقة لهذا العميل"
                description="لم يتم إصدار أي فواتير أو إشعارات ضريبية لهذا العميل حتى الآن."
                icon={<Receipt className="w-10 h-10 text-slate-300" />}
                action={
                  onCreateInvoice ? (
                    <button
                      onClick={() => {
                        onClose();
                        onCreateInvoice(customer);
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
                    >
                      إنشاء أول فاتورة الآن
                    </button>
                  ) : undefined
                }
              />
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-200 mt-6">
          <div className="flex items-center gap-2">
            {onCreateInvoice && (
              <button
                onClick={() => {
                  onClose();
                  onCreateInvoice(customer);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء فاتورة جديدة للعميل</span>
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                onEdit(customer);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>تعديل البيانات</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
