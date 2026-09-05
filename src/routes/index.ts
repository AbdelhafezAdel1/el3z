/**
 * Centralised route definitions and route guards.
 */

import { UserRole } from "@/types/database";

export type NavigationTab =
  | "dashboard"
  | "customers"
  | "create_invoice"
  | "invoice_history"
  | "tax_records"
  | "zatca"
  | "services"
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
    tab: "customers",
    labelAr: "العملاء",
    labelEn: "Customers",
    icon: "Users",
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
  },
  {
    tab: "invoice_history",
    labelAr: "الفواتير",
    labelEn: "Invoices",
    icon: "History",
    allowedRoles: [],
    showInSidebar: true,
  },
  {
    tab: "tax_records",
    labelAr: "السجلات الضريبية",
    labelEn: "Tax Records",
    icon: "FileSpreadsheet",
    allowedRoles: ["admin", "accountant"],
    showInSidebar: true,
  },
  {
    tab: "zatca",
    labelAr: "بوابة زاتكا",
    labelEn: "ZATCA Hub",
    icon: "ShieldCheck",
    allowedRoles: ["admin", "accountant"],
    showInSidebar: true,
  },
  {
    tab: "services",
    labelAr: "الخدمات",
    labelEn: "Services",
    icon: "Wrench",
    allowedRoles: [],
    showInSidebar: true,
  },
  {
    tab: "reports",
    labelAr: "التقارير",
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
