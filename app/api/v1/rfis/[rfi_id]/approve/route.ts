import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.PO_LICE_BACKEND_URL || "http://127.0.0.1:8000";

export async function PATCH(request: NextRequest, { params }: { params: { rfi_id: string } }) {
  const headers = new Headers(request.headers);
  headers.delete("host");
  const res = await fetch(`${BACKEND_URL}/api/v1/rfis/${params.rfi_id}/approve`, {
    method: "PATCH",
    headers,
    body: request.body,
    // @ts-expect-error duplex required
    duplex: "half",
  });
  return new NextResponse(res.body, { status: res.status, headers: new Headers(res.headers) });
}
