import { DateTime } from 'luxon'
import { checkAuth } from '../../../lib/telegram'
import { jwtSign, jwtVerify } from '../../../lib/jwt'
import * as Bungie from '../../../lib/bungie'

export default async function handler(req, res) {
  if (req.query.action === 'telegram') {
    if (req.method !== 'GET') {
      return res.status(405).end()
    }
    if (req.query.auth_date < DateTime.now().minus({ minutes: 1 }).toSeconds()) {
      return res.status(401).json({ message: 'Telegram sends expired data.' })
    }
    if (!checkAuth(req.query)) {
      return res.status(401).json({ message: 'Telegram sends invalid data.' })
    }

    const state = {
      telegram_id: req.query.id,
      telegram_username: req.query.username,
    }
    const jwt = await jwtSign(state, DateTime.now().plus({ minutes: 15 }).toSeconds())

    const url = new URL('/guardian', process.env.BASE_URL)
    url.searchParams.set('state', jwt)

    return res.status(200).json({
      message: `Welcome, @${state.telegram_username}!`,
      url: url.toString(),
    })
  }

  if (req.query.action === 'bungie') {
    if (req.method !== 'GET') {
      return res.status(405).end()
    }

    const state = await jwtVerify(req.query.state)
    if (!state) {
      return res.status(401).json({ message: 'You must start login from Telegram.' })
    }
    if (!state.telegram_id) {
      return res.status(401).json({ message: 'Telegram login seems broken.' })
    }

    if (!req.query.code) {
      return res.status(200).json({
        message: 'Redirecting to Bungie.net...',
        url: Bungie.generateAuthUrl(req.query.state),
      })
    }

    const tokens = await Bungie.getAccessToken(req.query.code)
    tokens.expires_in = tokens.expires_in || 3600

    state.bungie_id = tokens.membership_id
    state.access_token = tokens.access_token

    const user = await Bungie.getBungieNetUserById(state.access_token, state.bungie_id)
    state.bungie_username = user.uniqueName

    const jwt = await jwtSign(state, DateTime.now().plus({ seconds: tokens.expires_in }).toSeconds())

    return res.status(200).json({
      message: `Hello, ${state.bungie_username}!`,
      url: new URL('/guardian', process.env.BASE_URL).toString(),
      token: jwt,
    })
  }

  if (req.query.action === 'check') {
    if (req.method !== 'GET') {
      return res.status(405).end()
    }

    const state = await jwtVerify(req.query.token)
    if (!state) {
      return res.status(401).json({ message: 'You must start login from Telegram.' })
    }

    return res.status(200).json(state)
  }

  return res.status(404).end()
}
