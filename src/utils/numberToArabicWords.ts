/**
 * Utility to convert numeric amounts to Arabic words (Tafqeet).
 * Specifically tailored for Saudi Riyal (SAR) and Halalas.
 */

const ones = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];

const tens = [
  "",
  "",
  "عشرون",
  "ثلاثون",
  "أربعون",
  "خمسون",
  "ستون",
  "سبعون",
  "ثمانون",
  "تسعون",
];

const hundreds = [
  "",
  "مائة",
  "مئتان",
  "ثلاثمائة",
  "أربعمائة",
  "خمسمائة",
  "ستمائة",
  "سبعمائة",
  "ثمانمائة",
  "تسعمائة",
];

function convertGroup(n: number): string {
  let result = "";
  const h = Math.floor(n / 100);
  const rem = n % 100;

  if (h > 0) {
    result += hundreds[h];
  }

  if (rem > 0) {
    if (result.length > 0) result += " و ";
    if (rem < 20) {
      result += ones[rem];
    } else {
      const t = Math.floor(rem / 10);
      const o = rem % 10;
      if (o > 0) {
        result += ones[o] + " و " + tens[t];
      } else {
        result += tens[t];
      }
    }
  }

  return result;
}

export function numberToArabicWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return "صفر ريال سعودي فقط لا غير";

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  let parts: string[] = [];

  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (billions > 0) {
    if (billions === 1) parts.push("مليار");
    else if (billions === 2) parts.push("ملياران");
    else parts.push(`${convertGroup(billions)} مليار`);
  }

  if (millions > 0) {
    if (millions === 1) parts.push("مليون");
    else if (millions === 2) parts.push("مليونان");
    else if (millions >= 3 && millions <= 10) parts.push(`${convertGroup(millions)} ملايين`);
    else parts.push(`${convertGroup(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push("ألف");
    else if (thousands === 2) parts.push("ألفان");
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertGroup(thousands)} آلاف`);
    else parts.push(`${convertGroup(thousands)} ألف`);
  }

  if (remainder > 0) {
    parts.push(convertGroup(remainder));
  }

  let text = parts.join(" و ");
  if (text.length === 0) {
    text = "صفر";
  }

  text = `${text} ريال سعودي`;

  if (decimalPart > 0) {
    text += ` و ${convertGroup(decimalPart)} هللة`;
  }

  return `${isNegative ? "سالب " : "فقط "}${text} لا غير`;
}
