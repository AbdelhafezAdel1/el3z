import fs from "fs";
import path from "path";
import {
  signComplianceInvoice,
  ComplianceApi,
  asCertificatePem,
} from "@talha7k/zatca";

const WORKDIR = path.resolve("./zatca_onboarding");
const complianceData = JSON.parse(fs.readFileSync(path.join(WORKDIR, "zatca_compliance_response.json"), "utf8"));
const privateKeyPem = fs.readFileSync(path.join(WORKDIR, "private-key.pem"), "utf8");

const requestID = complianceData.requestID;
const binarySecurityToken = complianceData.binarySecurityToken;
const secret = complianceData.secret;
const certificatePem = asCertificatePem(binarySecurityToken);

console.log("=== Starting ZATCA 6 Compliance Checks for RequestID:", requestID, "===");

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

const checkTypes = [
  "SIMPLIFIED_INVOICE",
  "SIMPLIFIED_CREDIT_NOTE",
  "SIMPLIFIED_DEBIT_NOTE",
  "STANDARD_INVOICE",
  "STANDARD_CREDIT_NOTE",
  "STANDARD_DEBIT_NOTE",
];

const complianceApi = new ComplianceApi({
  environment: "production",
});

const credentials = {
  binarySecurityToken,
  secret,
};

async function runAll() {
  for (let i = 0; i < checkTypes.length; i++) {
    const checkType = checkTypes[i];
    console.log(`\n--- Step ${i + 1}/${checkTypes.length}: ${checkType} ---`);

    const signed = signComplianceInvoice({
      checkType,
      supplier,
      customer: checkType.startsWith("STANDARD") ? customer : undefined,
      privateKeyPem,
      certificatePem,
    });

    console.log("Generated & Signed XML for:", checkType, "UUID:", signed.uuid, "Hash:", signed.invoiceHash.slice(0, 20) + "...");

    const result = await complianceApi.verifyCompliance(
      credentials,
      signed.invoiceHash,
      signed.uuid,
      signed.base64SignedXml,
    );

    console.log("Result valid:", result.valid, "Messages:", JSON.stringify(result.messages));
    if (!result.valid) {
      console.error("Compliance failed for:", checkType);
      return;
    }
  }

  console.log("\n=== ALL 6 COMPLIANCE CHECKS PASSED! ===");
  console.log("=== Requesting Production CSID (PCSID)... ===");

  const prodResult = await complianceApi.requestProductionCSID(credentials, String(requestID));
  console.log("Production CSID Response:", JSON.stringify(prodResult, null, 2));

  fs.writeFileSync(path.join(WORKDIR, "final_production_csid.json"), JSON.stringify(prodResult, null, 2));

  if (prodResult.binarySecurityToken) {
    console.log("\n🎉🎉 SUCCESS! PRODUCTION CSID ISSUED! UNIT IS NOW OFFICIALLY LINKED IN ZATCA FATOORA! 🎉🎉");
  }
}

runAll().catch((err) => {
  console.error("Fatal Error:", err);
});
