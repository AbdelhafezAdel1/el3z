import { Voucher, VoucherType } from "../types/database";
import { LocalStore } from "./storage/localStore";
import { AuditService } from "./audit";

export interface VoucherFilterOptions {
  type?: VoucherType | "all";
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  month?: string;
  year?: string;
}

export interface VoucherStats {
  totalReceipts: number;
  totalPayments: number;
  netBalance: number;
  countReceipts: number;
  countPayments: number;
  totalCount: number;
}

export class VoucherService {
  static async getVouchers(filters?: VoucherFilterOptions): Promise<Voucher[]> {
    let list = LocalStore.getVouchers();

    if (!filters) return list;

    return list.filter((v) => {
      // Filter by type
      if (filters.type && filters.type !== "all" && v.type !== filters.type) {
        return false;
      }

      // Filter by exact date
      if (filters.date && v.date !== filters.date) {
        return false;
      }

      // Filter by year
      if (filters.year && filters.year !== "all") {
        if (!v.date.startsWith(filters.year)) return false;
      }

      // Filter by month (format 'YYYY-MM')
      if (filters.month && filters.month !== "all") {
        if (!v.date.startsWith(filters.month)) return false;
      }

      // Filter by date range
      if (filters.startDate && v.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && v.date > filters.endDate) {
        return false;
      }

      // Search term (customer_name, voucher_number, description, reference_number, invoice_number)
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase().trim();
        const matchNum = v.voucher_number.toLowerCase().includes(term);
        const matchName = v.customer_name?.toLowerCase().includes(term);
        const matchDesc = v.description?.toLowerCase().includes(term);
        const matchRef = v.reference_number?.toLowerCase().includes(term);
        const matchInv = v.invoice_number?.toLowerCase().includes(term);

        if (!matchNum && !matchName && !matchDesc && !matchRef && !matchInv) {
          return false;
        }
      }

      return true;
    });
  }

  static async getVoucherById(id: string): Promise<Voucher | null> {
    const list = LocalStore.getVouchers();
    return list.find((v) => v.id === id) || null;
  }

  static async getNextVoucherNumber(type: VoucherType): Promise<string> {
    const list = LocalStore.getVouchers();
    const prefix = type === "receipt" ? "RV" : "PV";
    const currentYear = new Date().getFullYear();

    const pattern = new RegExp(`^${prefix}-${currentYear}-(\\d+)`);
    const nums = list
      .filter((v) => v.type === type)
      .map((v) => {
        const match = v.voucher_number?.match(pattern);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    return `${prefix}-${currentYear}-${String(maxNum + 1).padStart(6, "0")}`;
  }

  static async createVoucher(
    input: Omit<Voucher, "id" | "voucher_number" | "created_at">,
  ): Promise<Voucher> {
    const id = crypto.randomUUID();
    const voucherNumber = await this.getNextVoucherNumber(input.type);
    const now = new Date().toISOString();

    const newVoucher: Voucher = {
      ...input,
      id,
      voucher_number: voucherNumber,
      created_at: now,
    };

    const currentList = LocalStore.getVouchers();
    LocalStore.saveVouchers([newVoucher, ...currentList]);

    await AuditService.log({
      action: "CREATE_VOUCHER",
      entity_type: "voucher",
      entity_id: id,
      new_data: newVoucher,
    });

    return newVoucher;
  }

  static async updateVoucher(
    id: string,
    updates: Partial<Voucher>,
  ): Promise<Voucher | null> {
    const currentList = LocalStore.getVouchers();
    const index = currentList.findIndex((v) => v.id === id);
    if (index === -1) return null;

    const oldVoucher = currentList[index];
    const updatedVoucher: Voucher = {
      ...oldVoucher,
      ...updates,
      id,
      voucher_number: oldVoucher.voucher_number, // preserve immutable number
    };

    currentList[index] = updatedVoucher;
    LocalStore.saveVouchers(currentList);

    await AuditService.log({
      action: "UPDATE_VOUCHER",
      entity_type: "voucher",
      entity_id: id,
      old_data: oldVoucher,
      new_data: updatedVoucher,
    });

    return updatedVoucher;
  }

  static async deleteVoucher(id: string): Promise<boolean> {
    const currentList = LocalStore.getVouchers();
    const target = currentList.find((v) => v.id === id);
    if (!target) return false;

    const filtered = currentList.filter((v) => v.id !== id);
    LocalStore.saveVouchers(filtered);

    await AuditService.log({
      action: "DELETE_VOUCHER",
      entity_type: "voucher",
      entity_id: id,
      old_data: target,
    });

    return true;
  }

  static async getVoucherStats(filters?: VoucherFilterOptions): Promise<VoucherStats> {
    const vouchers = await this.getVouchers(filters);

    let totalReceipts = 0;
    let totalPayments = 0;
    let countReceipts = 0;
    let countPayments = 0;

    vouchers.forEach((v) => {
      if (v.type === "receipt") {
        totalReceipts += v.amount || 0;
        countReceipts++;
      } else {
        totalPayments += v.amount || 0;
        countPayments++;
      }
    });

    return {
      totalReceipts: Number(totalReceipts.toFixed(2)),
      totalPayments: Number(totalPayments.toFixed(2)),
      netBalance: Number((totalReceipts - totalPayments).toFixed(2)),
      countReceipts,
      countPayments,
      totalCount: vouchers.length,
    };
  }
}
