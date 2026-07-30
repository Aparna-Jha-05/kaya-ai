import { NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function GET() {
  const bids = backendStore.getBids();
  return NextResponse.json(bids);
}
