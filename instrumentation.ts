import * as Sentry from '@sentry/nextjs'

export function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  if (dsn) {
    Sentry.init({
      dsn,
      tracesSampleRate: 1.0,
    })
  }
}

export const onRequestError = Sentry.captureRequestError
