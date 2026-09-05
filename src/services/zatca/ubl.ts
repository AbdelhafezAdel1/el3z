import { Invoice } from "../../types/database";

/**
 * Generates ZATCA UBL 2.1 XML Document Structure
 * Supports:
 * - Standard Tax Invoice (0100000)
 * - Simplified Tax Invoice (0200000)
 */
export function generateInvoiceUBLXml(invoice: Invoice): string {
  const isSimplified =
    invoice.invoice_type === "simplified_tax_invoice" ||
    !invoice.customer?.vat_number;
  const invoiceTypeCode = isSimplified ? "388" : "388"; // Standard or Simplified code
  const invoiceSubtype = isSimplified ? "0200000" : "0100000"; // ZATCA subtype

  const issueDate =
    invoice.issue_date || new Date().toISOString().split("T")[0];
  const issueTime = invoice.issue_time || "12:00:00";
  const company = invoice.company || {
    name_ar: "شركة العز للمقاولات",
    vat_number: "300000000000003",
    cr_number: "1010000000",
    building_no: "1234",
    street_ar: "طريق الملك فهد",
    district_ar: "العليا",
    city_ar: "الرياض",
    postal_code: "12214",
    country_code: "SA",
  };

  const customer = invoice.customer || {
    name_ar: "عميل عام",
    vat_number: "",
    building_no: "0000",
    street: "شارع عام",
    district: "حي عام",
    city: "الرياض",
    postal_code: "12345",
    country: "SA",
  };

  const linesXml = (invoice.items || [])
    .map((item, index) => {
      const lineId = index + 1;
      return `
    <cac:InvoiceLine>
        <cbc:ID>${lineId}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${item.quantity.toFixed(2)}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="SAR">${item.taxable_amount.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="SAR">${item.vat_amount.toFixed(2)}</cbc:TaxAmount>
            <cbc:RoundingAmount currencyID="SAR">${item.line_total.toFixed(2)}</cbc:RoundingAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="SAR">${item.taxable_amount.toFixed(2)}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="SAR">${item.vat_amount.toFixed(2)}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:ID>S</cbc:ID>
                    <cbc:Percent>${item.vat_rate.toFixed(2)}</cbc:Percent>
                    <cac:TaxScheme>
                        <cbc:ID>VAT</cbc:ID>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>${escapeXml(item.description_ar || "")}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>${item.vat_rate.toFixed(2)}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="SAR">${item.unit_price.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${invoice.invoice_number}</cbc:ID>
    <cbc:UUID>${invoice.zatca_uuid || invoice.id}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${invoiceSubtype}">${invoiceTypeCode}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
    
    <!-- Accounting Supplier Party -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${company.cr_number}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PostalAddress>
                <cbc:StreetName>${escapeXml(company.street_ar || "")}</cbc:StreetName>
                <cbc:BuildingNumber>${company.building_no || ""}</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>${escapeXml(company.district_ar || "")}</cbc:CitySubdivisionName>
                <cbc:CityName>${escapeXml(company.city_ar || "")}</cbc:CityName>
                <cbc:PostalZone>${company.postal_code || ""}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${company.vat_number}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(company.name_ar || "")}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <!-- Accounting Customer Party -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PostalAddress>
                <cbc:StreetName>${escapeXml(customer.street || "")}</cbc:StreetName>
                <cbc:BuildingNumber>${customer.building_no || ""}</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>${escapeXml(customer.district || "")}</cbc:CitySubdivisionName>
                <cbc:CityName>${escapeXml(customer.city || "")}</cbc:CityName>
                <cbc:PostalZone>${customer.postal_code || ""}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            ${
              customer.vat_number
                ? `
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${customer.vat_number}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>`
                : ""
            }
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(customer.name_ar || "")}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- Tax Totals -->
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${invoice.vat_amount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="SAR">${invoice.taxable_amount.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="SAR">${invoice.vat_amount.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>15.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <!-- Monetary Totals -->
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="SAR">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${invoice.taxable_amount.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${invoice.grand_total.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="SAR">${invoice.discount_amount.toFixed(2)}</cbc:AllowanceTotalAmount>
        <cbc:PayableAmount currencyID="SAR">${invoice.grand_total.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>

    <!-- Line Items -->
    ${linesXml}
</Invoice>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
