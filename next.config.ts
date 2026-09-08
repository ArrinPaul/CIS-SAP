import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  // `npm run dev` uses --turbopack, which ignores the `webpack` key below.
  // Mirror the one alias that matters so dev and build resolve the same way;
  // the ignoreWarnings entries are webpack-only and cosmetic.
  turbopack: {
    resolveAlias: {
      '@opentelemetry/exporter-jaeger': './src/lib/empty-module.ts',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/exporter-jaeger': false,
    };

    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /@opentelemetry\/instrumentation\/build\/esm\/platform\/node\/instrumentation\.js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        module: /@opentelemetry\/sdk-node\/build\/src\/TracerProviderWithEnvExporter\.js/,
        message: /Can't resolve '@opentelemetry\/exporter-jaeger'/,
      },
    ];

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  async headers() {
    // Only advertise a permissive CORS origin when one is actually
    // configured. Falling back to localhost:9002 with credentials allowed
    // is meaningless (and misleading) once deployed, and hides a missing
    // ALLOWED_ORIGINS/NEXT_PUBLIC_APP_URL config value instead of surfacing it.
    // ALLOWED_ORIGINS is documented/used elsewhere (src/core/config/eventra-config.ts)
    // as a comma-separated list. next.config.ts's headers() is evaluated once at
    // build/boot, not per-request, so it can't echo back whichever origin a given
    // request actually came from — putting the raw CSV string into a single
    // Access-Control-Allow-Origin header would produce an invalid value browsers
    // reject outright. Falling back to the first configured origin keeps the header
    // valid; a deployment that truly needs multiple allowed origins with credentials
    // needs per-request Origin echoing in middleware instead of this static config.
    const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL;
    const allowedOrigins = rawAllowedOrigins?.split(',')[0]?.trim() || undefined;
    const isProduction = process.env.NODE_ENV === 'production';

    // Enforce by default once an app URL is known to be configured for
    // production; CSP_ENFORCE=false remains available to opt back into
    // report-only for a staging rollout. 'unsafe-inline'/'unsafe-eval' stay
    // in script-src (Next's bootstrap needs them until nonce plumbing is
    // added), but enforcing still blocks script/connect/frame sources
    // outside the explicit allowlist below.
    const cspEnforce = process.env.CSP_ENFORCE === 'false' ? false : (process.env.CSP_ENFORCE === 'true' || isProduction);

    return [
      // Next.js rejects a route entry whose `headers` array is empty, so
      // only include the CORS entry at all when an origin is configured —
      // omitting the headers, not emptying them, is how "not configured"
      // gets expressed here.
      ...(allowedOrigins
        ? [
            {
              source: '/api/:path*',
              headers: [
                { key: 'Access-Control-Allow-Credentials', value: 'true' },
                { key: 'Access-Control-Allow-Origin', value: allowedOrigins },
                { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
              ],
            },
          ]
        : []),
      {
        source: '/(.*)',
        headers: [
          {
            key: cspEnforce ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              // 'unsafe-inline'/'unsafe-eval' are what Next's dev bootstrap and
              // hydration payload require; tighten with a nonce before enforcing.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "media-src 'self' data: blob:",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://*.supabase.co https://api.dodopayments.com https://www.googleapis.com wss://*.supabase.co",
              "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              ...(cspEnforce ? ['upgrade-insecure-requests'] : []),
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
