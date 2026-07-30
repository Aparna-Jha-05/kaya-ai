import { NextRequest, NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bid = backendStore.getBid(params.id);
  if (!bid) {
    return NextResponse.json({ detail: "Bid not found." }, { status: 404 });
  }

  // Sample Minimal PDF Content for Source Document Download
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Title (Source Document for ${bid.source.vendor_name}) /Author (PO-LICE Procurement Engine) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Count 1 /Kids [4 0 R] >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 120 >>
stream
BT
/F1 18 Tf
50 700 Td
(PO-LICE Bid Evidence: ${bid.source.vendor_name}) Tj
0 -30 Td
(Model: ${bid.source.equipment.model_number}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000118 00000 n 
0000000167 00000 n 
0000000226 00000 n 
0000000311 00000 n 
trailer
<< /Size 6 /Root 2 0 R >>
startxref
480
%%EOF`;

  return new NextResponse(pdfContent, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${params.id}.pdf"`,
    },
  });
}
