export function generateAuthUrl(state) {
  const url = new URL('https://www.bungie.net/en/oauth/authorize')
  url.searchParams.set('client_id', process.env.BUNGIE_CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)

  return url.toString()
}
