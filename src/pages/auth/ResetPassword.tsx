import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";

interface ResetPasswordProps {
  onSuccessNavigateToLogin: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({
  onSuccessNavigateToLogin,
}) => {
  const { updatePassword } = useAuth();
  const { success, error } = useToast();
  const { direction } = useLanguage();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 6) {
      setErrorMessage("كلمة المرور يجب أن لا تقل عن 6 خانات");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("كلمتا المرور غير متطابقتين");
      return;
    }

    setIsSubmitting(true);
    const res = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (res.success) {
      setIsCompleted(true);
      success("تم تحديث كلمة المرور بنجاح");
    } else {
      const msg = res.error || "تعذر تحديث كلمة المرور، يرجى المحاولة لاحقاً";
      setErrorMessage(msg);
      error("خطأ في تحديث كلمة المرور", msg);
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
            تعيين كلمة مرور جديدة
          </h2>
          <p className="text-xs text-slate-500">
            أدخل كلمة المرور الجديدة لحسابك وقم بتأكيدها
          </p>
        </div>

        {isCompleted ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-3 text-center">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-bold">تم تعيين كلمة المرور الجديدة بنجاح!</p>
            <p className="text-slate-600 text-[11px]">
              يمكنك الآن تسجيل الدخول إلى حسابك باستخدام كلمة المرور الجديدة.
            </p>
            <button
              type="button"
              onClick={onSuccessNavigateToLogin}
              className="w-full mt-2 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span>تسجيل الدخول الآن</span>
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
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
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
                <span>حفظ كلمة المرور الجديدة</span>
              )}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};
