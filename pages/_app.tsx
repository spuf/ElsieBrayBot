import type { AppProps } from 'next/app'
import Head from 'next/head'
import NextNProgress from 'nextjs-progressbar'
import '../styles/globals.css'

function ElsieBray({ Component, pageProps }: AppProps) {
  return (
    <div className="container">
      <NextNProgress color="#0070f3" options={{ showSpinner: false }} />
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
