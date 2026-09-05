import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types/database";
import { ShieldAlert, ArrowRight } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  onNavigateHome?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  onNavigateHome,
}) => {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">
            جاري التحقق من الصلاحيات...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div className="min-h-[450px] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-100 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">
            غير مصرح لك بالوصول
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            عذراً، يتطلب الوصول إلى هذه الصفحة صلاحية خاصة (
            <span className="font-bold text-slate-700">
              {allowedRoles.join(" أو ")}
            </span>
            ). دورك الحالي هو:{" "}
            <span className="font-bold text-emerald-800">{user.role}</span>.
          </p>
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="mt-4 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-all shadow-md"
            >
              <span>العودة للرئيسية</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
