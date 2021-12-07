import getConfig from 'next/config'
import { useEffect } from 'react'

const {
  publicRuntimeConfig: { baseUrl },
} = getConfig()

export default function Guardian({ message, url }) {
  useEffect(() => {
    if (url) {
      setTimeout(() => {
        window.location.replace(url)
      }, 1000)
    }
  })
  return (
    <div className="center">
      <p>
        <a href={'/'}>← Return to Orbit</a>
      </p>
      <p>{message}</p>
      {url && (
        <p>
          <a href={url}>Continue →</a>
        </p>
      )}
    </div>
  )
}

export async function getServerSideProps({ query, resolvedUrl }) {
  const url = new URL(resolvedUrl, baseUrl)
  let data

  if (query.id && query.hash) {
    const res = await fetch(`${baseUrl}/api/auth/telegram${url.search}`)
    data = await res.json()
  } else if (query.state) {
    const res = await fetch(`${baseUrl}/api/auth/bungie${url.search}`)
    data = await res.json()
  } else {
    data = { message: 'You must start login from Telegram.' }
  }

  return {
    props: data,
  }
}
