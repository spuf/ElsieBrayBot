import '../styles/globals.css'
import { SessionProvider } from 'next-auth/react'

function ElsieBray({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  )
}

export default ElsieBray
