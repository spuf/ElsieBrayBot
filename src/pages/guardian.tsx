import axios from 'axios'
import { Duration } from 'luxon'
import { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import nookies from 'nookies'
import { useEffect, useState } from 'react'
import { AuthResponse } from './api/auth'

function Character({ character }) {
  return (
    <>
      <Image src={character.emblemPath} alt="Emblem" width={60} height={60} />
      <br />
      {character.light}
    </>
  )
}

export default function Guardian(init: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [props, setProps] = useState(init)
  const { message, bungie_url, state, user, characters, token } = props
  const router = useRouter()
  useEffect(() => {
    if (bungie_url) {
      setTimeout(() => {
        router.push(bungie_url)
      }, 1000)
    }
    console.dir(user)
  }, [bungie_url, router, user])

  const data = {
    message: message ? <p>{message}</p> : null,
    telegram: null,
    bungie: null,
    character: null,
  }
  if (state) {
    const { telegram_username, bungie, character } = state
    if (telegram_username) {
      data.telegram = <p>Telegram: @{telegram_username}</p>

      if (bungie) {
        data.bungie = <p>Bungie.net: {bungie.uniqueName}</p>

        if (character) {
          data.character = (
            <p>
              <Character character={character} />
            </p>
          )
        } else if (characters?.length > 0) {
          data.character = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
                {characters.map((character) => {
                  return (
                    <div key={character.characterId}>
                      <a
                        href={`?character=${character.characterId}`}
                        onClick={async (e) => {
                          e.preventDefault()
                          const res = await axios.post('/api/auth', null, {
                            params: { character: character.characterId, token: token },
                            withCredentials: true,
                          })
                          setProps(res.data)
                        }}
                      >
                        <Character character={character} />
                      </a>
                    </div>
                  )
                })}
              </div>
            </>
          )
        } else {
          data.character = <p>Error Bungie characters :(</p>
        }
      } else if (bungie_url) {
        data.bungie = (
          <p>
            Bungie.net:{' '}
            <Link href={bungie_url}>
              <a>Login →</a>
            </Link>
          </p>
        )
      } else {
        data.bungie = <p>Error Bungie :(</p>
      }
    } else {
      data.telegram = <p>Error Telegram :(</p>
    }
  }

  return (
    <div className="center">
      <p>
        <Link href="/">
          <a>← Return to Orbit</a>
        </Link>
      </p>
      {data.message}
      {data.telegram}
      {data.bungie}
      {data.character}
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<AuthResponse> = async (ctx) => {
  const { query, resolvedUrl } = ctx
  const url = new URL(resolvedUrl, process.env.BASE_URL)
  url.pathname = '/api/auth'

  const cookies = nookies.get(ctx)
  if (cookies.token) {
    url.searchParams.set('token', cookies.token)
  }

  let props: AuthResponse = {}
  try {
    console.log(url.toString())
    const res = await axios.post(url.toString(), null, {
      validateStatus: (s) => s < 500,
    })
    props = res.data
  } catch (e) {
    console.error(e)
  }

  console.log(props)

  if (props.token) {
    nookies.set(ctx, 'token', props.token, {
      secure: true,
      httpOnly: true,
      maxAge: Duration.fromObject({ months: 1 }).as('seconds'),
    })
  }

  if (Object.keys(query).length > 0) {
    const url = new URL(resolvedUrl, process.env.BASE_URL)
    return { redirect: { destination: url.pathname, statusCode: 302 } }
  }

  return { props }
}
