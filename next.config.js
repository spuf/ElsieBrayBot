// @ts-check

const { withSentryConfig } = require('@sentry/nextjs')

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * @type {import('next').NextConfig}
 **/
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    domains: ['www.bungie.net'],
  },
  headers: async function () {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy-Report-Only',
            value:
              "default-src 'none'; form-action 'none'; frame-ancestors 'none'; report-uri https://spuf.report-uri.com/r/d/csp/wizard",
          },
        ],
      },
    ]
  },
}

// @ts-ignore
module.exports = withSentryConfig(nextConfig, { dryRun: !dsn, silent: true })
