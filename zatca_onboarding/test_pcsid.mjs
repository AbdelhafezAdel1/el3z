import fs from "fs";
import path from "path";

const WORKDIR = path.resolve("./zatca_onboarding");
const complianceData = JSON.parse(fs.readFileSync(path.join(WORKDIR, "zatca_compliance_response.json"), "utf8"));

const requestID = complianceData.requestID;
const binarySecurityToken = complianceData.binarySecurityToken;
const secret = complianceData.secret;

console.log("Compliance Request ID:", requestID);

const basicAuth = Buffer.from(`${binarySecurityToken}:${secret}`).toString("base64");

async function getProductionCSID() {
  const endpoint = "https://gw-fatoora.zatca.gov.sa/e-invoicing/core/production/csids";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Accept-Version": "V2",
        "accept-language": "en",
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        compliance_request_id: String(requestID),
      }),
    });

    const status = res.status;
    const text = await res.text();
    console.log("Production CSID Status:", status);
    console.log("Production CSID Body:", text);

    fs.writeFileSync(path.join(WORKDIR, "zatca_production_response.json"), text);
  } catch (err) {
    console.error("Error:", err);
  }
}

getProductionCSID();
