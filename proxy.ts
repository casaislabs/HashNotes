import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL ? `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}` : "";
    const nonce = crypto.randomUUID();
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: " + gateway,
      "script-src 'self' 'nonce-" + nonce + "'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "connect-src 'self'",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
    ].join("; ");
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("Content-Security-Policy", csp);
    requestHeaders.set("x-nonce", nonce);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"],
};