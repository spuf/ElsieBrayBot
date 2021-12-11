import { DateTime } from 'luxon'
import { checkAuth } from '../../../lib/telegram'
import { sign, verify } from '../../../lib/crypt'
import { saveUser, readUser, UserModel } from '../../../lib/store'
import * as Bungie from '../../../lib/bungie'
import type { NextApiRequest, NextApiResponse } from 'next'
import { withSentry } from '@sentry/nextjs'

export interface State {
  telegram_id: string
  telegram_username: string
  bungie_id?: string
  bungie_username?: string
}
export interface AuthResponse {
  message?: string
  url?: string
  token?: string
  expires_in?: number
  state?: State
  user?: UserModel
}

export default withSentry(async (req: NextApiRequest, res: NextApiResponse<AuthResponse>) => {
  if (req.query.action === 'telegram') {
    if (req.method !== 'POST') {
      return res.status(405).end()
    }
    if (Number(req.query.auth_date) < DateTime.now().minus({ minutes: 1 }).toSeconds()) {
      return res.status(401).json({ message: 'Telegram sends expired data.' })
    }
    if (!checkAuth(req.query)) {
      return res.status(401).json({ message: 'Telegram sends invalid data.' })
    }

    const state = {
      telegram_id: req.query.id,
      telegram_username: req.query.username,
    }
    const jwt = await sign(state, DateTime.now().plus({ minutes: 15 }).toSeconds())

    const url = new URL('/guardian', process.env.BASE_URL)
    url.searchParams.set('state', jwt)

    return res.status(200).json({
      message: `Welcome, @${state.telegram_username}!`,
      url: url.toString(),
    })
  }

  if (req.query.action === 'bungie') {
    if (req.method !== 'POST') {
      return res.status(405).end()
    }

    if (typeof req.query.state !== 'string') {
      return res.status(401).json({ message: 'You must start login from Telegram.' })
    }

    const payload = await verify<State>(req.query.state)
    if (!payload) {
      return res.status(401).json({ message: 'You must start login from Telegram.' })
    }
    if (!payload.telegram_id) {
      return res.status(401).json({ message: 'Telegram login seems broken.' })
    }

    if (typeof req.query.code !== 'string') {
      return res.status(200).json({
        message: 'Redirecting to Bungie.net...',
        url: Bungie.generateAuthUrl(req.query.state),
      })
    }

    let tokens = await Bungie.getAccessToken(req.query.code)
    const bungie = await Bungie.UserGetBungieNetUserById(tokens)

    const state = {
      telegram_id: payload.telegram_id,
      telegram_username: payload.telegram_username,
      bungie_id: bungie.membershipId,
      bungie_username: bungie.uniqueName,
    }
    const jwt_expires_in = 60 * 60 * 24 * 7
    const jwt = await sign(state, DateTime.now().plus({ seconds: jwt_expires_in }).toSeconds())

    await saveUser(state.telegram_id, { ...state, tokens, bungie })

    return res.status(200).json({
      message: `Hello, ${state.bungie_username}!`,
      url: new URL('/guardian', process.env.BASE_URL).toString(),
      token: jwt,
      expires_in: jwt_expires_in,
    })
  }

  if (req.query.action === 'check') {
    if (req.method !== 'POST') {
      return res.status(405).end()
    }

    if (typeof req.query.token !== 'string') {
      return res.status(401).json({ message: 'You must start login from Telegram.' })
    }

    const state = await verify<State>(req.query.token)
    if (!state) {
      return res.status(401).json({ message: 'You must start login from Telegram.' })
    }

    const user = await readUser(state.telegram_id)
    delete user.tokens
    return res.status(200).json({ state, user })
  }

  return res.status(404).end()
})
