import React from "react";
import { formatSAR } from "../../lib/money";
import { useLanguage } from "../../contexts/LanguageContext";

interface CurrencyDisplayProps {
  amount: number | string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showCurrency?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  className = "",
  size = "md",
  showCurrency = true,
}) => {
  const { language } = useLanguage();
  const formatted = formatSAR(amount, language);

  let sizeClass = "text-base font-semibold";
  if (size === "sm") sizeClass = "text-sm font-medium";
  if (size === "lg") sizeClass = "text-lg font-bold";
  if (size === "xl")
    sizeClass = "text-2xl sm:text-3xl font-extrabold tracking-tight";

  return (
    <span className={`tabular-nums ${sizeClass} ${className}`}>
      {showCurrency ? formatted : amount ? Number(amount).toFixed(2) : "0.00"}
    </span>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 6,
}) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
      <div className="h-12 bg-slate-100 border-b border-slate-200"></div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-6 bg-slate-100 rounded-md flex-1"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
