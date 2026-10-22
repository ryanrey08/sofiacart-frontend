import type { NextConfig } from "next";

// Response security headers applied to every route. The Content-Security-Policy is intentionally
// conservative (clickjacking, base-uri and plugin hardening only) so it cannot break the legal
// document viewer, which renders blob: PDF/Word previews on this origin; tightening
// script-src/style-src is a tested follow-up (see SECURITY.md in sofiacart-website).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework/version in responses.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
