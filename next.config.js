// @ts-check

const { withSentryConfig } = require('@sentry/nextjs')

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
        ],
      },
    ]
  },
}

// @ts-ignore
module.exports = withSentryConfig(nextConfig, { silent: true })
