import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import { InferGetServerSidePropsType } from 'next'
import nookies from 'nookies'
import { AuthResponse } from './api/auth/[action]'
import axios from 'axios'

export default function Guardian({ message, url, state }: InferGetServerSidePropsType<typeof getServerSideProps>) {
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

export const getServerSideProps: GetServerSideProps<AuthResponse> = async (ctx) => {
  const cookies = nookies.get(ctx)
  const { query, resolvedUrl } = ctx
  const url = new URL(resolvedUrl, process.env.BASE_URL)
  let props: AuthResponse = {}
  if (query.id && query.hash) {
    url.pathname = '/api/auth/telegram'
    const res = await axios.post(url.toString())
    props = res.data
  } else if (query.state) {
    url.pathname = '/api/auth/bungie'
    const res = await axios.post(url.toString())
    props = res.data
  } else if (cookies.token) {
    url.pathname = '/api/auth/check'
    url.searchParams.set('token', cookies.token)
    try {
      const res = await axios.post(url.toString())
      props = res.data
    } catch (e) {
      console.error(e)
      nookies.destroy(ctx, 'token')
    }
  }
  if (props.token && props.expires_in) {
    nookies.set(ctx, 'token', props.token, {
      secure: true,
      httpOnly: true,
      maxAge: props.expires_in,
    })
  }

  return { props }
}
