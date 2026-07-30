import { NextRequest, NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = backendStore.simulate(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Simulation failed" },
      { status: 400 }
    );
  }
}
