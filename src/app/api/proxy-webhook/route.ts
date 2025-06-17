// This file is no longer needed as we're using Vercel Blob uploads
// Keeping it for reference but it's not used in the new implementation

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/call-upload instead." },
    { status: 410 },
  );
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Target-Url",
    },
  });
}
