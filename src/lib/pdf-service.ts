import jsPDF from 'jspdf';

export interface PdfCredentialData {
    title: string;
    jws: string;
    qrCodeDataUrl: string;
    recipientdata?: string;
    issuedAt?: string;
    id: string;
}

export const generateBraviumPdf = async (data: PdfCredentialData): Promise<Blob> => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Helper for text
    const text = (str: string, x: number, y: number, options: any = {}) => {
        doc.setFont(options.font || 'helvetica', options.style || 'normal');
        doc.setFontSize(options.size || 12);
        doc.setTextColor(options.color ? options.color[0] : 0, options.color ? options.color[1] : 0, options.color ? options.color[2] : 0);
        doc.text(str, x, y, { align: options.align || 'left', maxWidth: options.maxWidth });
    };

    // 1. Load Logo efficiently using fetch
    try {
        const logoResponse = await fetch('/logo.png');
        if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            const logoBase64 = await blobToBase64(logoBlob);
            // Logo dimensions: assumed 40mm width, auto height
            // We need to get dimensions to scale correctly, but for PDF addImage, providing W and H is best.
            // Let's assume a standard aspect ratio or just fix width and let height be auto if possible or generic.
            // jsPDF addImage(data, format, x, y, w, h)
            // To get aspect ratio we need to load it into an Image object, but let's try a fixed box first to be safe
            // OR simpler: just load it into an image to get dims.
            const img = await loadImageFromBase64(logoBase64);
            const logoWidth = 40;
            const scale = logoWidth / img.width;
            const logoHeight = img.height * scale;

            doc.addImage(logoBase64, 'PNG', margin, margin, logoWidth, logoHeight);
        } else {
            console.warn("Logo not found");
            text("BRAVIUM", margin, margin + 10, { size: 24, style: 'bold' });
        }
    } catch (e) {
        console.warn("Failed to load logo", e);
        text("BRAVIUM", margin, margin + 10, { size: 24, style: 'bold' });
    }

    let y = 50;

    // 2. Title - REMOVED per user request
    // text(data.title, margin, y, { size: 22, style: 'bold', color: [15, 23, 42] }); // Slate 900
    // y += 10;

    // 3. Metadata
    if (data.issuedAt) {
        text(`Emitido: ${data.issuedAt}`, margin, y, { size: 10, color: [100, 116, 139] }); // Slate 500
        y += 6;
    }
    // Recipient removed per user request
    /*
    if (data.recipientdata) {
        text(`Destinatario: ${data.recipientdata}`, margin, y, { size: 10, color: [100, 116, 139] });
        y += 15;
    } else {
        y += 10;
    }
    */
    y += 10;

    // Divider
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // 4. Verification Logic
    text("Verificación de Integridad", margin, y, { size: 14, style: 'bold' });
    y += 8;
    text("Visita el enlace https://bravium.es/verify e introduce el jws o escanea el QR.", margin, y, { size: 10, color: [71, 85, 105], maxWidth: pageWidth - margin * 2 });
    y += 10;

    // QR Code (Centered)
    const qrSize = 50;
    const qrX = (pageWidth - qrSize) / 2;
    doc.addImage(data.qrCodeDataUrl, 'PNG', qrX, y, qrSize, qrSize);
    y += qrSize + 10;

    // Link
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235); // Blue 600
    doc.textWithLink("https://bravium.es/verify", pageWidth / 2, y, { url: 'https://bravium.es/verify', align: 'center' });
    y += 15;

    // 5. JWS
    text("Firma Criptográfica (JWS)", margin, y, { size: 12, style: 'bold', color: [0, 0, 0] });
    y += 5;

    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.roundedRect(margin, y, pageWidth - margin * 2, 60, 2, 2, 'FD');

    const jwsLines = doc.splitTextToSize(data.jws, pageWidth - margin * 2 - 10);
    text(jwsLines, margin + 5, y + 5, { font: 'courier', size: 8, color: [71, 85, 105] });

    // Output
    const output = doc.output('arraybuffer');
    return new Blob([output], { type: 'application/pdf' });
};

// Utilities
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
};

const loadImageFromBase64 = (base64: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = base64;
    });
}
