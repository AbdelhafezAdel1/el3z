import React, { useState, useEffect } from "react";
import { Voucher, VoucherType, PaymentMode, Customer } from "../../types/database";
import { VoucherService } from "../../services/voucherService";
import { CustomerService } from "../../services/customerService";
import { InvoiceService } from "../../services/invoiceService";
import { numberToArabicWords } from "../../utils/numberToArabicWords";
import { useToast } from "../../contexts/ToastContext";
import {
  X,
  FileText,
  Calendar,
  CreditCard,
  User,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: VoucherType;
  voucherToEdit?: Voucher | null;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = "receipt",
  voucherToEdit,
}) => {
  const [type, setType] = useState<VoucherType>(initialType);
  const [voucherNumber, setVoucherNumber] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      if (voucherToEdit) {
        setType(voucherToEdit.type);
        setVoucherNumber(voucherToEdit.voucher_number);
        setDate(voucherToEdit.date);
        setAmount(voucherToEdit.amount.toString());
        setCustomerName(voucherToEdit.customer_name);
        setCustomerId(voucherToEdit.customer_id || "");
        setPaymentMethod(voucherToEdit.payment_method);
        setReferenceNumber(voucherToEdit.reference_number || "");
        setInvoiceNumber(voucherToEdit.invoice_number || "");
        setDescription(voucherToEdit.description);
        setNotes(voucherToEdit.notes || "");
      } else {
        setType(initialType);
        setDate(new Date().toISOString().split("T")[0]);
        setAmount("");
        setCustomerName("");
        setCustomerId("");
        setPaymentMethod("bank_transfer");
        setReferenceNumber("");
        setInvoiceNumber("");
        setDescription(initialType === "receipt" ? "دفعة من حساب فاتورة" : "سداد مصاريف مشتريات وتوريدات");
        setNotes("");
        fetchNextNumber(initialType);
      }
    }
  }, [isOpen, initialType, voucherToEdit]);

  const loadDependencies = async () => {
    try {
      const [custList, invList] = await Promise.all([
        CustomerService.getCustomers(),
        InvoiceService.getInvoices(),
      ]);
      setCustomers(custList);
      setUnpaidInvoices(invList.filter((i) => i.status !== "paid" && i.status !== "cancelled"));
    } catch (e) {
      console.warn("Could not load voucher dependencies:", e);
    }
  };

  const fetchNextNumber = async (vType: VoucherType) => {
    const nextNum = await VoucherService.getNextVoucherNumber(vType);
    setVoucherNumber(nextNum);
  };

  const handleTypeChange = (newType: VoucherType) => {
    setType(newType);
    if (!voucherToEdit) {
      fetchNextNumber(newType);
      if (newType === "receipt") {
        setDescription("دفعة من حساب فاتورة");
      } else {
        setDescription("سداد مصاريف مشتريات وتوريدات");
      }
    }
  };

  const handleSelectCustomer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setCustomerId(custId);
    const selected = customers.find((c) => c.id === custId);
    if (selected) {
      setCustomerName(selected.name_ar || selected.company_name || selected.name_en || "");
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const tafqeetText = numberToArabicWords(numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      error(type === "receipt" ? "يرجى إدخال اسم العميل أو استلمنا من" : "يرجى إدخال اسم المستفيد أو سددنا للمكرم");
      return;
    }

    if (numAmount <= 0) {
      error("يرجى إدخال مبلغ صحيح أكبر من الصفر");
      return;
    }

    if (!description.trim()) {
      error("يرجى إدخال بيان وسبب السند");
      return;
    }

    setIsSubmitting(true);
    try {
      if (voucherToEdit) {
        await VoucherService.updateVoucher(voucherToEdit.id, {
          type,
          date,
          amount: numAmount,
          customer_id: customerId || undefined,
          customer_name: customerName,
          payment_method: paymentMethod,
          reference_number: referenceNumber || undefined,
          invoice_number: invoiceNumber || undefined,
          description,
          notes: notes || undefined,
        });
        success("تم تحديث بيانات السند بنجاح");
      } else {
        await VoucherService.createVoucher({
          type,
          date,
          amount: numAmount,
          customer_id: customerId || undefined,
          customer_name: customerName,
          payment_method: paymentMethod,
          reference_number: referenceNumber || undefined,
          invoice_number: invoiceNumber || undefined,
          description,
          notes: notes || undefined,
        });
        success(type === "receipt" ? "تم إنشاء سند القبض بنجاح" : "تم إنشاء سند الصرف بنجاح");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || "حدث خطأ أثناء حفظ السند");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                type === "receipt"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">
                {voucherToEdit
                  ? `تعديل ${type === "receipt" ? "سند قبض" : "سند صرف"} (${voucherNumber})`
                  : type === "receipt"
                  ? "إنشاء سند قبض جديد (Receipt Voucher)"
                  : "إنشاء سند صرف جديد (Payment Voucher)"}
              </h2>
              <p className="text-xs text-slate-500">
                رقم السند المعتمد:{" "}
                <span className="font-mono font-bold text-slate-800">{voucherNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voucher Type Tabs */}
        {!voucherToEdit && (
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => handleTypeChange("receipt")}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                type === "receipt"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              سند قبض (استلام مبالغ من عميل)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("payment")}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                type === "payment"
                  ? "bg-rose-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              سند صرف (صرف مبالغ / مصروفات)
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Date & Voucher Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>تاريخ السند</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-900 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                <span>رقم السند (تلقائي)</span>
              </label>
              <input
                type="text"
                readOnly
                value={voucherNumber}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-700 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Row 2: Customer / Beneficiary */}
          <div className="space-y-2">
            <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {type === "receipt" ? "استلمنا من المكرم (العميل):" : "سددنا للمكرم (المستفيد):"}
              </span>
              {customers.length > 0 && (
                <span className="text-[11px] text-emerald-700 font-normal">اختيار من سجل العملاء</span>
              )}
            </label>

            {customers.length > 0 && (
              <select
                value={customerId}
                onChange={handleSelectCustomer}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:border-emerald-500 mb-2"
              >
                <option value="">-- اختيار عميل مسجل أو كتابة الاسم يدوياً أدناه --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar || c.company_name} ({c.phone || c.city})
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={type === "receipt" ? "مثال: مؤسسة النخبة العقارية للتطوير" : "مثال: شركة الإمدادات لمواد البناء"}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:border-emerald-500"
            />
          </div>

          {/* Row 3: Amount & Tafqeet */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                  <span>المبلغ (بالريال السعودي):</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-black text-sm text-slate-900 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>طريقة السداد / الدفع:</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:border-emerald-500"
                >
                  <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
                  <option value="cash">نقداً (Cash)</option>
                  <option value="cheque">شيك مصرفي (Cheque)</option>
                  <option value="card">بطاقة مدى / ائتمان (Card)</option>
                </select>
              </div>
            </div>

            {/* Tafqeet Preview */}
            <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-700 flex items-center gap-1.5">
              <span className="font-bold text-slate-900 shrink-0">المبلغ كتابة:</span>
              <span className="font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 flex-1">
                {tafqeetText}
              </span>
            </div>
          </div>

          {/* Row 4: Reference Number & Linked Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                رقم المرجع / الحوالة / الشيك:
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="مثال: TRX-884190 أو شيك رقم 4510"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                رقم الفاتورة المرتبطة (اختياري):
              </label>
              {unpaidInvoices.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-800 focus:border-emerald-500"
                  >
                    <option value="">-- غير مرتبط بفاتورة أو كتابة يدوياً --</option>
                    {unpaidInvoices.map((inv) => (
                      <option key={inv.id} value={inv.invoice_number}>
                        {inv.invoice_number} ({inv.customer?.name_ar || "عميل"} - {inv.grand_total} ر.س)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="مثال: INV-2026-000001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 focus:border-emerald-500"
                />
              )}
            </div>
          </div>

          {/* Row 5: Description (البيان / السبب) */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>البيان وذلك لقاء (Reason / Description):</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: دفعة تحت الحساب عن أعمال تركيب أبواب خشبية مشروع الخبر"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-900 focus:border-emerald-500"
            />
          </div>

          {/* Row 6: Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              ملاحظات إضافية:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل خاصة بالحساب أو شروط الاستلام..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl text-white font-black shadow-md flex items-center gap-2 transition-all ${
                type === "receipt"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{voucherToEdit ? "حفظ التعديلات" : type === "receipt" ? "إصدار سند القبض" : "إصدار سند الصرف"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
