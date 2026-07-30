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
  return NextResponse.json(bid);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const removed = backendStore.removeBid(params.id);
  if (!removed) {
    return NextResponse.json({ detail: "Bid not found." }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
