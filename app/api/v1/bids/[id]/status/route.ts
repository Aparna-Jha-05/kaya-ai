import { NextRequest, NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { decision, expected_version, reason } = body;
    const updated = backendStore.updateOfficerDecision(
      params.id,
      decision,
      expected_version ?? 1,
      reason || ""
    );
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update decision";
    if (msg.includes("not found")) {
      return NextResponse.json({ detail: msg }, { status: 404 });
    }
    if (msg.includes("Stale version")) {
      return NextResponse.json({ detail: msg }, { status: 409 });
    }
    return NextResponse.json({ detail: msg }, { status: 400 });
  }
}
