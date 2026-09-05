import { Invoice } from "../../types/database";

/**
 * Generates official ZATCA UBL 2.1 XML for Standard (0100000) and Simplified (0200000) Invoices.
 */
export function generateInvoiceXML(invoice: Invoice): string {
  const isSimplified =
    invoice.invoice_type === "simplified_tax_invoice" ||
    !invoice.customer?.vat_number;

  const invoiceTypeCode = "388";
  const invoiceSubtype = isSimplified ? "0200000" : "0100000";

  const issueDate =
    invoice.issue_date || new Date().toISOString().split("T")[0];
  const issueTime = invoice.issue_time || "12:00:00";

  const company = invoice.company || {
    name_ar: "مؤسسة رند العز للمقاولات العامة",
    name_en: "Rand Al-Az General Contracting Est.",
    vat_number: "310123456700003",
    cr_number: "2051233487",
    building_no: "1234",
    street_ar: "شارع الملك فهد",
    district_ar: "الخبر الشمالية",
    city_ar: "الخبر",
    postal_code: "31952",
    country_code: "SA",
  };

  const customer = invoice.customer || {
    name_ar: "عميل نقدي",
    company_name: "",
    vat_number: "",
    building_no: "0000",
    street: "شارع عام",
    district: "حي عام",
    city: "الرياض",
    postal_code: "12345",
    country: "SA",
  };

  const items = invoice.items || [];
  const linesXml = items
    .map((item, index) => {
      const lineId = item.item_order || index + 1;
      const taxableAmount = (item.taxable_amount || 0).toFixed(2);
      const vatAmount = (item.vat_amount || 0).toFixed(2);
      const lineTotal = (item.line_total || 0).toFixed(2);
      const vatRate = (item.vat_rate || 15.0).toFixed(2);
      const unitPrice = (item.unit_price || 0).toFixed(2);
      const quantity = (item.quantity || 1).toFixed(2);
      const itemName = escapeXml(item.description_ar || item.description_en || "خدمة");

      return `    <cac:InvoiceLine>
        <cbc:ID>${lineId}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="SAR">${taxableAmount}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="SAR">${vatAmount}</cbc:TaxAmount>
            <cbc:RoundingAmount currencyID="SAR">${lineTotal}</cbc:RoundingAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="SAR">${taxableAmount}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="SAR">${vatAmount}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:ID>S</cbc:ID>
                    <cbc:Percent>${vatRate}</cbc:Percent>
                    <cac:TaxScheme>
                        <cbc:ID>VAT</cbc:ID>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>${itemName}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>${vatRate}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="SAR">${unitPrice}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`;
    })
    .join("\n");

  const subtotal = (invoice.subtotal || invoice.taxable_amount || 0).toFixed(2);
  const taxableAmount = (invoice.taxable_amount || invoice.subtotal || 0).toFixed(2);
  const discountAmount = (invoice.discount_amount || 0).toFixed(2);
  const vatAmount = (invoice.vat_amount || 0).toFixed(2);
  const grandTotal = (invoice.grand_total || 0).toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${escapeXml(invoice.invoice_number || "INV-000")}</cbc:ID>
    <cbc:UUID>${escapeXml(invoice.zatca_uuid || invoice.id || crypto.randomUUID())}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${invoiceSubtype}">${invoiceTypeCode}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>

    <!-- Accounting Supplier Party (Seller) -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${escapeXml(company.cr_number || "")}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PostalAddress>
                <cbc:StreetName>${escapeXml(company.street_ar || "شارع الملك فهد")}</cbc:StreetName>
                <cbc:BuildingNumber>${escapeXml(company.building_no || "1234")}</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>${escapeXml(company.district_ar || "الخبر الشمالية")}</cbc:CitySubdivisionName>
                <cbc:CityName>${escapeXml(company.city_ar || "الخبر")}</cbc:CityName>
                <cbc:PostalZone>${escapeXml(company.postal_code || "31952")}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${escapeXml(company.vat_number || "")}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(company.name_ar || "")}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <!-- Accounting Customer Party (Buyer) -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PostalAddress>
                <cbc:StreetName>${escapeXml(customer.street || "شارع عام")}</cbc:StreetName>
                <cbc:BuildingNumber>${escapeXml(customer.building_no || "0000")}</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>${escapeXml(customer.district || "حي عام")}</cbc:CitySubdivisionName>
                <cbc:CityName>${escapeXml(customer.city || "الرياض")}</cbc:CityName>
                <cbc:PostalZone>${escapeXml(customer.postal_code || "12345")}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            ${
              customer.vat_number
                ? `<cac:PartyTaxScheme>
                <cbc:CompanyID>${escapeXml(customer.vat_number)}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>`
                : ""
            }
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(customer.name_ar || customer.company_name || "عميل نقدي")}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- Tax Totals -->
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${vatAmount}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="SAR">${taxableAmount}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="SAR">${vatAmount}</cbc:TaxAmount>
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
        <cbc:LineExtensionAmount currencyID="SAR">${subtotal}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${taxableAmount}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${grandTotal}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="SAR">${discountAmount}</cbc:AllowanceTotalAmount>
        <cbc:PayableAmount currencyID="SAR">${grandTotal}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>

    <!-- Line Items -->
${linesXml}
</Invoice>`;
}

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
