import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PRODUCTION_BACKEND_URL = "https://po-lice-backend-staging.onrender.com";

function getBackendUrl(): string {
  const raw =
    process.env.PO_LICE_BACKEND_URL ||
    process.env.NEXT_PUBLIC_PO_LICE_API_URL ||
    (process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_BACKEND_URL : "http://127.0.0.1:8000");
  return raw.trim().replace(/\/+$/, "");
}

export async function proxyRequest(request: NextRequest, pathOverride?: string) {
  const backendBase = getBackendUrl();
  const targetPath = pathOverride || (request.nextUrl.pathname + request.nextUrl.search);
  const targetUrl = `${backendBase}${targetPath.startsWith("/") ? "" : "/"}${targetPath}`;

  const headers = new Headers();
  const allowedHeaders = ["content-type", "accept", "authorization", "x-idempotency-key"];
  for (const h of allowedHeaders) {
    const val = request.headers.get(h);
    if (val) headers.set(h, val);
  }

  const options: RequestInit = {
    method: request.method,
    headers,
  };

  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    options.body = request.body;
    // @ts-expect-error duplex required for node fetch
    options.duplex = "half";
  }

  try {
    const res = await fetch(targetUrl, options);
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const contentType = res.headers.get("content-type") || "application/json";
    const responseHeaders = new Headers({ "content-type": contentType });
    const contentDisposition = res.headers.get("content-disposition");
    if (contentDisposition) responseHeaders.set("content-disposition", contentDisposition);
    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error(`Proxy failure to ${targetUrl}:`, err);
    return NextResponse.json(
      {
        detail: `Backend proxy error connecting to ${backendBase}: ${err?.message || String(err)}`,
      },
      { status: 502 }
    );
  }
}
