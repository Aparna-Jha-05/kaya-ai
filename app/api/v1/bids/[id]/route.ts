import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.PO_LICE_BACKEND_URL || "http://127.0.0.1:8000";

async function proxy(request: NextRequest) {
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, BACKEND_URL);
  const headers = new Headers(request.headers);
  headers.delete("host");

  const options: RequestInit = {
    method: request.method,
    headers,
  };

  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    options.body = request.body;
    // @ts-expect-error duplex required
    options.duplex = "half";
  }

  const res = await fetch(url.toString(), options);

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const responseHeaders = new Headers(res.headers);
  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export { proxy as GET, proxy as DELETE, proxy as PATCH };
