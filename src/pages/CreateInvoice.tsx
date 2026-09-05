import React, { useEffect, useState, useMemo } from "react";
import { CustomerService } from "../services/customerService";
import { ServiceCatalog } from "../services/serviceCatalog";
import { InvoiceService } from "../services/invoiceService";
import { CompanyService } from "../services/companyService";
import {
  Customer,
  ServiceItem,
  Company,
  CompanySettings,
  InvoiceType,
} from "../types/database";
import {
  calculateLineItem,
  calculateInvoiceTotals,
  formatSAR,
} from "../lib/money";
import { CustomerModal } from "../components/customers/CustomerModal";
import { CustomerFormData } from "../validation/customerSchema";
import { InvoicePreview } from "../components/invoices/InvoicePreview";
import { useToast } from "../contexts/ToastContext";
import { NavigationTab } from "../routes";
import {
  FilePlus,
  Building2,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  Copy,
  Eye,
  Save,
  CheckCircle2,
  ShieldCheck,
  X,
  FileText,
  Receipt,
  UserPlus,
  Percent,
  Calculator,
  Layers,
  MapPin,
  Phone,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
} from "lucide-react";

interface CreateInvoiceProps {
  onNavigate: (tab: NavigationTab) => void;
  onInvoiceCreated?: (id: string) => void;
  initialCustomerId?: string;
  editingInvoiceId?: string | null;
}

interface ItemRow {
  id: string;
  serviceId?: string;
  descriptionAr: string;
  descriptionEn?: string;
  unitAr?: string;
  unitEn?: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  vatRate: number;
}

