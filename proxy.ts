import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? null;

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin");
  const isPreflight = req.method === "OPTIONS";

  if (!ALLOWED_ORIGIN) {
    // Dev mode — allow all origins
    if (isPreflight) {
      return new NextResponse(null, {
        status: 204,
        headers: { "Access-Control-Allow-Origin": "*", ...CORS_HEADERS },
      });
    }
    const res = NextResponse.next();
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }

  const allowed = origin === ALLOWED_ORIGIN;

  if (isPreflight) {
    return new NextResponse(null, {
      status: allowed ? 204 : 403,
      headers: allowed
        ? { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, ...CORS_HEADERS }
        : {},
    });
  }

  const res = NextResponse.next();
  if (allowed) {
    res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  }
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
