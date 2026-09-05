import React from "react";
import { Menu, Globe, Shield, User, LogOut, Check, Bell } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

interface NavbarProps {
  onOpenMobile: () => void;
  pageTitle: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobile, pageTitle }) => {
  const { language, setLanguage } = useLanguage();
  const { user, role, setRole, signOut } = useAuth();
  const { info } = useToast();

  const toggleLanguage = () => {
    const next = language === "ar" ? "en" : "ar";
    setLanguage(next);
    info(
      next === "ar"
        ? "تم تحويل الواجهة إلى العربية"
        : "Switched to English interface",
    );
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="القائمة"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="font-bold text-lg sm:text-xl text-slate-800 tracking-tight">
            {pageTitle}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {language === "ar" ? "الربط السحابي متصل" : "Cloud Connected"}
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role Switcher Pill */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setRole("admin")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              role === "admin"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            {language === "ar" ? "مدير النظام" : "Admin"}
          </button>
          <button
            onClick={() => setRole("accountant")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              role === "accountant"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-600" />
            {language === "ar" ? "محاسب" : "Accountant"}
          </button>
        </div>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          title="تبديل اللغة / Switch Language"
        >
          <Globe className="w-4 h-4 text-slate-500" />
          <span>{language === "ar" ? "English" : "عربي"}</span>
        </button>

        {/* User Badge / Sign Out */}
        <div className="flex items-center gap-2 ps-2 border-s border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-200">
            {user?.full_name?.charAt(0) || "أ"}
          </div>
          <div className="hidden xl:block text-start">
            <p className="text-xs font-bold text-slate-800 leading-tight">
              {user?.full_name}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">
              {role === "admin" ? "مدير النظام" : "محاسب"}
            </p>
          </div>
          <button
            onClick={signOut}
            title={language === "ar" ? "تسجيل الخروج" : "Sign Out"}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
