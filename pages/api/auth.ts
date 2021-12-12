import { withSentry } from '@sentry/nextjs'
import { DateTime } from 'luxon'
import type { NextApiRequest, NextApiResponse } from 'next'
import nookies from 'nookies'
import * as Bungie from '../../lib/bungie'
import { sign, verify } from '../../lib/crypt'
import { readUser, saveUser, UserModel } from '../../lib/store'
import * as Telegram from '../../lib/telegram'

export interface State {
  telegram_id?: string
  telegram_username?: string
  bungie?: Bungie.GeneralUser
  character?: Bungie.DestinyCharacter
}
export interface AuthResponse {
  message?: string
  bungie_url?: string
  token?: string
  state?: State
  user?: UserModel
  characters?: Bungie.DestinyCharacter[]
}

const AUTH_SESSION_MINUTES = 15

export default withSentry(async (req: NextApiRequest, res: NextApiResponse<AuthResponse>) => {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  let user: UserModel
  let state: State
  if (typeof req.query.token === 'string') {
    state = await verify<State>(req.query.token)
  }
  if (!state) {
    const { id, username, date, sign, hash } = Telegram.getData(req.query)
    if (!id) {
      return res.status(401).json({ message: 'You must start login from Telegram.' })
    }
    if (date < DateTime.now().minus({ minutes: AUTH_SESSION_MINUTES }).toSeconds()) {
      return res.status(401).json({ message: 'Telegram sends expired data.' })
    }
    if (!Telegram.checkSign(sign, hash)) {
      return res.status(401).json({ message: 'Telegram sends invalid data.' })
    }
    state = {
      telegram_id: id,
      telegram_username: username,
    }
  }

  if (!state.telegram_id) {
    return res.status(401).json({
      message: 'You must try again from Telegram.',
    })
  }

  if (!state.bungie) {
    if (typeof req.query.code !== 'string') {
      const jwt = await sign(state, DateTime.now().plus({ minutes: AUTH_SESSION_MINUTES }).toSeconds())

      return res.status(200).json({
        token: jwt,
        state,
        bungie_url: Bungie.generateAuthUrl(jwt),
      })
    }
    let tokens = await Bungie.getAccessToken(req.query.code)
    const bungie = await Bungie.UserGetBungieNetUserById(tokens)
    state = {
      telegram_id: state.telegram_id,
      telegram_username: state.telegram_username,
      bungie,
    }
    user = { ...state, tokens }
    await saveUser(state.telegram_id, user)
  }

  if (!user) {
    user = await readUser(state.telegram_id)
  }
  if (!user || !user.tokens) {
    return res.status(401).json({
      message: 'You must login again.',
    })
  }

  if (!state.character) {
    const { profiles } = await Bungie.Destiny2GetLinkedProfiles(user.tokens)
    const data = await Promise.all(profiles.map((v) => Bungie.Destiny2GetProfileCharacters(user.tokens, v)))
    const characters = data.map((v) => Object.values(v.characters.data)).flat()

    let character: Bungie.DestinyCharacter = null
    if (typeof req.query.character === 'string') {
      character = characters.find((v) => v.characterId === req.query.character)
    }

    if (!character) {
      const jwt = await sign(state, DateTime.now().plus({ minutes: AUTH_SESSION_MINUTES }).toSeconds())
      return res.status(200).json({
        token: jwt,
        state,
        characters: characters,
      })
    }

    state = {
      telegram_id: state.telegram_id,
      telegram_username: state.telegram_username,
      bungie: state.bungie,
      character,
    }

    user = { ...user, ...state }
    await saveUser(state.telegram_id, user)
  }

  const jwt = await sign(state, DateTime.now().plus({ months: 1 }).toSeconds())

  delete user.tokens

  nookies.set({ res }, 'token', jwt, {
    secure: true,
    httpOnly: true,
    maxAge: 2629800,
  })
  return res.status(200).json({
    token: jwt,
    state,
    user,
  })
})
