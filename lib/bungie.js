// https://github.com/Bungie-net/api/wiki/OAuth-Documentation#authorization-request
export function generateAuthUrl(state) {
  const url = new URL('https://www.bungie.net/en/oauth/authorize')
  url.searchParams.set('client_id', process.env.BUNGIE_CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)

  return url.toString()
}

// https://github.com/Bungie-net/api/wiki/OAuth-Documentation#access-token-request
export async function getAccessToken(code) {
  const basicAuth = Buffer.from(`${process.env.BUNGIE_CLIENT_ID}:${process.env.BUNGIE_SECRET}`).toString('base64')
  const res = await fetch('https://www.bungie.net/platform/app/oauth/token/', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }).toString(),
  })

  return await res.json()
}

// https://github.com/Bungie-net/api/wiki/OAuth-Documentation#refreshing-the-access-token
async function refreshAccessToken(refresh_token) {
  const basicAuth = Buffer.from(`${process.env.BUNGIE_CLIENT_ID}:${process.env.BUNGIE_SECRET}`).toString('base64')
  const res = await fetch('https://www.bungie.net/platform/app/oauth/token/', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
    }).toString(),
  })

  return await res.json()
}

// https://bungie-net.github.io/multi/operation_get_User-GetBungieNetUserById.html#operation_get_User-GetBungieNetUserById
export async function getBungieNetUserById(accessToken, id) {
  const res = await fetch(`https://www.bungie.net/Platform/User/GetBungieNetUserById/${id}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-API-Key': process.env.BUNGIE_API_KEY,
    },
  })
  console.log(res)
  const { Response } = await res.json()
  return Response
}
