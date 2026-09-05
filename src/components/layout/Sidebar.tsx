import React from "react";
import {
  LayoutDashboard,
  Users,
  FilePlus,
  History,
  FileSpreadsheet,
  ShieldCheck,
  Wrench,
  BarChart3,
  Settings,
  X,
  Building2,
  ExternalLink,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";

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

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { t, language } = useLanguage();
  const { role } = useAuth();

  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    adminOnly?: boolean;
  }> = [
    {
      id: "dashboard",
      label: t("nav.dashboard"),
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: "customers",
      label: t("nav.customers"),
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: "create_invoice",
      label: t("nav.create_invoice"),
      icon: <FilePlus className="w-5 h-5 text-emerald-500" />,
      badge: "جديد",
    },
    {
      id: "invoice_history",
      label: t("nav.invoice_history"),
      icon: <History className="w-5 h-5" />,
    },
    {
      id: "tax_records",
      label: t("nav.tax_records"),
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
    {
      id: "zatca",
      label: t("nav.zatca"),
      icon: <ShieldCheck className="w-5 h-5 text-zatca-gold" />,
      badge: "ZATCA",
    },
    {
      id: "services",
      label: t("nav.services"),
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      id: "reports",
      label: t("nav.reports"),
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: "settings",
      label: t("nav.settings"),
      icon: <Settings className="w-5 h-5" />,
      adminOnly: true,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 border-e border-slate-800">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/40 text-white font-black text-xl">
            ع
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-wide flex items-center gap-1.5">
              العز للمقاولات
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              نظام الفواتير المعتمد (ZATCA)
            </p>
          </div>
        </div>
        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          {language === "ar" ? "القائمة الرئيسية" : "MAIN MENU"}
        </div>
        {navItems.map((item) => {
          if (item.adminOnly && role !== "admin") return null;

          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (isOpenMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 font-semibold"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? "text-white" : "text-slate-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.badge === "ZATCA"
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                      : isActive
                        ? "bg-white/20 text-white"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Enterprise Status Footer */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            شركة العز للمقاولات
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
            CR: 1010789456
          </span>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          الرقم الضريبي:{" "}
          <span className="font-mono text-slate-300">310123456700003</span>
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 z-30 shadow-xl flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-right rtl:slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
