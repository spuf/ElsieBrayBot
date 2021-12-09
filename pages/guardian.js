import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Guardian({ message, url, state }) {
  const router = useRouter()
  useEffect(() => {
    if (url) {
      setTimeout(() => {
        router.replace(url)
      }, 1000)
    }
  }, [url, router])

  if (!state) {
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

  const { telegram_username, bungie_username } = state
  return (
    <div className="center">
      <p>
        <Link href="/">
          <a>← Return to Orbit</a>
        </Link>
      </p>
      <p>
        @{telegram_username} is {bungie_username}
      </p>
    </div>
  )
}

export async function getServerSideProps({ query, resolvedUrl, req: { cookies }, res }) {
  const url = new URL(resolvedUrl, process.env.BASE_URL)
  let props = {}
  if (query.id && query.hash) {
    url.pathname = '/api/auth/telegram'
    const res = await fetch(url.toString())
    props = await res.json()
  } else if (query.state) {
    url.pathname = '/api/auth/bungie'
    const res = await fetch(url.toString())
    props = await res.json()
  } else if (cookies.token) {
    url.pathname = '/api/auth/check'
    url.searchParams.set('token', cookies.token)
    const res = await fetch(url.toString())
    if (res.ok) {
      props = await res.json()
    } else {
      res.setHeader('Set-Cookie', `token=undefined; HttpOnly; Secure; Max-Age=0`)
    }
  }
  if (props.token && props.exp) {
    res.setHeader('Set-Cookie', `token=${props.token}; HttpOnly; Secure; Max-Age=${props.exp}`)
  }

  return { props }
}
