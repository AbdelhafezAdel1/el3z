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
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.borderRadius = "0px";
          clonedElement.style.boxShadow = "none";
          clonedElement.style.border = "none";
          clonedElement.style.width = "794px";
          clonedElement.style.minHeight = "1123px";
          clonedElement.style.margin = "0";
        }
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

    // Standard A4 dimensions: 210mm x 297mm (100% full-page fill without white borders)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Exact full A4 page coverage
    pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");

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
export async function printInvoice(
  elementId: string = "invoice-document-render",
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Invoice element "${elementId}" not found for printing`);
    window.print();
    return;
  }

  // Ensure all web fonts are fully loaded before canvas snapshot
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // High-resolution canvas capture with Arabic RTL font preservation — exactly matching downloadInvoicePDF
  const canvas = await html2canvas(element, {
    scale: 3, // Ultra-crisp vector-level resolution
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.getElementById(elementId);
      if (clonedElement) {
        clonedElement.style.borderRadius = "0px";
        clonedElement.style.boxShadow = "none";
        clonedElement.style.border = "none";
        clonedElement.style.width = "794px";
        clonedElement.style.minHeight = "1123px";
        clonedElement.style.margin = "0";
      }
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
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden;
          }
          .invoice-img {
            width: 100%;
            height: 100%;
            object-fit: fill;
            display: block;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <img id="print-invoice-img" class="invoice-img" src="${imgData}" alt="فاتورة ضريبية" />
        <script>
          const img = document.getElementById('print-invoice-img');
          const triggerPrint = () => {
            setTimeout(() => {
              window.focus();
              window.print();
              window.close();
            }, 250);
          };
          if (img && img.complete) {
            triggerPrint();
          } else if (img) {
            img.onload = triggerPrint;
          } else {
            triggerPrint();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
