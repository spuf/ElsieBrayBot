// @ts-check

const { withSentryConfig } = require('@sentry/nextjs')
const Sentry = require('@sentry/nextjs')

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
})

/**
 * @type {import('next').NextConfig}
 **/
const nextConfig = {
  reactStrictMode: true,
}

// @ts-ignore
module.exports = withSentryConfig(nextConfig)
