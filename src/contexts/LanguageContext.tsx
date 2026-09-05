import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type Language = "ar" | "en";

interface LanguageContextType {
  language: Language;
  direction: "rtl" | "ltr";
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Navigation
    "nav.dashboard": "لوحة التحكم",
    "nav.customers": "العملاء",
    "nav.create_invoice": "إنشاء فاتورة",
    "nav.invoice_history": "سجل الفواتير",
    "nav.tax_records": "السجل الضريبي",
    "nav.zatca": "الزكاة والضريبة",
    "nav.services": "الخدمات",
    "nav.reports": "التقارير",
    "nav.settings": "الإعدادات",
    "nav.sign_out": "تسجيل الخروج",

    // Dashboard
    "dash.total_sales": "إجمالي المبيعات",
    "dash.total_vat": "إجمالي الضريبة (15%)",
    "dash.outstanding": "المستحقات المعلقة",
    "dash.total_invoices": "إجمالي الفواتير",
    "dash.zatca_accepted": "معتمدة بالزكاة",
    "dash.zatca_pending": "بانتظار الرفع",
    "dash.zatca_rejected": "فواتير مرفوضة",
    "dash.monthly_revenue": "الإيرادات الشهرية",
    "dash.vat_trend": "توزيع ضريبة القيمة المضافة",
    "dash.quick_actions": "إجراءات سريعة",
    "dash.create_invoice_btn": "فاتورة جديدة",
    "dash.add_customer_btn": "إضافة عميل",
    "dash.submit_zatca_btn": "رفع للزكاة والضريبة",

    // Invoices
    "inv.number": "رقم الفاتورة",
    "inv.customer": "العميل",
    "inv.issue_date": "تاريخ الإصدار",
    "inv.subtotal": "المبلغ الخاضع للضريبة",
    "inv.vat": "ضريبة القيمة المضافة",
    "inv.total": "الإجمالي شامل الضريبة",
    "inv.status": "حالة الفاتورة",
    "inv.zatca_status": "حالة الزكاة",
    "inv.actions": "الإجراءات",
    "inv.preview": "معاينة الفاتورة",
    "inv.download_pdf": "تحميل PDF",
    "inv.print": "طباعة",
    "inv.submit_zatca": "رفع للزكاة والضريبة",

    // Common
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.search": "بحث...",
    "common.filter": "تصفية",
    "common.export": "تصدير",
    "common.loading": "جاري التحميل...",
    "common.no_data": "لا توجد بيانات متاحة",
  },
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.customers": "Customers",
    "nav.create_invoice": "Create Invoice",
    "nav.invoice_history": "Invoice History",
    "nav.tax_records": "Tax Records",
    "nav.zatca": "ZATCA Integration",
    "nav.services": "Services",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "nav.sign_out": "Sign Out",

    // Dashboard
    "dash.total_sales": "Total Sales",
    "dash.total_vat": "Total VAT (15%)",
    "dash.outstanding": "Outstanding Balance",
    "dash.total_invoices": "Total Invoices",
    "dash.zatca_accepted": "ZATCA Approved",
    "dash.zatca_pending": "Pending Submission",
    "dash.zatca_rejected": "Rejected Invoices",
    "dash.monthly_revenue": "Monthly Revenue",
    "dash.vat_trend": "VAT Distribution",
    "dash.quick_actions": "Quick Actions",
    "dash.create_invoice_btn": "New Invoice",
    "dash.add_customer_btn": "Add Customer",
    "dash.submit_zatca_btn": "Submit to ZATCA",

    // Invoices
    "inv.number": "Invoice #",
    "inv.customer": "Customer",
    "inv.issue_date": "Issue Date",
    "inv.subtotal": "Taxable Amount",
    "inv.vat": "VAT (15%)",
    "inv.total": "Total Incl. VAT",
    "inv.status": "Status",
    "inv.zatca_status": "ZATCA Status",
    "inv.actions": "Actions",
    "inv.preview": "Preview Invoice",
    "inv.download_pdf": "Download PDF",
    "inv.print": "Print",
    "inv.submit_zatca": "Submit to ZATCA",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.search": "Search...",
    "common.filter": "Filter",
    "common.export": "Export",
    "common.loading": "Loading...",
    "common.no_data": "No records found",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("alezz_language") as Language) || "ar";
  });

  const direction = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    localStorage.setItem("alezz_language", language);
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
