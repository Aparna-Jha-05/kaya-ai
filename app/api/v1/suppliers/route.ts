import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.PO_LICE_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  const res = await fetch(`${BACKEND_URL}/api/v1/suppliers`);
  return new NextResponse(res.body, { status: res.status, headers: new Headers(res.headers) });
}
