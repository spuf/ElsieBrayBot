import axios from 'axios'
import { DateTime } from 'luxon'

// https://github.com/Bungie-net/api/wiki/OAuth-Documentation#authorization-request
export function generateAuthUrl(state: string): string {
  const url = new URL('https://www.bungie.net/en/oauth/authorize')
  url.searchParams.set('client_id', process.env.BUNGIE_CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)

  return url.toString()
}

interface TokenSet {
  created_at?: number
  access_token?: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
  refresh_expires_in?: number
  membership_id?: string
}

// https://github.com/Bungie-net/api/wiki/OAuth-Documentation#access-token-request
export async function getAccessToken(code: string): Promise<TokenSet> {
  const res = await axios.post(
    'https://www.bungie.net/platform/app/oauth/token/',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }),
    {
      auth: {
        username: process.env.BUNGIE_CLIENT_ID,
        password: process.env.BUNGIE_SECRET,
      },
    }
  )
  return { ...(res.data as TokenSet), created_at: Math.floor(DateTime.now().toSeconds()) }
}

// https://github.com/Bungie-net/api/wiki/OAuth-Documentation#refreshing-the-access-token
async function refreshAccessToken(tokens: TokenSet): Promise<TokenSet> {
  if (DateTime.now().toSeconds() < tokens.created_at + tokens.expires_in) {
    return tokens
  }

  const res = await axios.post(
    'https://www.bungie.net/platform/app/oauth/token/',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
    {
      auth: {
        username: process.env.BUNGIE_CLIENT_ID,
        password: process.env.BUNGIE_SECRET,
      },
    }
  )
  return { ...(res.data as TokenSet), created_at: Math.floor(DateTime.now().toSeconds()) }
}

async function ask(tokens: TokenSet, url: string): Promise<{ tokens: TokenSet; data }> {
  tokens = await refreshAccessToken(tokens)
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'X-API-Key': process.env.BUNGIE_API_KEY,
    },
  })
  console.log(res.data)
  return { tokens, data: res.data.Response }
}

// https://bungie-net.github.io/multi/operation_get_User-GetBungieNetUserById.html#operation_get_User-GetBungieNetUserById
export async function getBungieNetUserById(tokens: TokenSet) {
  return await ask(tokens, `https://www.bungie.net/Platform/User/GetBungieNetUserById/${tokens.membership_id}/`)
}
