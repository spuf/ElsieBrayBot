import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Guardian({ message, url }) {
  const router = useRouter()
  useEffect(() => {
    if (url) {
      setTimeout(() => {
        router.replace(url)
      }, 1000)
    }
  })

  return (
    <div className="center">
      <p>
        <Link href="/">
          <a>← Return to Orbit</a>
        </Link>
      </p>
      <p>{message}</p>
      {url && (
        <p>
          <Link href={url} replace>
            <a>Continue →</a>
          </Link>
        </p>
      )}
    </div>
  )
}

export async function getServerSideProps({ query, resolvedUrl }) {
  const url = new URL(resolvedUrl, process.env.BASE_URL)
  let data

  if (query.id && query.hash) {
    url.pathname = '/api/auth/telegram'
    const res = await fetch(url.toString())
    data = await res.json()
  } else if (query.state) {
    url.pathname = '/api/auth/bungie'
    const res = await fetch(url.toString())
    data = await res.json()
  } else {
    data = { message: 'You must start login from Telegram.' }
  }

  return {
    props: data,
  }
}
