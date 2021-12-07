import '../styles/globals.css'
import Head from 'next/head'

function ElsieBray({ Component, pageProps }) {
  return (
    <div className="container">
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
