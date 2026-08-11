import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.PO_LICE_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, BACKEND_URL);
  const res = await fetch(url.toString());
  return new NextResponse(res.body, { status: res.status, headers: new Headers(res.headers) });
}
