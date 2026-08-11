import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.PO_LICE_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  const url = new URL("/api/v1/bids/simulate", BACKEND_URL);
  const headers = new Headers(request.headers);
  headers.delete("host");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: request.body,
    // @ts-expect-error duplex required
    duplex: "half",
  });

  return new NextResponse(res.body, { status: res.status, headers: new Headers(res.headers) });
}
