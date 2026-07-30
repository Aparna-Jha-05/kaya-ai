import { NextRequest, NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, note } = body;
    const event = backendStore.addActivityAction(params.id, action || "REVIEWED", note || "");
    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to record reviewer action" },
      { status: 400 }
    );
  }
}
