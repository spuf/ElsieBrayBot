// @ts-check

const { withSentryConfig } = require('@sentry/nextjs')

/**
 * @type {import('next').NextConfig}
 **/
const nextConfig = {
  reactStrictMode: true,
}

// @ts-ignore
module.exports = withSentryConfig(nextConfig)
