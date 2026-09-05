import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Mail, ArrowRight, ArrowLeft, Send, CheckCircle2 } from "lucide-react";

interface ForgotPasswordProps {
  onNavigateToLogin: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onNavigateToLogin,
}) => {
  const { resetPasswordForEmail } = useAuth();
  const { success, error } = useToast();
  const { direction } = useLanguage();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("يرجى إدخال البريد الإلكتروني");
      return;
    }

    setIsSubmitting(true);
    const res = await resetPasswordForEmail(email.trim());
    setIsSubmitting(false);

    if (res.success) {
      setIsSent(true);
      success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني");
    } else {
      const msg = res.error || "تعذر إرسال الرابط، يرجى المحاولة لاحقاً";
      setErrorMessage(msg);
      error("خطأ في استعادة كلمة المرور", msg);
    }
  };

  return (
    <AuthLayout
      title="مؤسسة رند العز للمقاولات العامة"
      subtitle="نظام الفواتير والربط مع هيئة الزكاة والضريبة"
    >
      <div className="space-y-4" dir={direction}>
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-1">
            استعادة كلمة المرور
          </h2>
          <p className="text-xs text-slate-500">
            أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً لإعادة تعيين كلمة
            المرور
          </p>
        </div>

        {isSent ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-3 text-center">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-bold">تم إرسال رابط الاستعادة بنجاح!</p>
            <p className="text-slate-600 text-[11px]">
              يرجى التحقق من صندوق الوارد في بريدك الإلكتروني{" "}
              <span className="font-semibold text-emerald-900 font-mono">
                {email}
              </span>{" "}
              واتباع التعليمات.
            </p>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full mt-2 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span>العودة لتسجيل الدخول</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                البريد الإلكتروني المسجل
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.99] text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال رابط الاستعادة</span>
                </>
              )}
            </button>

            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs text-slate-600 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                {direction === "rtl" ? (
                  <ArrowRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowLeft className="w-3.5 h-3.5" />
                )}
                <span>العودة لصفحة تسجيل الدخول</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};
