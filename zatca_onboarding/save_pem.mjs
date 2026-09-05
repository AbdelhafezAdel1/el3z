import fs from "fs";
import { asCertificatePem } from "@talha7k/zatca";

const data = JSON.parse(fs.readFileSync("zatca_onboarding/final_production_csid.json", "utf8"));
const pem = asCertificatePem(data.binarySecurityToken);
fs.writeFileSync("zatca_onboarding/production_cert.pem", pem);
console.log("PEM:\n", pem);
