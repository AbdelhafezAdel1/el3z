import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const OPENSSL_BIN = "C:\\Program Files\\Git\\usr\\bin\\openssl.exe";
const WORKDIR = path.resolve("./zatca_onboarding");

const VAT_NUMBER = "310814787400003";
const COMPANY_NAME = "Rand Al-Az General Contracting Est.";
const BRANCH_OU = "Khobar";
const OTP = "103408";
const SOLUTION_NAME = "Rand-AlAz-EGS-01";
const SERIAL = "1-RandAlAz|2-EGS1|3-623b3f2e-e478-4389-a2a1-b84738573111";

console.log("=== Step 1: Generating secp256k1 private key ===");
const keyPath = path.join(WORKDIR, "private-key.pem");
execSync(`"${OPENSSL_BIN}" ecparam -name secp256k1 -genkey -noout -out "${keyPath}"`);
console.log("Private key generated successfully at:", keyPath);

console.log("=== Step 2: Creating OpenSSL config for ZATCA CSR ===");
const configContent = `oid_section = OIDs

[OIDs]
certificateTemplateName = 1.3.6.1.4.1.311.20.2

[req]
default_bits = 2048
emailAddress = a506025022@gmail.com
req_extensions = req_ext
distinguished_name = dn
prompt = no

[dn]
C = SA
OU = ${BRANCH_OU}
O = ${COMPANY_NAME}
CN = ${SOLUTION_NAME}

[req_ext]
certificateTemplateName = ASN1:PRINTABLESTRING:ZATCA-Code-Signing
subjectAltName = dirName:alt_names

[alt_names]
SN = ${SERIAL}
UID = ${VAT_NUMBER}
title = 1100
registeredAddress = Al-Khobar
businessCategory = Construction
`;

const configPath = path.join(WORKDIR, "zatca_csr.cnf");
fs.writeFileSync(configPath, configContent);
console.log("Config written to:", configPath);

console.log("=== Step 3: Generating CSR ===");
const csrPath = path.join(WORKDIR, "taxpayer.csr");
execSync(`"${OPENSSL_BIN}" req -new -sha256 -key "${keyPath}" -extensions req_ext -config "${configPath}" -out "${csrPath}"`);
console.log("CSR generated successfully at:", csrPath);

const csrPem = fs.readFileSync(csrPath, "utf8");
console.log("CSR PEM:\n", csrPem);

const csrBase64 = Buffer.from(csrPem).toString("base64");

console.log("=== Step 4: Calling ZATCA Compliance API ===");
const endpoint = "https://gw-fatoora.zatca.gov.sa/e-invoicing/core/compliance";

async function sendToZatca() {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Accept-Version": "V2",
        "accept-language": "en",
        "Content-Type": "application/json",
        "OTP": OTP,
      },
      body: JSON.stringify({
        csr: csrBase64,
      }),
    });

    const status = res.status;
    const text = await res.text();
    console.log("HTTP Status:", status);
    console.log("Response Body:", text);

    fs.writeFileSync(path.join(WORKDIR, "zatca_compliance_response.json"), text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

sendToZatca();
