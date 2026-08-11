import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.PO_LICE_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  const res = await fetch(`${BACKEND_URL}/api/v1/site-constraints`);
  return new NextResponse(res.body, { status: res.status, headers: new Headers(res.headers) });
}

export async function PUT(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("host");
  const res = await fetch(`${BACKEND_URL}/api/v1/site-constraints`, {
    method: "PUT",
    headers,
    body: request.body,
    // @ts-expect-error duplex required
    duplex: "half",
  });
  return new NextResponse(res.body, { status: res.status, headers: new Headers(res.headers) });
}
