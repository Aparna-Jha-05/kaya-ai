import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxyHelper";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}
