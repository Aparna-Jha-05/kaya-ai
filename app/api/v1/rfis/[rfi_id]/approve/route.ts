import { NextRequest, NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { rfi_id: string } }
) {
  try {
    const body = await request.json();
    const { edited_text } = body;
    const approved = backendStore.approveRfi(params.rfi_id, edited_text);
    return NextResponse.json(approved);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to approve RFI" },
      { status: 400 }
    );
  }
}
