// @ts-check

const { withSentryConfig } = require('@sentry/nextjs')

/**
 * @type {import('next').NextConfig}
 **/
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['www.bungie.net'],
  },
}

// @ts-ignore
module.exports = withSentryConfig(nextConfig, { silent: true })
