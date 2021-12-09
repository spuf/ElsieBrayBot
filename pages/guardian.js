import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Guardian({ message, url, token }) {
  const router = useRouter()
  const [data, setData] = useState({
    token: null,
  })
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
    }
    if (url) {
      setTimeout(() => {
        router.replace(url)
      }, 1000)
    } else {
      const token = localStorage.getItem('token')
      if (token) {
        fetch(`/api/auth/check?token=${token}`)
          .then((res) => {
            if (!res.ok) {
              throw res.status
            }
            return res.json()
          })
          .then((data) => setData({ token, ...data }))
          .catch((e) => {
            console.error(e)
            localStorage.removeItem('token')
            router.reload()
          })
      }
    }
  }, [url, router, token, setData])

  if (!data.token) {
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

  const { telegram_username, bungie_username } = data
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

export async function getServerSideProps({ query, resolvedUrl }) {
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
  }

  return { props }
}
