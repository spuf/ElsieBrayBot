import axios, { AxiosError } from 'axios'
import { DateTime } from 'luxon'
import { BungieMembershipType, DestinyComponentType, DestinyManifest } from 'bungie-api-ts/destiny2'

const BUNGIE_CLIENT_ID = process.env.BUNGIE_CLIENT_ID as string
const BUNGIE_SECRET = process.env.BUNGIE_SECRET as string
const BUNGIE_API_KEY = process.env.BUNGIE_API_KEY as string

/** @see BungieMembershipType.TigerPsn */
const BungieMembershipType_TigerPsn = 2

/** @see DestinyComponentType.Characters */
const DestinyComponentType_Characters = 200

enum Locale {
  en = 'en',
}

// https://github.com/Bungie-net/api/wiki/OAuth-Documentation#authorization-request
export function generateAuthUrl(state: string): string {
  const url = new URL('https://www.bungie.net/en/oauth/authorize')
  url.searchParams.set('client_id', BUNGIE_CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)

  return url.toString()
}

export interface TokenSet {
  created_at: number
  access_token?: string
  token_type?: string
  expires_in: number
  refresh_token: string
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
        username: BUNGIE_CLIENT_ID,
        password: BUNGIE_SECRET,
      },
    }
  )
  return { ...(res.data as TokenSet), created_at: Math.floor(DateTime.now().toSeconds()) }
}

// https://github.com/Bungie-net/api/wiki/OAuth-Documentation#refreshing-the-access-token
export async function refreshAccessToken(tokens: TokenSet): Promise<TokenSet> {
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
        username: BUNGIE_CLIENT_ID,
        password: BUNGIE_SECRET,
      },
    }
  )
  return { ...(res.data as TokenSet), created_at: Math.floor(DateTime.now().toSeconds()) }
}

export async function getDestinyManifest(): Promise<DestinyManifest> {
  try {
    const res = await axios.get('https://www.bungie.net/Platform/Destiny2/Manifest/', {
      headers: {
        'X-API-Key': BUNGIE_API_KEY,
      },
    })
    const data = res.data.Response
    data.jsonWorldComponentContentPaths.en.DestinyActivityDefinition = (
      await axios.get(data.jsonWorldComponentContentPaths.en.DestinyActivityDefinition, {
        baseURL: 'https://www.bungie.net',
      })
    ).data
    data.jsonWorldComponentContentPaths.en.DestinyActivityModeDefinition = (
      await axios.get(data.jsonWorldComponentContentPaths.en.DestinyActivityModeDefinition, {
        baseURL: 'https://www.bungie.net',
      })
    ).data
    data.jsonWorldComponentContentPaths.en.DestinyActivityTypeDefinition = (
      await axios.get(data.jsonWorldComponentContentPaths.en.DestinyActivityTypeDefinition, {
        baseURL: 'https://www.bungie.net',
      })
    ).data
    return data
  } catch (e) {
    if (e instanceof AxiosError) {
      console.error(e.message, e.response?.data ?? e.request)
    } else {
      console.error(e)
    }
    throw e
  }
}

async function ask<T>(tokens: TokenSet, url: string): Promise<T> {
  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'X-API-Key': BUNGIE_API_KEY,
      },
    })
    console.log(res.data)
    return res.data.Response
  } catch (e) {
    if (e instanceof AxiosError) {
      console.error(e.message, e.response?.data ?? e.request)
    } else {
      console.error(e)
    }
    throw e
  }
}

export interface GeneralUser {
  membershipId: string
  uniqueName: string
}

// https://bungie-net.github.io/multi/operation_get_User-GetBungieNetUserById.html#operation_get_User-GetBungieNetUserById
export async function UserGetBungieNetUserById(tokens: TokenSet) {
  return await ask<GeneralUser>(
    tokens,
    `https://www.bungie.net/Platform/User/GetBungieNetUserById/${tokens.membership_id}/`
  )
}

export interface DestinyProfile {
  membershipId: string
  membershipType: BungieMembershipType
}
interface DestinyLinkedProfilesResponse {
  profiles: DestinyProfile[]
}

// https://bungie-net.github.io/multi/operation_get_Destiny2-GetProfile.html#operation_get_Destiny2-GetProfile
export async function Destiny2GetLinkedProfiles(tokens: TokenSet) {
  return await ask<DestinyLinkedProfilesResponse>(
    tokens,
    `https://www.bungie.net/Platform/Destiny2/${BungieMembershipType_TigerPsn}/Profile/${tokens.membership_id}/LinkedProfiles/`
  )
}

export interface DestinyCharacter extends DestinyProfile {
  characterId: string
  membershipType: number
  membershipId: string
  light: number
  emblemPath: string
}
export interface DestinyProfileCharacters {
  characters: {
    data: { [characterId: string]: DestinyCharacter }
  }
}

// https://bungie-net.github.io/multi/operation_get_Destiny2-GetProfile.html#operation_get_Destiny2-GetProfile
export async function Destiny2GetProfileCharacters(tokens: TokenSet, profile: DestinyProfile) {
  const res = await ask<DestinyProfileCharacters>(
    tokens,
    `https://www.bungie.net/Platform/Destiny2/${profile.membershipType}/Profile/${
      profile.membershipId
    }/?${new URLSearchParams({ components: [DestinyComponentType_Characters].join(',') }).toString()}`
  )
  for (const key in res.characters.data) {
    res.characters.data[key].emblemPath = new URL(
      res.characters.data[key].emblemPath,
      'https://www.bungie.net'
    ).toString()
  }

  return res
}
