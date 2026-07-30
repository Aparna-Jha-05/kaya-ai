import { NextRequest, NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const filename = file?.name || "Uploaded_Bid.pdf";

    const record = backendStore.addBid(filename);
    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Upload processing failed" },
      { status: 400 }
    );
  }
}
