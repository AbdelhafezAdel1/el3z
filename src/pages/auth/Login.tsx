import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Lock, Mail, Eye, EyeOff, LogIn } from "lucide-react";

interface LoginProps {
  onNavigateToForgotPassword?: () => void;
  onLoginSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({
  onNavigateToForgotPassword,
  onLoginSuccess,
}) => {
  const { signIn, isLoading } = useAuth();
  const { success, error } = useToast();
  const { direction } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("يرجى إدخال البريد الإلكتروني");
      return;
    }
    if (!password) {
      setErrorMessage("يرجى إدخال كلمة المرور");
      return;
    }

    const res = await signIn(email.trim(), password);
    if (res.success) {
      success("تم تسجيل الدخول بنجاح");
      onLoginSuccess?.();
    } else {
      const msg =
        res.error || "بيانات الدخول غير صحيحة، يرجى التحقق وإعادة المحاولة";
      setErrorMessage(msg);
      error("خطأ في تسجيل الدخول", msg);
    }
  };

  return (
    <AuthLayout
      title="مؤسسة رند العز للمقاولات العامة"
      subtitle="نظام الفواتير الإلكترونية والربط مع هيئة الزكاة والضريبة (زاتكا)"
    >
      <form onSubmit={handleSubmit} className="space-y-4" dir={direction}>
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-1">
            تسجيل الدخول
          </h2>
          <p className="text-xs text-slate-500">
            أدخل بريدك الإلكتروني وكلمة المرور للمتابعة إلى لوحة التحكم
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            البريد الإلكتروني
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@alezz.sa"
              className="w-full ps-9 pe-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">
              كلمة المرور
            </label>
            {onNavigateToForgotPassword && (
              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full ps-9 pe-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.99] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>دخول النظام</span>
            </>
          )}
        </button>

      </form>
    </AuthLayout>
  );
};
