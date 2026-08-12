import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxyHelper";

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}
