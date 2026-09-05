import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Invoice } from "../../types/database";
import { SupabaseStorageService } from "../../services/storage/supabaseStorage";
import { AuditService } from "../../services/audit";

/**
 * Downloads the rendered invoice element as a high-definition A4 PDF
 * and optionally uploads it to Supabase Storage.
 */
export async function downloadInvoicePDF(
  invoice: Partial<Invoice>,
  elementId: string = "invoice-document-render",
): Promise<{ success: boolean; pdfUrl?: string | null }> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Invoice element with id "${elementId}" was not found in DOM`);
      return { success: false };
    }

    // Ensure all web fonts are fully loaded before canvas snapshot
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // High-resolution canvas capture with Arabic RTL font preservation
    const canvas = await html2canvas(element, {
      scale: 3, // Ultra-crisp vector-level resolution
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement("style");
        style.innerHTML = `
          * {
            letter-spacing: 0 !important;
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif !important;
            word-break: keep-all !important;
            text-rendering: geometricPrecision !important;
            -webkit-font-smoothing: antialiased !important;
          }
          .font-mono {
            font-family: 'Courier New', Courier, monospace !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      },
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    // Standard A4 dimensions: 210mm x 297mm
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 4; // 4mm printable margin
    const availWidth = pageWidth - margin * 2;
    const availHeight = pageHeight - margin * 2;

    const imgRatio = canvas.width / canvas.height;
    let renderWidth = availWidth;
    let renderHeight = availWidth / imgRatio;

    if (renderHeight > availHeight) {
      renderHeight = availHeight;
      renderWidth = availHeight * imgRatio;
    }

    const xOffset = margin + (availWidth - renderWidth) / 2;
    const yOffset = margin + (availHeight - renderHeight) / 2;

    pdf.addImage(imgData, "JPEG", xOffset, yOffset, renderWidth, renderHeight, undefined, "FAST");

    // Save and download locally
    const fileName = `فاتورة_${invoice.invoice_number || "INV"}.pdf`;
    pdf.save(fileName);

    // Upload PDF blob to Supabase Storage if configured
    let uploadedPdfUrl: string | null = null;
    if (invoice.id) {
      try {
        const pdfBlob = pdf.output("blob");
        uploadedPdfUrl = await SupabaseStorageService.uploadInvoicePDF(
          invoice.id,
          pdfBlob,
        );
      } catch (uploadErr) {
        console.warn("Could not upload invoice PDF to Supabase storage:", uploadErr);
      }
    }

    // Audit Logging
    await AuditService.log({
      action: "GENERATE_PDF",
      entity_type: "pdf",
      entity_id: invoice.id,
      metadata: {
        invoice_number: invoice.invoice_number,
        file_name: fileName,
        uploaded_url: uploadedPdfUrl,
      },
    });

    return { success: true, pdfUrl: uploadedPdfUrl };
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return { success: false };
  }
}

/**
 * Direct browser printing with exact single A4 portrait styling
 */
export function printInvoice(
  elementId: string = "invoice-document-render",
): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Invoice element "${elementId}" not found for printing`);
    window.print();
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>طباعة الفاتورة الضريبية</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            letter-spacing: 0 !important;
            box-sizing: border-box;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-font-smoothing: antialiased !important;
            word-break: keep-all !important;
            line-height: 1.4;
          }
          #invoice-document-render {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 2mm !important;
            overflow: visible !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          td, th {
            word-break: normal !important;
          }
          .font-mono {
            font-family: 'Courier New', Courier, monospace !important;
          }
        </style>
      </head>
      <body class="p-1">
        ${element.outerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 600);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
