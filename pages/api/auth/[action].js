import { DateTime } from 'luxon'
import { checkAuth } from '../../../lib/telegram'
import { jwtSign, jwtVerify } from '../../../lib/jwt'
import { generateAuthUrl } from '../../../lib/bungie'

export default async function handler(req, res) {
  if (req.query.action === 'telegram') {
    if (req.method !== 'GET') {
      return res.status(405).end()
    }
    if (req.query.auth_date < DateTime.now().minus({ minutes: 1 }).toSeconds()) {
      return res.status(401).json({ error: { code: 401, message: 'Expired request' } })
    }
    if (!checkAuth(req.query)) {
      return res.status(401).json({ error: { code: 401, message: 'Fake signature' } })
    }

    const state = { telegram_id: req.query.id }
    const jwt = await jwtSign(state, DateTime.now().plus({ minutes: 15 }).toSeconds())

    return res.redirect(`/api/auth/bungie?state=${jwt}`)
  }

  if (req.query.action === 'bungie') {
    if (req.method !== 'GET') {
      return res.status(405).end()
    }

    const state = await jwtVerify(req.query.state)
    if (!state) {
      return res.status(401).json({ error: { code: 401, message: 'Fake state' } })
    }
    if (!state.telegram_id) {
      return res.status(401).json({ error: { code: 401, message: 'Invalid state' } })
    }

    if (!req.query.code) {
      return res.redirect(generateAuthUrl(req.query.state))
    }

    return res.status(200).send('Work in progress')
  }

  return res.status(404).end()
}

//       token: 'https://www.bungie.net/platform/app/oauth/token/',
//       clientId: process.env.BUNGIE_CLIENT_ID,
//       clientSecret: process.env.BUNGIE_SECRET,
//       headers: {
//         'X-API-Key': process.env.BUNGIE_API_KEY,
//       },
//       userinfo: {
//         request: ({ tokens }) => {
//           console.log(tokens)
//           return { id: tokens.membership_id, name: `#${tokens.membership_id}` }
//         },
//       },
