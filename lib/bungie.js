export function generateAuthUrl(state) {
  return `https://www.bungie.net/en/oauth/authorize?client_id=${process.env.BUNGIE_CLIENT_ID}&response_type=code&state=${state}`
}
