import '../styles/globals.css'
import Head from 'next/head'
import NextNProgress from 'nextjs-progressbar'
import type { AppProps } from 'next/app'

function ElsieBray({ Component, pageProps }: AppProps) {
  return (
    <div className="container">
      <NextNProgress options={{ showSpinner: false }} />
      <Head>
        <title>ElsieBrayBot</title>
      </Head>
      <main>
        <Component {...pageProps} />
      </main>
    </div>
  )
}

export default ElsieBray
