import React, { useState } from "react";
import { Sidebar, NavigationTab } from "./Sidebar";
import { Navbar } from "./Navbar";
import { useLanguage } from "../../contexts/LanguageContext";

interface AppLayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { t } = useLanguage();

  const getPageTitle = (tab: NavigationTab): string => {
    switch (tab) {
      case "dashboard":
        return t("nav.dashboard");
      case "customers":
        return t("nav.customers");
      case "create_invoice":
        return t("nav.create_invoice");
      case "invoice_history":
        return t("nav.invoice_history");
      case "tax_records":
        return t("nav.tax_records");
      case "zatca":
        return "هيئة الزكاة والضريبة والجمارك (ZATCA Integration)";
      case "services":
        return t("nav.services");
      case "reports":
        return t("nav.reports");
      case "settings":
        return t("nav.settings");
      default:
        return "العز للمقاولات";
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onOpenMobile={() => setIsMobileOpen(true)}
          pageTitle={getPageTitle(currentTab)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};
