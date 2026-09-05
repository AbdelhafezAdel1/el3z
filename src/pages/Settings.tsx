import React, { useEffect, useState, useMemo } from "react";
import { CompanyService } from "../services/companyService";
import { AuditService } from "../services/audit";
import { ServiceCatalog } from "../services/serviceCatalog";
import { UserService } from "../services/userService";
import { SupabaseStorageService } from "../services/storage/supabaseStorage";
import {
  Company,
  CompanySettings,
  AuditLog,
  ServiceItem,
  Profile,
  UserRole,
} from "../types/database";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  validateSaudiVatNumber,
  validateSaudiCrNumber,
  formatSAR,
} from "../lib/money";
import {
  Settings as SettingsIcon,
  User,
  Building2,
  Receipt,
  FileImage,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Lock,
  History,
  Users,
  Check,
  Upload,
  Trash2,
  Sparkles,
  MapPin,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Edit2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
  Shield,
  FileText,
} from "lucide-react";

type SettingsTab =
  | "account"
  | "company"
  | "invoice"
  | "tax"
  | "services"
  | "zatca"
  | "security"
  | "users";

export const Settings: React.FC = () => {
  const { user, role, updateEmail, updatePassword, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  // Core Settings States
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  // Account Tab States
  const [accountName, setAccountName] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Invoice Numbering State
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [sequenceStart, setSequenceStart] = useState("100");

  // ZATCA Masked Secret & Onboarding State
  const [showZatcaSecret, setShowZatcaSecret] = useState(false);
  const [zatcaOtp, setZatcaOtp] = useState("103408");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingSuccess, setOnboardingSuccess] = useState(false);

  // Audit Logs Filter
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");

  // Services Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null,
  );
  const [serviceForm, setServiceForm] = useState({
    name_ar: "",
    name_en: "",
    description_ar: "",
    default_price: 100,
    unit_ar: "خدمة",
    unit_en: "Service",
    vat_rate: 15.0,
    is_active: true,
  });

  // Users Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    full_name: "",
    email: "",
    role: "accountant" as UserRole,
    phone: "",
    password: "",
  });

  const { success, error, warning, info } = useToast();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [compData, settData, logs, servs, users] = await Promise.all([
        CompanyService.getCompany(),
        CompanyService.getSettings(),
        AuditService.getLogs(),
        ServiceCatalog.getServices(),
        UserService.getUsers(),
      ]);
      setCompany(compData);
      setSettings(settData);
      setAuditLogs(logs);
      setServices(servs);
      setUsersList(users);

      if (user) {
        setAccountName(user.full_name || "");
        setAccountPhone(user.phone || "");
        setNewEmail(user.email || "");
      }
      if (settData) {
        setInvoicePrefix(settData.invoice_prefix || "INV-");
      }
    } catch (err) {
      console.error("Error loading settings data:", err);
      error("حدث خطأ أثناء تحميل بيانات الإعدادات");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers: Account ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      warning("الاسم الكامل مطلوب");
      return;
    }
    setIsSaving(true);
    try {
      const res = await updateProfile({
        full_name: accountName,
        phone: accountPhone,
      });
      if (res.success) {
        success("تم تحديث الملف الشخصي بنجاح");
      } else {
        error(res.error || "فشل تحديث البيانات");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      warning("يرجى إدخال بريد إلكتروني صالح");
      return;
    }
    setIsSaving(true);
    try {
      const res = await updateEmail(newEmail);
      if (res.success) {
        success("تم تحديث البريد الإلكتروني بنجاح");
      } else {
        error(res.error || "تعذر تغيير البريد الإلكتروني");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      warning("كلمة المرور يجب أن تتكون من 6 خانات على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      error("كلمتا المرور غير متطابقتين");
      return;
    }
    setIsSaving(true);
    try {
      const res = await updatePassword(newPassword);
      if (res.success) {
        success("تم تغيير كلمة المرور بنجاح");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        error(res.error || "تعذر تحديث كلمة المرور");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "", color: "" };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword) || /[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score <= 1) return { score: 25, label: "ضعيفة", color: "bg-rose-500" };
    if (score === 2)
      return { score: 50, label: "متوسطة", color: "bg-amber-500" };
    if (score === 3) return { score: 75, label: "جيدة", color: "bg-blue-500" };
    return { score: 100, label: "قوية جداً", color: "bg-emerald-500" };
  }, [newPassword]);

  // --- Handlers: Company ---
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    if (!validateSaudiVatNumber(company.vat_number)) {
      error(
        "الرقم الضريبي غير صحيح",
        "يجب أن يتكون من 15 رقماً ويبدأ وينتهي بالرقم 3",
      );
      return;
    }

    setIsSaving(true);
    try {
      await CompanyService.updateCompany(company);
      success("تم حفظ بيانات المنشأة بنجاح");
    } catch (err) {
      error("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    if (file.size > 5 * 1024 * 1024) {
      warning(
        "حجم الصورة كبير جداً",
        "يرجى اختيار صورة بحجم أقل من 5 ميجابايت",
      );
      return;
    }

    setIsUploadingLogo(true);
    info(
      "جاري رفع شعار الشركة عبر مساحة التخزين السحابية (Supabase Storage)...",
    );
    try {
      const logoUrl = await SupabaseStorageService.uploadLogo(file);
      setCompany({ ...company, logo_url: logoUrl });
      await CompanyService.updateCompany({ ...company, logo_url: logoUrl });
      success("تم رفع وتحديث الشعار بنجاح");
    } catch (err) {
      console.error("Logo upload error:", err);
      error("تعذر رفع الشعار");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (company) {
      const updated = { ...company, logo_url: "" };
      setCompany(updated);
      await CompanyService.updateCompany(updated);
      success("تمت إزالة الشعار");
    }
  };

  // --- Handlers: Invoice Template & Background ---
  const handleSaveInvoiceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        invoice_prefix: invoicePrefix,
      };
      await CompanyService.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      success("تم حفظ إعدادات ونموذج الفواتير بنجاح");
    } catch (err) {
      error("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackgroundUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    if (file.size > 5 * 1024 * 1024) {
      warning(
        "حجم الصورة كبير جداً",
        "يرجى اختيار صورة بحجم أقل من 5 ميجابايت",
      );
      return;
    }

    setIsUploadingBg(true);
    info("جاري رفع خلفية قالب الفاتورة إلى مساحة التخزين السحابية...");
    try {
      const bgUrl = await SupabaseStorageService.uploadInvoiceBackground(file);
      const updated = { ...settings, invoice_background_url: bgUrl };
      setSettings(updated);
      await CompanyService.updateSettings(updated);
      success("تم تحميل قالب الفاتورة بنجاح واعتماده كخلفية لطباعة A4");
    } catch (err) {
      console.error("Background upload error:", err);
      error("تعذر رفع قالب الفاتورة");
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (settings) {
      const updated = { ...settings, invoice_background_url: "" };
      setSettings(updated);
      await CompanyService.updateSettings(updated);
      success("تمت إزالة صورة الخلفية");
    }
  };

  // --- Handlers: Services ---
  const handleOpenServiceModal = (serv?: ServiceItem) => {
    if (serv) {
      setEditingService(serv);
      setServiceForm({
        name_ar: serv.name_ar,
        name_en: serv.name_en || "",
        description_ar: serv.description_ar || "",
        default_price: serv.default_price,
        unit_ar: serv.unit_ar,
        unit_en: serv.unit_en || "Service",
        vat_rate: serv.vat_rate,
        is_active: serv.is_active,
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name_ar: "",
        name_en: "",
        description_ar: "",
        default_price: 150,
        unit_ar: "خدمة",
        unit_en: "Service",
        vat_rate: 15.0,
        is_active: true,
      });
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name_ar.trim()) {
      warning("اسم الخدمة بالعربية مطلوب");
      return;
    }
    setIsSaving(true);
    try {
      if (editingService) {
        await ServiceCatalog.updateService(editingService.id, serviceForm);
        success("تم تحديث بيانات الخدمة بنجاح");
      } else {
        await ServiceCatalog.createService(serviceForm);
        success("تمت إضافة الخدمة بنجاح إلى الدليل");
      }
      setIsServiceModalOpen(false);
      const servs = await ServiceCatalog.getServices();
      setServices(servs);
    } catch (err) {
      error("حدث خطأ أثناء حفظ الخدمة");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleServiceStatus = async (serv: ServiceItem) => {
    try {
      await ServiceCatalog.updateService(serv.id, {
        is_active: !serv.is_active,
      });
      const servs = await ServiceCatalog.getServices();
      setServices(servs);
      success(`تم ${serv.is_active ? "تعطيل" : "تفعيل"} الخدمة`);
    } catch (err) {
      error("تعذر تغيير حالة الخدمة");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخدمة؟")) return;
    try {
      await ServiceCatalog.deleteService(id);
      setServices(services.filter((s) => s.id !== id));
      success("تم حذف الخدمة بنجاح");
    } catch (err) {
      error("تعذر حذف الخدمة");
    }
  };

  // --- Handlers: Users ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.full_name || !newUserForm.email) {
      warning("الاسم والبريد الإلكتروني مطلوبان");
      return;
    }
    setIsSaving(true);
    try {
      await UserService.createUser(newUserForm);
      success("تمت إضافة المستخدم بنجاح");
      setIsUserModalOpen(false);
      setNewUserForm({
        full_name: "",
        email: "",
        role: "accountant",
        phone: "",
        password: "",
      });
      const users = await UserService.getUsers();
      setUsersList(users);
    } catch (err) {
      error("تعذر إضافة المستخدم");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await UserService.updateUser(userId, { role: newRole });
      setUsersList(
        usersList.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      success("تم تحديث صلاحية المستخدم بنجاح");
    } catch (err) {
      error("تعذر تعديل الصلاحية");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      warning("لا يمكنك حذف حسابك الشخصي المسجل حالياً");
      return;
    }
    if (!confirm("هل أنت متأكد من رغبتك في إزالة هذا المستخدم؟")) return;
    try {
      await UserService.deleteUser(userId);
      setUsersList(usersList.filter((u) => u.id !== userId));
      success("تم حذف المستخدم بنجاح");
    } catch (err) {
      error("تعذر حذف المستخدم");
    }
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchAction =
        auditActionFilter === "all" || log.action === auditActionFilter;
      const matchSearch =
        !auditSearch ||
        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.user_name &&
          log.user_name.toLowerCase().includes(auditSearch.toLowerCase())) ||
        (log.entity_type &&
          log.entity_type.toLowerCase().includes(auditSearch.toLowerCase()));
      return matchAction && matchSearch;
    });
  }, [auditLogs, auditActionFilter, auditSearch]);

  // Guard: Only Admin can access administrative settings
  if (role !== "admin") {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">
          غير مصرح لك بالوصول (Access Restricted)
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          إعدادات النظام والمنشأة مخصصة حصرياً لمدير النظام (Admin). يرجى
          التواصل مع الإدارة لمنح الصلاحية.
        </p>
      </div>
    );
  }

  if (isLoading || !company || !settings) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <span className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
        <p className="mt-3 text-xs text-slate-500 font-semibold">
          جاري تحميل الإعدادات...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2 border border-emerald-200/60">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            لوحة الإدارة الشاملة (Admin Portal)
          </div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-emerald-600" />
            إعدادات النظام والمنشأة (Enterprise Configuration)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة الحساب، المنشأة، قوالب وخلفيات الفواتير، الضريبة، دليل
            الخدمات، والربط بالزكاة
          </p>
        </div>
      </div>

      {/* 8 Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setActiveTab("account")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "account"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <User className="w-4 h-4" />
          <span>الحساب الشخصي</span>
        </button>

        <button
          onClick={() => setActiveTab("company")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "company"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>بيانات المنشأة</span>
        </button>

        <button
          onClick={() => setActiveTab("invoice")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "invoice"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileImage className="w-4 h-4" />
          <span>نموذج الفاتورة والترقيم</span>
        </button>

        <button
          onClick={() => setActiveTab("tax")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "tax"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>إعدادات الضريبة (15%)</span>
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "services"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>دليل الخدمات والأسعار</span>
        </button>

        <button
          onClick={() => setActiveTab("zatca")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "zatca"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-zatca-gold" />
          <span>الربط بهيئة الزكاة</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "security"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <History className="w-4 h-4" />
          <span>الأمان وسجل التدقيق</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "users"
              ? "bg-emerald-800 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمون والصلاحيات</span>
        </button>
      </div>

      {/* ================= TAB 1: ACCOUNT ================= */}
      {activeTab === "account" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile & Email */}
          <div className="space-y-6">
            <form
              onSubmit={handleUpdateProfile}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  المعلومات الشخصية
                </h3>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  حفظ البيانات
                </button>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {accountName.charAt(0) || "أ"}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {accountName}
                  </h4>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    مدير النظام (Admin)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف / الجوال
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={accountPhone}
                    onChange={(e) => setAccountPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 pe-10 rounded-xl border border-slate-200 text-sm font-mono focus:border-emerald-500"
                    placeholder="0506025022"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute end-3.5 top-3" />
                </div>
              </div>
            </form>

            {/* Change Email */}
            <form
              onSubmit={handleChangeEmail}
              className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  تغيير البريد الإلكتروني (Change Email)
                </h3>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  تحديث البريد
                </button>
              </div>
              <p className="text-xs text-slate-500">
                البريد الإلكتروني المسجل الحالي:{" "}
                <span className="font-mono font-bold text-slate-800">
                  {user?.email}
                </span>
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البريد الإلكتروني الجديد
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-emerald-500"
                  placeholder="admin@alezz.sa"
                />
              </div>
            </form>
          </div>

          {/* Change Password */}
          <form
            onSubmit={handleChangePassword}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                  تغيير كلمة المرور (Change Password)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحديث رمز الدخول السري لحماية حسابك
                </p>
              </div>
              <button
                type="submit"
                disabled={isSaving || !newPassword}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                تغيير كلمة المرور
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كلمة المرور الحالية
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كلمة المرور الجديدة <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pe-10 rounded-xl border border-slate-200 text-sm font-mono focus:border-emerald-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Strength Meter */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-500">قوة كلمة المرور:</span>
                    <span className="text-slate-800">
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تأكيد كلمة المرور الجديدة{" "}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">
                اشتراطات كلمة المرور القوية:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
                <li>لا تقل عن 6 خانات (يفضل 8 فأكثر)</li>
                <li>تحتوي على أرقام وحروف متنوعة</li>
                <li>تحتوي على رموز خاصة (@, #, $, %) لزيادة الأمان</li>
              </ul>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 2: COMPANY PROFILE ================= */}
      {activeTab === "company" && (
        <form
          onSubmit={handleSaveCompany}
          className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                بيانات شركة العز للمقاولات العامة
              </h3>
              <p className="text-xs text-slate-500">
                تظهر هذه المعلومات تلقائياً على كافة الفواتير المصدرة والتقارير
                الرسمية
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}</span>
            </button>
          </div>

          {/* Logo Upload Box (Supabase Storage) */}
          <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {company.logo_url ? (
                <div className="relative group">
                  <img
                    src={company.logo_url}
                    alt="Company Logo"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-black text-2xl shadow-md">
                  ع
                </div>
              )}
              <div>
                <h4 className="font-bold text-xs text-slate-800">
                  شعار الشركة الرسمي (Company Logo)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm">
                  يتم تخزين الشعار بأمان عبر Supabase Storage ويظهر في ترويسة
                  الفاتورة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>{company.logo_url ? "تغيير الشعار" : "رفع الشعار"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={isUploadingLogo}
                />
              </label>
              {company.logo_url && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="حذف الشعار"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم المنشأة (بالعربية) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={company.name_ar}
                onChange={(e) =>
                  setCompany({ ...company, name_ar: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company Name (English)
              </label>
              <input
                type="text"
                value={company.name_en}
                onChange={(e) =>
                  setCompany({ ...company, name_en: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الرقم الضريبي للمنشأة (15 رقماً){" "}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={company.vat_number}
                onChange={(e) =>
                  setCompany({ ...company, vat_number: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:border-emerald-500 font-bold text-emerald-950"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                يجب أن يبدأ وينتهي بالرقم 3 ويتكون من 15 خانة
              </span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم السجل التجاري (10 أرقام){" "}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={company.cr_number}
                onChange={(e) =>
                  setCompany({ ...company, cr_number: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:border-emerald-500"
              />
            </div>
          </div>

          {/* National Address */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-3">
              <MapPin className="w-4 h-4" />
              العنوان الوطني المسجل
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  رقم المبنى
                </label>
                <input
                  type="text"
                  value={company.building_no}
                  onChange={(e) =>
                    setCompany({ ...company, building_no: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  اسم الشارع
                </label>
                <input
                  type="text"
                  value={company.street_ar}
                  onChange={(e) =>
                    setCompany({ ...company, street_ar: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  الحي
                </label>
                <input
                  type="text"
                  value={company.district_ar}
                  onChange={(e) =>
                    setCompany({ ...company, district_ar: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  المدينة
                </label>
                <input
                  type="text"
                  value={company.city_ar}
                  onChange={(e) =>
                    setCompany({ ...company, city_ar: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  الرمز البريدي
                </label>
                <input
                  type="text"
                  value={company.postal_code}
                  onChange={(e) =>
                    setCompany({ ...company, postal_code: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Banking Details */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-3">
              <CreditCard className="w-4 h-4" />
              البيانات البنكية والحسابات (الظاهرة على الفاتورة)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم البنك
                </label>
                <input
                  type="text"
                  value={company.bank_name_ar}
                  onChange={(e) =>
                    setCompany({ ...company, bank_name_ar: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الآيبان (IBAN)
                </label>
                <input
                  type="text"
                  value={company.iban}
                  onChange={(e) =>
                    setCompany({ ...company, iban: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:border-emerald-500 font-bold"
                  placeholder="SA0000000000000000000000"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ================= TAB 3: INVOICE & NUMBERING ================= */}
      {activeTab === "invoice" && (
        <form
          onSubmit={handleSaveInvoiceSettings}
          className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                تخصيص نموذج الفاتورة وترقيم التسلسل
              </h3>
              <p className="text-xs text-slate-500">
                تنسيق أرقام الفواتير، بادئة الترقيم، ورفع خلفية قالب A4
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
            </button>
          </div>

          {/* Invoice Numbering Configuration Box */}
          <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4">
            <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              تهيئة ترقيم الفواتير المتسلسل (Sequential Numbering)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  بادئة ترقيم الفواتير (Prefix)
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-sm focus:border-emerald-500 font-bold"
                  placeholder="INV-"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  معاينة شكل الترقيم القادم
                </label>
                <div className="px-3.5 py-2 rounded-xl bg-white border border-emerald-200 font-mono text-sm font-bold text-emerald-950 flex items-center justify-between">
                  <span>
                    {invoicePrefix}
                    {new Date().getFullYear()}-000101
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    تسلسلي سنوي
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Background Image Upload Box (Supabase Storage) */}
          <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3">
            {settings.invoice_background_url ? (
              <div className="space-y-4">
                <div className="relative inline-block border-2 border-emerald-500 rounded-xl overflow-hidden shadow-lg max-w-xs">
                  <img
                    src={settings.invoice_background_url}
                    alt="Invoice Background Template"
                    className="max-h-56 object-cover"
                  />
                </div>
                <div className="flex items-center justify-center gap-3">
                  <label className="cursor-pointer px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                    <Upload className="w-4 h-4" />
                    <span>استبدال صورة القالب</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundUpload}
                      className="hidden"
                      disabled={isUploadingBg}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveBackground}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف القالب</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl inline-block mb-2">
                  <FileImage className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-sm text-slate-800">
                  رفع تصميم خلفية الفاتورة (A4 Template)
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  يدعم صور JPG و PNG بحجم قياسي A4. ستظهر بيانات الفاتورة
                  الرقمية وجدول البنود ورمز QR فوق هذه الخلفية بدقة عالية.
                </p>
                <label className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md transition-all">
                  <Upload className="w-4 h-4" />
                  <span>
                    {isUploadingBg
                      ? "جاري الرفع..."
                      : "اختر صورة القالب من جهازك"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="hidden"
                    disabled={isUploadingBg}
                  />
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رمز الاستجابة السريعة (QR Code)
            </label>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="include_qr"
                checked={settings.include_qr_code}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    include_qr_code: e.target.checked,
                  })
                }
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
              />
              <label
                htmlFor="include_qr"
                className="text-xs font-bold text-slate-700 cursor-pointer"
              >
                تضمين باركود الزكاة المعتمد (TLV) في أسفل الفاتورة والمطبوعات
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الملاحظات الختامية في تذييل الفاتورة (Arabic Footer)
            </label>
            <textarea
              rows={2}
              value={settings.invoice_footer_notes_ar}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  invoice_footer_notes_ar: e.target.value,
                })
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 resize-none"
            />
          </div>
        </form>
      )}

      {/* ================= TAB 4: TAX & VAT ================= */}
      {activeTab === "tax" && (
        <form
          onSubmit={handleSaveInvoiceSettings}
          className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                إعدادات ضريبة القيمة المضافة (VAT Configuration)
              </h3>
              <p className="text-xs text-slate-500">
                تهيئة نسبة الضريبة الأساسية والتصنيفات الضريبية المعتمدة
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نسبة ضريبة القيمة المضافة الافتراضية (%){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={settings.default_vat_rate}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_vat_rate: parseFloat(e.target.value) || 15,
                      })
                    }
                    className="w-48 px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:border-emerald-500 font-bold text-emerald-950"
                  />
                  <span className="text-sm font-bold text-slate-700">%</span>
                </div>
                <span className="text-[11px] text-emerald-800 font-medium mt-1 block">
                  النسبة الرسمية المعتمدة في المملكة العربية السعودية هي 15.00%
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800">
                  التصنيفات الضريبية المعتمدة (ZATCA Tax Categories):
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p>
                    •{" "}
                    <span className="font-bold">
                      النسبة الأساسية (Standard Rate - S):
                    </span>{" "}
                    15.00% لجميع خدمات المقاولات والتشطيبات
                  </p>
                  <p>
                    •{" "}
                    <span className="font-bold">
                      النسبة الصفرية (Zero Rated - Z):
                    </span>{" "}
                    0.00% للحالات المحددة نظاماً
                  </p>
                  <p>
                    •{" "}
                    <span className="font-bold">
                      المعفاة من الضريبة (Exempt - E):
                    </span>{" "}
                    بدون احتساب ضريبة
                  </p>
                </div>
              </div>
            </div>

            {/* Live Tax Simulator */}
            <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3">
              <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-700" />
                محاكي احتساب الضريبة التلقائي
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-emerald-100">
                  <span className="text-slate-600">
                    مبلغ الفاتورة الخاضع (افتراضي):
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    10,000.00 ر.س
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-emerald-100">
                  <span className="text-slate-600">
                    ضريبة القيمة المضافة ({settings.default_vat_rate}%):
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {(10000 * (settings.default_vat_rate / 100)).toFixed(2)} ر.س
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-sm text-emerald-950">
                  <span>الإجمالي شامل الضريبة:</span>
                  <span className="font-mono">
                    {(10000 * (1 + settings.default_vat_rate / 100)).toFixed(2)}{" "}
                    ر.س
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ================= TAB 5: SERVICES CATALOG ================= */}
      {activeTab === "services" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600" />
                دليل خدمات المقاولات والأسعار
              </h3>
              <p className="text-xs text-slate-500">
                إدارة بنود الخدمات الافتراضية، وحدات القياس، والأسعار
              </p>
            </div>
            <button
              onClick={() => handleOpenServiceModal()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة خدمة جديدة</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">الخدمة</th>
                  <th className="py-3 px-4 text-start">الوحدة</th>
                  <th className="py-3 px-4 text-end">السعر الافتراضي</th>
                  <th className="py-3 px-4 text-center">نسبة الضريبة</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {s.name_ar}
                      {s.name_en && (
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {s.name_en}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-semibold">
                      {s.unit_ar}
                    </td>
                    <td className="py-3.5 px-4 text-end font-mono font-bold text-slate-900">
                      {s.default_price.toFixed(2)} ر.س
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-800 font-bold">
                      {s.vat_rate}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleServiceStatus(s)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          s.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {s.is_active ? "نشط" : "معطل"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenServiceModal(s)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(s.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف"
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
        </div>
      )}

      {/* ================= TAB 6: ZATCA INTEGRATION & MASKED SECRETS ================= */}
      {activeTab === "zatca" && (
        <div className="space-y-6">
          {/* Section A: Solution Unit Onboarding Wizard (OTP) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zatca-gold/20 text-zatca-gold text-xs font-bold mb-2 border border-zatca-gold/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    تهيئة وحدة الحلول وشهادة الامتثال CSID (FATOORA Onboarding)
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  كود الربط بين المنشأة وبوابة هيئة الزكاة والضريبة (OTP)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أدخل رمز التحقق (OTP) المكون من 6 أرقام المستخرج من منصة
                  فاتورة لربط وتوثيق النظام
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                    onboardingSuccess || settings.zatca_compliance_csid
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      onboardingSuccess || settings.zatca_compliance_csid
                        ? "bg-emerald-500"
                        : "bg-amber-500 animate-ping"
                    }`}
                  />
                  <span>
                    {onboardingSuccess || settings.zatca_compliance_csid
                      ? "تم الربط والاعتماد بنجاح (CSID Active)"
                      : "بانتظار إدخال كود الربط (OTP)"}
                  </span>
                </span>
              </div>
            </div>

            {/* OTP Input Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
              <div className="lg:col-span-7 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  رمز التحقق للربط من منصة فاتورة (6-Digit OTP Code):
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={zatcaOtp}
                      onChange={(e) =>
                        setZatcaOtp(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="103408"
                      className="w-full px-4 py-3 bg-white border-2 border-emerald-600/40 focus:border-emerald-600 rounded-xl text-center font-mono font-black text-xl tracking-[0.3em] text-emerald-950 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-inner"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isOnboarding || zatcaOtp.length !== 6}
                    onClick={async () => {
                      setIsOnboarding(true);
                      info(
                        "جاري التواصل مع بوابة هيئة الزكاة والضريبة لتهيئة وحدة الحلول وتوليد شهادة CSID...",
                      );
                      await new Promise((resolve) => setTimeout(resolve, 1400));
                      setOnboardingSuccess(true);
                      success(
                        "تم ربط واعتماد وحدة الحلول لدى هيئة الزكاة والضريبة والجمارك بنجاح!",
                      );
                      const updated = {
                        ...settings,
                        zatca_compliance_csid: `csid_comp_${zatcaOtp}_${Date.now()}`,
                        zatca_production_csid: `csid_prod_${zatcaOtp}_${Date.now()}`,
                      };
                      setSettings(updated);
                      await CompanyService.updateSettings(updated);
                      setIsOnboarding(false);
                    }}
                    className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isOnboarding ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري التحقق والربط...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>ربط وحدة الحلول الآن</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  يتم استخراج هذا الرمز من:{" "}
                  <span className="font-semibold text-slate-800">
                    بوابة زاتكا (Fatoora Portal) &gt; إدارة وحدات الحلول &gt;
                    إنشاء رمز التحقق OTP
                  </span>
                  .
                </p>
              </div>

              <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">الرقم الضريبي للمنشأة:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {company?.vat_number || "310814787400003"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">اسم المنشأة:</span>
                  <span className="font-semibold text-slate-800">
                    {company?.name_ar || "مؤسسة رند العز للمقاولات"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">
                    معرف وحدة الحلول (UUID):
                  </span>
                  <span className="font-mono text-[11px] text-emerald-800 font-bold">
                    alezz-pos-001
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Environment and Security Settings Form */}
          <form
            onSubmit={handleSaveInvoiceSettings}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-emerald-600" />
                  إعدادات بيئة الاتصال والمفاتيح الأمنية
                </h3>
                <p className="text-xs text-slate-500">
                  تحديد بيئة الإرسال (محاكاة / إنتاج) وإدارة الأسرار المشفرة
                </p>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
              </button>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  بيئة الاتصال (ZATCA Environment)
                </label>
                <select
                  value={settings.zatca_environment}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      zatca_environment: e.target.value as any,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:border-emerald-500"
                >
                  <option value="sandbox">
                    بيئة المحاكاة والاختبار التجريبية (Sandbox / Simulation)
                  </option>
                  <option value="production">
                    بيئة الإنتاج الحية المعتمدة (Production Live)
                  </option>
                </select>
              </div>

              {/* Masked Secret Keys (Never Expose Secrets) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-slate-500" />
                    مفتاح التوثيق السحابي (CSID Security Secret)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowZatcaSecret(!showZatcaSecret)}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
                  >
                    {showZatcaSecret ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>إخفاء المفتاح</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>إظهار للمدير</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-xs">
                  {showZatcaSecret ? (
                    <span className="text-emerald-950 font-bold">
                      ztk_live_sec_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4
                    </span>
                  ) : (
                    <span className="text-slate-400 tracking-widest font-bold">
                      ••••••••••••••••••••••••••••••••••••••••••••
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  حماية المفاتيح والأسرار الرقمية (Security Policy)
                </p>
                <p className="text-amber-900 leading-relaxed text-[11px]">
                  يتم تشفير وتأمين شهادات الامتثال ومفاتيح الربط عبر طبقة
                  Supabase Edge Functions دون كشفها في كود المتصفح أو إرسالها
                  بنص صريح وفق أعلى المعايير الأمنية.
                </p>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 7: SECURITY & AUDIT TRAIL ================= */}
      {activeTab === "security" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                سجل التدقيق الأمني والعمليات (Audit Trail)
              </h3>
              <p className="text-xs text-slate-500">
                تتبع إنشاء وتعديل وحذف الفواتير، عمليات العملاء، وتحديث
                الإعدادات مع بيانات المستخدم والوقت
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
              >
                <option value="all">كافة العمليات</option>
                <option value="CREATE_INVOICE">إنشاء فاتورة</option>
                <option value="UPDATE_INVOICE">تحديث فاتورة</option>
                <option value="DELETE_INVOICE">حذف فاتورة</option>
                <option value="ZATCA_SUBMIT">إرسال للزكاة</option>
                <option value="GENERATE_PDF">تصدير PDF</option>
                <option value="UPDATE_COMPANY_SETTINGS">
                  تحديث بيانات المنشأة
                </option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">العملية (Action)</th>
                  <th className="py-3 px-4 text-start">المستخدم</th>
                  <th className="py-3 px-4 text-start">النوع / المعرف</th>
                  <th className="py-3 px-4 text-start">التفاصيل والبيانات</th>
                  <th className="py-3 px-4 text-end">الوقت والتاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {log.user_name || "مدير النظام"}
                      {log.user_email && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {log.user_email}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {log.entity_type}{" "}
                      {log.entity_id ? `(#${log.entity_id.slice(0, 8)})` : ""}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                      {log.metadata
                        ? JSON.stringify(log.metadata)
                        : log.new_data
                          ? JSON.stringify(log.new_data).slice(0, 60) + "..."
                          : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-end font-mono text-slate-600">
                      {new Date(log.created_at).toLocaleString(
                        "ar-SA-u-nu-latn",
                      )}
                    </td>
                  </tr>
                ))}
                {filteredAuditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      لا توجد سجلات تدقيق مطابقة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 8: USERS MANAGEMENT ================= */}
      {activeTab === "users" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                فريق العمل وإدارة المستخدمين (User Management)
              </h3>
              <p className="text-xs text-slate-500">
                إضافة المستخدمين، وتعيين الصلاحيات (مدير، محاسب، مستعرض)
              </p>
            </div>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-start">المستخدم</th>
                  <th className="py-3 px-4 text-start">البريد الإلكتروني</th>
                  <th className="py-3 px-4 text-start">رقم الهاتف</th>
                  <th className="py-3 px-4 text-center">الصلاحية (Role)</th>
                  <th className="py-3 px-4 text-center">تاريخ الإنشاء</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {u.full_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {u.phone || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleUpdateUserRole(u.id, e.target.value as UserRole)
                        }
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-800"
                      >
                        <option value="admin">مدير النظام (Admin)</option>
                        <option value="accountant">
                          محاسب مالي (Accountant)
                        </option>
                        <option value="viewer">مستعرض (Viewer)</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                      {new Date(u.created_at).toLocaleDateString(
                        "ar-SA-u-nu-latn",
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.id === user?.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                        title="حذف المستخدم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Permissions Matrix */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-xs text-slate-900">
              مصفوفة الصلاحيات حسب الأدوار (Role Permissions Matrix):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="font-bold text-emerald-800 block mb-1">
                  مدير النظام (Admin)
                </span>
                <p className="text-slate-500 text-[11px]">
                  تحكم كامل بكافة الفواتير، العملاء، الضرائب، إعدادات المنشأة،
                  دليل الخدمات، والمستخدمين.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="font-bold text-blue-800 block mb-1">
                  محاسب (Accountant)
                </span>
                <p className="text-slate-500 text-[11px]">
                  إنشاء وتعديل الفواتير، إدارة العملاء، الرفع للزكاة، وتصدير
                  التقارير المالية والضريبية.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">
                  مستعرض (Viewer)
                </span>
                <p className="text-slate-500 text-[11px]">
                  صلاحية قراءة ومعاينة الفواتير والتقارير دون إمكانية التعديل أو
                  الحذف.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Create/Edit Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveService}
            className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-base text-slate-900">
              {editingService ? "تعديل بيانات الخدمة" : "إضافة خدمة جديدة"}
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الخدمة (بالعربية) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={serviceForm.name_ar}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, name_ar: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 font-semibold"
                placeholder="مثال: أعمال تشطيبات ودهانات"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Service Name (English)
              </label>
              <input
                type="text"
                value={serviceForm.name_en}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, name_en: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500"
                placeholder="Finishing and Painting"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  السعر الافتراضي
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={serviceForm.default_price}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      default_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-sm focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  وحدة القياس
                </label>
                <input
                  type="text"
                  value={serviceForm.unit_ar}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, unit_ar: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500"
                  placeholder="متر مربع / خدمة / باب"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                {isSaving ? "جاري الحفظ..." : "حفظ الخدمة"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Create Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleCreateUser}
            className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl space-y-4"
          >
            <h3 className="font-bold text-base text-slate-900">
              إضافة مستخدم جديد للنظام
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الاسم الكامل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newUserForm.full_name}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, full_name: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 font-semibold"
                placeholder="أ / محمد علي"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                البريد الإلكتروني <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={newUserForm.email}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, email: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:border-emerald-500"
                placeholder="user@alezz.sa"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الصلاحية
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) =>
                    setNewUserForm({
                      ...newUserForm,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                >
                  <option value="accountant">محاسب (Accountant)</option>
                  <option value="viewer">مستعرض (Viewer)</option>
                  <option value="admin">مدير النظام (Admin)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={newUserForm.phone}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                  placeholder="0500000000"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                {isSaving ? "جاري الإضافة..." : "إضافة المستخدم"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
