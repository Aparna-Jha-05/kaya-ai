import { NextResponse } from "next/server";
import { backendStore } from "@/lib/backendStore";

export async function GET() {
  return NextResponse.json(backendStore.getSuppliers());
}
