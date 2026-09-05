import React from "react";
import { InvoiceStatus, ZatcaStatus } from "../../types/database";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  Ban,
  ShieldCheck,
  Send,
} from "lucide-react";

interface StatusBadgeProps {
  status?: InvoiceStatus;
  zatcaStatus?: ZatcaStatus;
  type?: "invoice" | "zatca";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  zatcaStatus,
  type = "invoice",
}) => {
  if (type === "zatca" || zatcaStatus) {
    const zStatus = zatcaStatus || "not_submitted";

    switch (zStatus) {
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            معتمدة بالزكاة (Accepted)
          </span>
        );
      case "submitted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            تم الرفع (Submitted)
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            قيد المعالجة (Pending)
          </span>
        );
      case "rejected":
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            مرفوضة / خطأ (Rejected)
          </span>
        );
      case "not_submitted":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            غير مرفوعة (Not Submitted)
          </span>
        );
    }
  }

  // Invoice Business Status
  const invStatus = status || "draft";
  switch (invStatus) {
    case "paid":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          مدفوعة (Paid)
        </span>
      );
    case "issued":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          مصدرة (Issued)
        </span>
      );
    case "partially_paid":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          مدفوعة جزئياً (Partial)
        </span>
      );
    case "unpaid":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          غير مدفوعة (Unpaid)
        </span>
      );
    case "cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300 line-through">
          <Ban className="w-3.5 h-3.5 text-slate-500" />
          ملغاة (Cancelled)
        </span>
      );
    case "draft":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <FileEdit className="w-3.5 h-3.5 text-slate-500" />
          مسودة (Draft)
        </span>
      );
  }
};
