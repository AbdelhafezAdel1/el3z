import fs from "fs";
import path from "path";
import {
  signComplianceInvoice,
  asCertificatePem,
} from "@talha7k/zatca";

const WORKDIR = path.resolve("./zatca_onboarding");
const complianceData = JSON.parse(fs.readFileSync(path.join(WORKDIR, "zatca_compliance_response.json"), "utf8"));
const privateKeyPem = fs.readFileSync(path.join(WORKDIR, "private-key.pem"), "utf8");

const binarySecurityToken = complianceData.binarySecurityToken;
const secret = complianceData.secret;
const certificatePem = asCertificatePem(binarySecurityToken);
const basicAuth = Buffer.from(`${binarySecurityToken}:${secret}`).toString("base64");

const supplier = {
  nameAr: "مؤسسة رند العز للمقاولات العامة",
  nameEn: "Rand Al-Az General Contracting Est.",
  vatNumber: "310814787400003",
  crNumber: "2051233487",
  address: {
    street: "King Fahd Road",
    building: "1234",
    district: "Al-Khobar North",
    city: "Al-Khobar",
    postalCode: "31952",
    countryCode: "SA",
  },
};

const customer = {
  name: "Advanced Construction Co.",
  vatNumber: "300000000000003",
  address: {
    street: "King Abdulaziz Road",
    building: "5678",
    district: "Al Malaz",
    city: "Riyadh",
    postalCode: "12345",
    countryCode: "SA",
  },
};

const signed = signComplianceInvoice({
  checkType: "SIMPLIFIED_CREDIT_NOTE",
  supplier,
  customer,
  invoiceCounter: 2,
  privateKeyPem,
  certificatePem,
});

async function testCredit() {
  const endpoint = "https://gw-fatoora.zatca.gov.sa/e-invoicing/core/compliance/invoices";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Accept-Version": "V2",
      "accept-language": "en",
      "Content-Type": "application/json",
      "Clearance-Status": "0",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: JSON.stringify({
      invoiceHash: signed.invoiceHash,
      uuid: signed.uuid,
      invoice: signed.base64SignedXml,
    }),
  });

  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text);
}

testCredit();
