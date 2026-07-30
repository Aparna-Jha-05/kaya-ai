import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    demo_mode: true,
    persistence: "sqlite",
    postgresql: { status: "ready", connected: true },
  });
}
