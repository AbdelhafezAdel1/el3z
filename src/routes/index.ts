/**
 * Centralised route definitions and route guards.
 */

import { UserRole } from "@/types/database";

export type NavigationTab =
  | "dashboard"
  | "create_invoice"
  | "customers"
  | "services"
  | "invoice_history"
  | "vouchers"
  | "zatca"
  | "tax_records"
  | "submitted_tax_report"
  | "reports"
  | "settings";

export type AuthView = "login" | "forgot_password" | "reset_password";

export interface RouteDefinition {
  tab: NavigationTab;
  /** Arabic label */
  labelAr: string;
  /** English label */
  labelEn: string;
  /** Lucide icon name */
  icon: string;
  /** Roles allowed to access this route. Empty array = all authenticated users */
  allowedRoles: UserRole[];
  /** Whether this route is visible in the sidebar */
  showInSidebar: boolean;
  badge?: string;
}

export const ROUTES: RouteDefinition[] = [
  {
    tab: "dashboard",
    labelAr: "لوحة التحكم",
    labelEn: "Dashboard",
    icon: "LayoutDashboard",
    allowedRoles: [],
    showInSidebar: true,
  },
  {
    tab: "create_invoice",
    labelAr: "إنشاء فاتورة",
    labelEn: "Create Invoice",
    icon: "FilePlus",
    allowedRoles: [],
    showInSidebar: true,
    badge: "جديد",
  },
  {
    tab: "customers",
    labelAr: "إضافة عميل / العملاء",
    labelEn: "Customers",
    icon: "Users",
    allowedRoles: [],
    showInSidebar: true,
  },
  {
    tab: "services",
    labelAr: "إضافة خدمة / الخدمات",
    labelEn: "Services",
    icon: "Wrench",
    allowedRoles: [],
    showInSidebar: true,
  },
  {
    tab: "invoice_history",
    labelAr: "سجل الفواتير",
    labelEn: "Invoices Log",
    icon: "History",
    allowedRoles: [],
    showInSidebar: true,
  },
  {
    tab: "vouchers",
    labelAr: "سندات قبض وصرف",
    labelEn: "Receipt & Payment Vouchers",
    icon: "Receipt",
    allowedRoles: [],
    showInSidebar: true,
    badge: "مالية",
  },
  {
    tab: "zatca",
    labelAr: "رفع الضريبة (ZATCA)",
    labelEn: "Submit Tax / ZATCA",
    icon: "ShieldCheck",
    allowedRoles: ["admin", "accountant"],
    showInSidebar: true,
    badge: "ZATCA",
  },
  {
    tab: "tax_records",
    labelAr: "سجل الضريبي",
    labelEn: "Tax Records",
    icon: "FileSpreadsheet",
    allowedRoles: ["admin", "accountant"],
    showInSidebar: true,
  },
  {
    tab: "submitted_tax_report",
    labelAr: "كشف الضريبة على الفواتير المرفوعة",
    labelEn: "Submitted Invoices Tax Report",
    icon: "FileCheck",
    allowedRoles: ["admin", "accountant"],
    showInSidebar: true,
    badge: "معتمد",
  },
  {
    tab: "reports",
    labelAr: "التقارير المالية",
    labelEn: "Reports",
    icon: "BarChart3",
    allowedRoles: [],
    showInSidebar: true,
  },
  {
    tab: "settings",
    labelAr: "الإعدادات",
    labelEn: "Settings",
    icon: "Settings",
    allowedRoles: ["admin"],
    showInSidebar: true,
  },
];

/** Lookup a route definition by tab name */
export function getRoute(tab: NavigationTab): RouteDefinition | undefined {
  return ROUTES.find((r) => r.tab === tab);
}

export * from "./ProtectedRoute";
export * from "./PublicRoute";
