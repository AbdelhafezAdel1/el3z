/**
 * AuthLayout
 *
 * Centered layout for unauthenticated pages (Login, Register, ForgotPassword).
 * Renders a card-like container over a branded background.
 */
import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
  /** Optional page title shown above the card */
  title?: string;
  /** Optional subtitle / description */
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 text-white mb-4 shadow-lg">
            <span className="text-2xl font-bold">ع</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {title ?? "العز للمقاولات"}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">{children}</div>
      </div>
    </div>
  );
}
