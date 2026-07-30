import { NextRequest, NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bid_id } = body;
    const rfi = backendStore.generateRfiDraft(bid_id);
    return NextResponse.json(rfi);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to generate RFI draft" },
      { status: 400 }
    );
  }
}
