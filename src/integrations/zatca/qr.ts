import QRCode from "qrcode";
import { ZatcaQrFields, ZatcaQrResult } from "./types";

/**
 * Encodes a string value into a TLV (Tag, Length, Value) byte array.
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
 * Converts Uint8Array bytes to Base64 string.
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
 * Generates official ZATCA Phase 1 / Phase 2 compliant TLV Base64 string.
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
 * Generates high-res DataURL image from TLV Base64 string.
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

/**
 * Generates complete ZATCA QR Code result (TLV Base64 and image Data URL).
 */
export async function generateQRCode(fields: ZatcaQrFields): Promise<ZatcaQrResult> {
  const tlvBase64 = generateZatcaTlvBase64(fields);
  const qrDataUrl = await generateQrDataUrl(tlvBase64);
  return {
    tlvBase64,
    qrDataUrl,
  };
}
