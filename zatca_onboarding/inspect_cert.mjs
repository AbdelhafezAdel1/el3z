import fs from "fs";
import { execSync } from "child_process";

const data = JSON.parse(fs.readFileSync("zatca_onboarding/final_production_csid.json", "utf8"));
const der = Buffer.from(data.binarySecurityToken, "base64");
fs.writeFileSync("zatca_onboarding/cert.der", der);

const out = execSync('& "C:\\Program Files\\Git\\usr\\bin\\openssl.exe" x509 -inform DER -in zatca_onboarding/cert.der -subject -issuer -dates -noout', { shell: "powershell" });
console.log(out.toString());
