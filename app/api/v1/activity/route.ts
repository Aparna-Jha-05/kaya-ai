import { NextRequest, NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bidId = searchParams.get("bid_id") || undefined;
  const events = backendStore.getActivity(bidId);
  return NextResponse.json(events);
}
