import { Invoice, ZatcaStatus } from "../../types/database";

export type ZatcaEnvironment = "sandbox" | "simulation" | "production";
export type ZatcaMode = "test" | "mock" | "production";

export interface ZatcaIssue {
  code: string;
  category: "vat" | "cr" | "buyer" | "seller" | "line_item" | "calculation" | "general";
  messageAr: string;
  messageEn: string;
  field?: string;
  severity: "error" | "warning";
}

export interface ZatcaValidationResult {
  isValid: boolean;
  errors: ZatcaIssue[];
  warnings: ZatcaIssue[];
  validatedAt: string;
  invoiceType: "standard" | "simplified";
}

export interface ZatcaQrFields {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601 e.g. 2026-09-02T14:30:00Z
  totalAmount: string; // Formatted to 2 decimal places e.g. "115.00"
  vatAmount: string; // Formatted to 2 decimal places e.g. "15.00"
  invoiceHash?: string; // Phase 2: SHA-256 base64/hex
  ecdsaSignature?: string; // Phase 2: ECDSA Signature
  ecdsaPublicKey?: string; // Phase 2: ECDSA Public Key
}

export interface ZatcaQrResult {
  tlvBase64: string;
  qrDataUrl: string;
}

export interface ZatcaSubmissionOptions {
  environment?: ZatcaEnvironment;
  mode?: ZatcaMode;
  csid?: string;
  privateKey?: string;
  invoiceType?: "tax_invoice" | "simplified_tax_invoice";
}

export interface ZatcaSubmissionResult {
  success: boolean;
  submissionId: string;
  status: ZatcaStatus;
  invoiceId: string;
  invoiceNumber: string;
  environment: ZatcaEnvironment;
  mode: ZatcaMode;
  invoiceHash: string;
  qrBase64: string;
  qrDataUrl: string;
  xmlPayload: string;
  reportingStatus?: "REPORTED" | "CLEARED" | "REJECTED" | "NOT_SUBMITTED";
  validationResult?: ZatcaValidationResult;
  warningMessages?: string[];
  errorCode?: string;
  errorMessage?: string;
  isSimulated: boolean;
  submittedAt: string;
  rawResponse?: Record<string, any>;
}

export interface ZatcaSubmissionStatusResult {
  submissionId: string;
  invoiceNumber: string;
  status: ZatcaStatus;
  environment: ZatcaEnvironment;
  submittedAt: string;
  clearedAt?: string;
  reportedAt?: string;
  warnings?: string[];
  errors?: string[];
}