export const CreateInvoice: React.FC<CreateInvoiceProps> = ({
  onNavigate,
  onInvoiceCreated,
  initialCustomerId,
  editingInvoiceId,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>("INV-2026-000001");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || "");
  const [invoiceType, setInvoiceType] = useState<"tax_invoice" | "simplified_tax_invoice">("tax_invoice");
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [supplyDate, setSupplyDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [paymentTerms, setPaymentTerms] = useState<string>("الدفع خلال 15 يوماً من تاريخ الإصدار");
  const [notes, setNotes] = useState<string>("");

  // Items State (Initialized with default row)
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: crypto.randomUUID(),
      serviceId: "",
      descriptionAr: "تركيب باب",
      descriptionEn: "Door Installation",
      unitAr: "باب",
      unitEn: "Door",
      quantity: 1,
      unitPrice: 450,
      discountRate: 0,
      vatRate: 15,
    },
  ]);

  // Modals State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error, warning, info } = useToast();

  useEffect(() => {
    loadInitialData();
  }, [editingInvoiceId]);

  const loadInitialData = async () => {
    setIsLoadingInitial(true);
    try {
      const [custList, srvList, compData, settData, nextNum] = await Promise.all([
        CustomerService.getCustomers(),
        ServiceCatalog.getServices(),
        CompanyService.getCompany(),
        CompanyService.getSettings(),
        InvoiceService.getNextInvoiceNumber(),
      ]);

      setCustomers(custList);
      setServices(srvList.filter((s) => s.is_active));
      setCompany(compData);
      setSettings(settData);

      if (editingInvoiceId) {
        const inv = await InvoiceService.getInvoiceById(editingInvoiceId);
        if (inv) {
          setNextInvoiceNumber(inv.invoice_number);
          setSelectedCustomerId(inv.customer_id || "");
          setInvoiceType(inv.invoice_type === "simplified_tax_invoice" ? "simplified_tax_invoice" : "tax_invoice");
          setIssueDate(inv.issue_date || new Date().toISOString().split("T")[0]);
          setSupplyDate(inv.supply_date || new Date().toISOString().split("T")[0]);
          setDueDate(inv.due_date || "");
          setPaymentMethod(inv.payment_method || "bank_transfer");
          setPaymentTerms(inv.payment_terms || "");
          setNotes(inv.notes || "");

          if (inv.items && inv.items.length > 0) {
            setItems(
              inv.items.map((it) => ({
                id: it.id || crypto.randomUUID(),
                serviceId: it.service_id || "",
                descriptionAr: it.description_ar,
                descriptionEn: it.description_en,
                quantity: Number(it.quantity) || 1,
                unitPrice: Number(it.unit_price) || 0,
                discountRate: Number(it.discount_rate) || 0,
                vatRate: Number(it.vat_rate) !== undefined ? Number(it.vat_rate) : 15,
              }))
            );
          }
        }
      } else {
        setNextInvoiceNumber(nextNum);
        if (!selectedCustomerId && custList.length > 0) {
          setSelectedCustomerId(custList[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading initial data for invoice creation:", err);
      error("حدث خطأ أثناء تحميل بيانات الفاتورة الأساسية");
    } finally {
      setIsLoadingInitial(false);
    }
  };

  // When customer changes, adapt invoice type (Company -> tax_invoice, Individual -> simplified)
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      if (cust.customer_type === "individual") {
        setInvoiceType("simplified_tax_invoice");
      } else {
        setInvoiceType("tax_invoice");
      }
    }
  };

  // Service Selection Handler
  const handleSelectService = (rowId: string, serviceId: string) => {
    const selectedSrv = services.find((s) => s.id === serviceId);
    if (!selectedSrv) return;

    setItems((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              serviceId: selectedSrv.id,
              descriptionAr: selectedSrv.name_ar,
              descriptionEn: selectedSrv.name_en,
              unitAr: selectedSrv.unit_ar,
              unitEn: selectedSrv.unit_en,
              unitPrice: selectedSrv.default_price,
              vatRate: selectedSrv.vat_rate !== undefined ? selectedSrv.vat_rate : 15,
            }
          : row,
      ),
    );
  };

  // Row Field Change
  const handleRowChange = (rowId: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  };

  // Add Item Row
  const handleAddRow = () => {
    const defaultVat = settings?.default_vat_rate !== undefined ? settings.default_vat_rate : 15;
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        serviceId: "",
        descriptionAr: "",
        descriptionEn: "",
        unitAr: "خدمة",
        unitEn: "Service",
        quantity: 1,
        unitPrice: 0,
        discountRate: 0,
        vatRate: defaultVat,
      },
    ]);
  };

  // Duplicate Item Row
  const handleDuplicateRow = (row: ItemRow) => {
    setItems((prev) => [
      ...prev,
      {
        ...row,
        id: crypto.randomUUID(),
      },
    ]);
    info("تم نسخ البند");
  };

  // Remove Item Row
  const handleRemoveRow = (rowId: string) => {
    if (items.length <= 1) {
      warning("يجب أن تحتوي الفاتورة على بند واحد على الأقل");
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Handle Newly Created Customer from inline modal
  const handleSaveNewCustomer = async (data: CustomerFormData) => {
    try {
      const newCust = await CustomerService.createCustomer({
        ...data,
        is_active: true,
      });
      setCustomers((prev) => [newCust, ...prev]);
      setSelectedCustomerId(newCust.id);
      setIsCustomerModalOpen(false);
      success("تمت إضافة العميل واختياره للفاتورة بنجاح");
    } catch (err) {
      console.error("Error creating customer from invoice page:", err);
      error("تعذر إضافة العميل الجديد");
    }
  };

  // Calculate Running Totals using Centralized Money / Big.js Math
  const calculatedLines = useMemo(() => {
    return items.map((it) =>
      calculateLineItem({
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountRate: it.discountRate,
        vatRate: it.vatRate,
      }),
    );
  }, [items]);

  const totals = useMemo(() => {
    return calculateInvoiceTotals(calculatedLines);
  }, [calculatedLines]);

  // Selected Customer
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Temporary Invoice Object for Preview
  const previewInvoiceData = useMemo(() => {
    return {
      id: "preview-temp-id",
      company_id: company?.id || "a0000000-0000-0000-0000-000000000001",
      customer_id: selectedCustomerId,
      invoice_number: nextInvoiceNumber,
      invoice_type: invoiceType,
      issue_date: issueDate,
      issue_time: "12:00:00",
      supply_date: supplyDate,
      due_date: dueDate,
      status: "draft" as const,
      zatca_status: "not_submitted" as const,
      subtotal: totals.subtotal,
      discount_amount: totals.discountTotal,
      taxable_amount: totals.taxableTotal,
      vat_amount: totals.vatTotal,
      grand_total: totals.grandTotal,
      paid_amount: 0,
      payment_method: paymentMethod,
      payment_terms: paymentTerms,
      notes,
      customer: selectedCustomer,
      company: company || undefined,
      items: items.map((it, idx) => ({
        id: it.id,
        invoice_id: "preview-temp-id",
        service_id: it.serviceId,
        item_order: idx + 1,
        description_ar: it.descriptionAr || "خدمة",
        description_en: it.descriptionEn,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unitPrice) || 0,
        discount_rate: Number(it.discountRate) || 0,
        discount_amount: calculatedLines[idx]?.discountAmount || 0,
        taxable_amount: calculatedLines[idx]?.taxableAmount || 0,
        vat_rate: Number(it.vatRate) || 15,
        vat_amount: calculatedLines[idx]?.vatAmount || 0,
        line_total: calculatedLines[idx]?.lineTotal || 0,
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [
    nextInvoiceNumber,
    invoiceType,
    issueDate,
    supplyDate,
    dueDate,
    paymentMethod,
    paymentTerms,
    notes,
    selectedCustomerId,
    selectedCustomer,
    company,
    items,
    calculatedLines,
    totals,
  ]);

  // Form Validation
  const validateInvoiceForm = (): boolean => {
    if (!selectedCustomerId) {
      warning("يرجى اختيار العميل أولاً لإصدار الفاتورة");
      return false;
    }
    if (!issueDate) {
      warning("يرجى تحديد تاريخ إصدار الفاتورة");
      return false;
    }
    if (items.length === 0) {
      warning("يجب إضافة بند واحد على الأقل");
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.descriptionAr.trim()) {
        warning(`البند رقم ${i + 1}: وصف البند باللغة العربية مطلوب`);
        return false;
      }
      if (Number(it.quantity) <= 0 || isNaN(Number(it.quantity))) {
        warning(`البند رقم ${i + 1}: الكمية يجب أن تكون أكبر من الصفر`);
        return false;
      }
      if (Number(it.unitPrice) < 0 || isNaN(Number(it.unitPrice))) {
        warning(`البند رقم ${i + 1}: سعر الوحدة لا يمكن أن يكون سالباً`);
        return false;
      }
      if (Number(it.discountRate) < 0 || Number(it.discountRate) > 100) {
        warning(`البند رقم ${i + 1}: نسبة الخصم يجب أن تكون بين 0% و 100%`);
        return false;
      }
      if (Number(it.vatRate) < 0 || Number(it.vatRate) > 100) {
        warning(`البند رقم ${i + 1}: نسبة الضريبة يجب أن تكون بين 0% و 100%`);
        return false;
      }
    }

    return true;
  };

  // Submit Invoice (Draft or Issued)
  const handleSaveInvoice = async (status: "draft" | "issued") => {
    if (!validateInvoiceForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        invoiceType,
        issueDate,
        supplyDate: supplyDate || issueDate,
        dueDate: dueDate || undefined,
        paymentMethod,
        notes,
        status,
        items: items.map((it) => ({
          serviceId: it.serviceId || undefined,
          descriptionAr: it.descriptionAr.trim(),
          descriptionEn: it.descriptionEn?.trim() || undefined,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discountRate: Number(it.discountRate || 0),
          vatRate: Number(it.vatRate !== undefined ? it.vatRate : 15),
        })),
      };

      if (editingInvoiceId) {
        const updated = await InvoiceService.updateInvoice(editingInvoiceId, payload);
        success(
          "تم تعديل الفاتورة وتحديث بياناتها بنجاح",
          `رقم الفاتورة: ${updated.invoice_number}`,
        );
        if (onInvoiceCreated) {
          onInvoiceCreated(updated.id);
        } else {
          onNavigate("invoice_history");
        }
      } else {
        const created = await InvoiceService.createInvoice(payload);
        success(
          status === "issued"
            ? "تم إصدار الفاتورة وتوليد الباركود الزكوي المعتمد بنجاح"
            : "تم حفظ مسودة الفاتورة بنجاح",
          `رقم الفاتورة: ${created.invoice_number}`,
        );
        if (onInvoiceCreated) {
          onInvoiceCreated(created.id);
        } else {
          onNavigate("invoice_history");
        }
      }
    } catch (err: any) {
      console.error("Error saving invoice:", err);
      error("تعذر حفظ الفاتورة", err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shadow-xs">
              <FilePlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                إنشاء فاتورة ضريبية جديدة
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">رقم الفاتورة القادم:</span>
                <span className="font-mono font-bold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-emerald-900">
                  {nextInvoiceNumber}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  (تسلسل مؤمن ضد التكرار)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>معاينة الفاتورة</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSaveInvoice("draft")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>حفظ كمسودة</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSaveInvoice("issued")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>إصدار الفاتورة الضريبية</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Form Sections (2 Cols) + Sticky Summary (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main Section: Invoice Details & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Customer & Type Selection */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>بيانات العميل ونوع الفاتورة (Customer & Invoice Type)</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>إضافة عميل جديد</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختر العميل <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 bg-white"
                >
                  <option value="">-- اختر العميل --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar} {c.company_name ? `(${c.company_name})` : ""}{" "}
                      {c.vat_number ? `[ضريبة: ${c.vat_number}]` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نوع الفاتورة (ZATCA Invoice Type) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as "tax_invoice" | "simplified_tax_invoice")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 bg-white font-medium"
                >
                  <option value="tax_invoice">
                    فاتورة ضريبية (B2B Standard Tax Invoice)
                  </option>
                  <option value="simplified_tax_invoice">
                    فاتورة ضريبية مبسطة (B2C Simplified Tax Invoice)
                  </option>
                </select>
              </div>
            </div>

            {/* Selected Customer Card Preview */}
            {selectedCustomer && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{selectedCustomer.name_ar}</span>
                    {selectedCustomer.customer_type === "company" ? (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                        شركة (B2B)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                        فرد (B2C)
                      </span>
                    )}
                  </div>
                  {selectedCustomer.phone && (
                    <span className="font-mono text-slate-600 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-700" />
                      {selectedCustomer.phone}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 font-bold block">الرقم الضريبي:</span>
                    <span className="font-mono font-bold text-emerald-900">
                      {selectedCustomer.vat_number || "غير مسجل"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">السجل التجاري:</span>
                    <span className="font-mono text-slate-800">
                      {selectedCustomer.cr_number || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">العنوان:</span>
                    <span className="truncate block">
                      {selectedCustomer.city}
                      {selectedCustomer.district ? `، حي ${selectedCustomer.district}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Dates, Terms & Payment Method */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>التواريخ وطرق السداد (Dates & Payment Terms)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ إصدار الفاتورة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ التوريد (Supply Date) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={supplyDate}
                  onChange={(e) => setSupplyDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ الاستحقاق (Due Date)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  طريقة السداد (Payment Method)
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 bg-white"
                >
                  <option value="bank_transfer">تحويل بنكي (Bank Transfer)</option>
                  <option value="cash">نقداً (Cash)</option>
                  <option value="credit_card">بطاقة ائتمان / مدى (Card)</option>
                  <option value="cheque">شيك مصرفي (Cheque)</option>
                  <option value="other">أخرى (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شروط وأحكام السداد
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="مثال: الدفع خلال 15 يوماً من تاريخ الإصدار"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Line Items (Multiple Services) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-700" />
                  <span>بنود الفاتورة والخدمات (Line Items)</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  أضف بنود الخدمات أو الأعمال مع تحديد الكميات والأسعار ونسب الخصم والضريبة
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة بند</span>
              </button>
            </div>

            {/* Line Items List */}
            <div className="space-y-4">
              {items.map((row, index) => {
                const calc = calculatedLines[index] || {
                  grossAmount: 0,
                  discountAmount: 0,
                  taxableAmount: 0,
                  vatAmount: 0,
                  lineTotal: 0,
                };

                return (
                  <div
                    key={row.id}
                    className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all space-y-3"
                  >
                    {/* Item Top Bar: Sequence + Quick Service Selector + Row Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center">
                          {index + 1}
                        </span>

                        {/* Fast Service Picker Dropdown */}
                        <select
                          value={row.serviceId || ""}
                          onChange={(e) => handleSelectService(row.id, e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:border-emerald-500 font-semibold max-w-xs truncate"
                        >
                          <option value="">-- اختيار خدمة سريعة من الدليل --</option>
                          {services.map((srv) => (
                            <option key={srv.id} value={srv.id}>
                              {srv.name_ar} ({srv.default_price} ر.س)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(row)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"
                          title="تكرار البند"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف البند"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Descriptions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          وصف البند / الخدمة (عربي) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={row.descriptionAr}
                          onChange={(e) =>
                            handleRowChange(row.id, "descriptionAr", e.target.value)
                          }
                          placeholder="مثال: تركيب باب خشب سويدي مع المفصلات"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Description (English)
                        </label>
                        <input
                          type="text"
                          value={row.descriptionEn || ""}
                          onChange={(e) =>
                            handleRowChange(row.id, "descriptionEn", e.target.value)
                          }
                          placeholder="e.g. Wooden Door Installation"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Quantity, Unit Price, Discount, VAT */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          الكمية (Qty)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={row.quantity}
                          onChange={(e) =>
                            handleRowChange(
                              row.id,
                              "quantity",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white text-slate-900 focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          سعر الوحدة (ر.س)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.unitPrice}
                          onChange={(e) =>
                            handleRowChange(
                              row.id,
                              "unitPrice",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white text-slate-900 focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          الخصم (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={row.discountRate}
                          onChange={(e) =>
                            handleRowChange(
                              row.id,
                              "discountRate",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono bg-white text-slate-700 focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          الضريبة (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={row.vatRate}
                          onChange={(e) =>
                            handleRowChange(
                              row.id,
                              "vatRate",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono bg-white text-slate-700 focus:border-emerald-500"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 bg-white p-2 rounded-xl border border-emerald-200 text-center flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-slate-400 block">
                          إجمالي البند
                        </span>
                        <span className="font-mono font-black text-xs text-emerald-950">
                          {calc.lineTotal.toFixed(2)} ر.س
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 4: Notes & Terms */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>ملاحظات الفاتورة والتذييل (Notes & Footer)</span>
            </h2>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="شروط الضمان، أوقات التسليم، بيانات الحساب البنكي، أو ملاحظات هيئة الزكاة..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Right Section: Sticky Calculation Summary Card */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 sticky top-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-700" />
                <span>ملخص الحسابات المالية (Summary)</span>
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                دقة محاسبية ZATCA
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>المجموع الفرعي (قبل الخصم)</span>
                <span className="font-mono font-bold text-slate-900">
                  {totals.subtotal.toFixed(2)} ر.س
                </span>
              </div>

              {totals.discountTotal > 0 && (
                <div className="flex items-center justify-between text-rose-600">
                  <span>إجمالي الخصم</span>
                  <span className="font-mono font-bold">
                    -{totals.discountTotal.toFixed(2)} ر.س
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600 pt-2 border-t border-slate-100">
                <span>المبلغ الخاضع للضريبة</span>
                <span className="font-mono font-bold text-slate-900">
                  {totals.taxableTotal.toFixed(2)} ر.س
                </span>
              </div>

              <div className="flex items-center justify-between text-emerald-800">
                <span>ضريبة القيمة المضافة (15%)</span>
                <span className="font-mono font-bold">
                  +{totals.vatTotal.toFixed(2)} ر.س
                </span>
              </div>

              <div className="p-4 bg-emerald-950 text-white rounded-2xl shadow-sm space-y-1 mt-2">
                <span className="text-[11px] text-emerald-200 block font-medium">
                  الإجمالي النهائي المستحق شامل الضريبة
                </span>
                <div className="font-mono font-black text-2xl text-white tracking-tight">
                  {totals.grandTotal.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-emerald-300">ر.س</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveInvoice("issued")}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>إصدار الفاتورة الضريبية</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveInvoice("draft")}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                حفظ كمسودة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Quick Creation Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveNewCustomer}
      />

      {/* Invoice Live Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">معاينة الفاتورة الضريبية</h3>
                  <p className="text-xs text-slate-500">معاينة مباشرة للنموذج المعتمد والباركود الزكوي</p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
              <InvoicePreview
                invoice={previewInvoiceData as any}
                company={company || undefined}
                settings={settings || undefined}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
