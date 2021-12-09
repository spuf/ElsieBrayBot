import '../styles/globals.css'
import Head from 'next/head'
import NextNProgress from 'nextjs-progressbar'

function ElsieBray({ Component, pageProps }) {
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
