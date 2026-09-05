import QRCode from "qrcode";

/**
 * ZATCA Phase 1 TLV (Tag-Length-Value) Encoder
 * In accordance with ZATCA Electronic Invoicing Security & QR Code specifications:
 * Tag 1: Seller's name
 * Tag 2: VAT registration number of the seller
 * Tag 3: Time stamp of the invoice (ISO 8601)
 * Tag 4: Invoice total (with VAT)
 * Tag 5: VAT total
 * Tag 6: Hash of XML invoice (Phase 2)
 * Tag 7: ECDSA signature (Phase 2)
 * Tag 8: ECDSA Public Key (Phase 2)
 */

export interface ZatcaQrFields {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601 e.g. 2026-09-02T14:30:00Z
  totalAmount: string; // formatted to 2 decimal places e.g. "115.00"
  vatAmount: string; // formatted to 2 decimal places e.g. "15.00"
  invoiceHash?: string;
  ecdsaSignature?: string;
  ecdsaPublicKey?: string;
}

/**
 * Encodes a string value into a TLV (Tag, Length, Value) byte buffer
 */
function getTlvTag(tagNumber: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBytes = encoder.encode(value);
  const length = valueBytes.length;

  const tlvBytes = new Uint8Array(2 + length);
  tlvBytes[0] = tagNumber;
  tlvBytes[1] = length;
  tlvBytes.set(valueBytes, 2);

  return tlvBytes;
}

/**
 * Converts a Uint8Array into a Base64 encoded string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generates official ZATCA Phase 1 / Phase 2 compliant TLV Base64 string
 */
export function generateZatcaTlvBase64(fields: ZatcaQrFields): string {
  const tags: Uint8Array[] = [
    getTlvTag(1, fields.sellerName || ""),
    getTlvTag(2, fields.vatNumber || ""),
    getTlvTag(3, fields.timestamp || new Date().toISOString()),
    getTlvTag(4, fields.totalAmount || "0.00"),
    getTlvTag(5, fields.vatAmount || "0.00"),
  ];

  if (fields.invoiceHash) {
    tags.push(getTlvTag(6, fields.invoiceHash));
  }
  if (fields.ecdsaSignature) {
    tags.push(getTlvTag(7, fields.ecdsaSignature));
  }
  if (fields.ecdsaPublicKey) {
    tags.push(getTlvTag(8, fields.ecdsaPublicKey));
  }

  // Calculate total length
  const totalLength = tags.reduce((acc, tag) => acc + tag.length, 0);
  const combined = new Uint8Array(totalLength);

  let offset = 0;
  for (const tag of tags) {
    combined.set(tag, offset);
    offset += tag.length;
  }

  return uint8ArrayToBase64(combined);
}

/**
 * Generates high-res DataURL image for the QR Code to be embedded into PDF and UI
 */
export async function generateQrDataUrl(tlvBase64: string): Promise<string> {
  try {
    return await QRCode.toDataURL(tlvBase64, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 256,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (error) {
    console.error("Failed to generate QR Data URL:", error);
    return "";
  }
}
