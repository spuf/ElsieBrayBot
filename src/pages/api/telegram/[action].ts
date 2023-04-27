import { captureException } from '@sentry/nextjs'
import { AxiosError } from 'axios'
import { DateTime } from 'luxon'
import type { NextApiRequest, NextApiResponse } from 'next'
import { Context, Markup, Telegraf, Types } from 'telegraf'
import * as Bungie from '../../../lib/bungie'
import { readUser, saveDestinyManifest, saveUser, UserModel } from '../../../lib/store'

const BASE_URL = process.env.BASE_URL as string
const BOT_TOKEN = process.env.BOT_TOKEN as string
const BOT_BASE_URL = process.env.BOT_BASE_URL as string
const BOT_HOOK_ACTION = process.env.BOT_HOOK_ACTION as string
const BOT_CRON_ACTION = process.env.BOT_CRON_ACTION as string
const BOT_TWEET_ACTION = process.env.BOT_TWEET_ACTION as string
const BOT_TWEET_CHAT_ID = process.env.BOT_TWEET_CHAT_ID as string

interface CustomContext extends Context {
  user: UserModel | null
}

const bot = new Telegraf<CustomContext>(BOT_TOKEN, {
  telegram: { webhookReply: true },
})

bot.use(Telegraf.log())
bot.use(async (ctx, next) => {
  try {
    await next()
  } catch (e) {
    captureException(e)
    await ctx.reply('Error!')
  }
})
bot.use(async (ctx, next) => {
  const id = ctx.from?.id?.toString()
  if (!id) {
    await next()
    return
  }
  ctx.user = await readUser(id)
  if (!ctx.user || !ctx.user.tokens) {
    await next()
    return
  }
  try {
    ctx.user.tokens = await Bungie.refreshAccessToken(ctx.user.tokens)
  } catch (e) {
    if (e instanceof AxiosError) {
      console.error(e.message, e.response?.data ?? e.request)
    } else {
      console.error(e)
    }
  }
  await next()
  await saveUser(id, ctx.user)
})

bot.start((ctx) =>
  ctx.reply(`I don't even have time to explain why I don't have time to explain.`, Markup.removeKeyboard())
)

const zoneNames: { [key: string]: string } = {
  'Europe/Moscow': 'Moscow',
  'Europe/London': 'London',
  'Europe/Lisbon': 'Lisbon',
  'America/Los_Angeles': 'PDT',
}
bot.command('poll', (ctx) => {
  const now = DateTime.now()
  const time = now.plus({ minutes: 10 - (now.minute % 10) })
  const options = [30, 60, 90, 120].map((m) =>
    Object.keys(zoneNames)
      .map((tz) => `${time.plus({ minutes: m }).setZone(tz).toFormat('HH:mm')} ${zoneNames[tz]}`)
      .join(', ')
  )
  options.push('Later')
  options.push('Pass')
  return ctx.replyWithPoll('When are you ready to play?', options, {
    is_anonymous: false,
  })
})

bot.command('time', async (ctx) => {
  const options = replyOptions(ctx)

  let result: DateTime | undefined
  const args = ctx.update.message.text.split(' ')
  if (args.length > 1) {
    let reqTz: string | undefined
    const argTz = args.slice(-1)[0] || null
    if (argTz) {
      Object.keys(zoneNames).forEach((tz) => {
        if (argTz.toLowerCase() === zoneNames[tz].toLowerCase()) {
          reqTz = tz
        }
      })
    }
    if (reqTz) {
      const argTime = ctx.update.message.text.split(' ').slice(1, -1).join(' ') || null
      if (argTime) {
        const formats = ['Hmm', 'H.mm', 'H:mm', 'H', 'hmma', 'hmm a', 'h.mma', 'h.mm a', 'h:mma', 'h:mm a', 'h a', 'ha']
        formats.forEach((v) => {
          const dt = DateTime.fromFormat(argTime.toUpperCase(), v, {
            zone: reqTz,
          })
          if (dt.isValid) {
            result = dt
          }
        })
      }
    }

    if (!result) {
      return ctx.reply('I believe where our paths cross, ground... could break.', options)
    }
  }

  const now = result || DateTime.now()
  return ctx.reply(
    Object.keys(zoneNames)
      .map((tz) => `${now.setZone(tz).toFormat('HH:mm')} <i>${zoneNames[tz]}</i> UTC${now.setZone(tz).toFormat('Z')}`)
      .join('\n'),
    options
  )
})

const loginButton = Markup.button.login('Let me in', new URL('/guardian', BASE_URL).toString())
bot.command('login', (ctx) =>
  ctx.reply('Many Guardians fell. Strong ones. But you made it here.', Markup.inlineKeyboard([loginButton]))
)
const replyOptions = (ctx: CustomContext) => {
  const options: Types.ExtraReplyMessage = {}
  options.parse_mode = 'HTML'
  if (ctx.message && ctx.message.chat.type !== 'private') {
    options.reply_to_message_id = ctx.message.message_id
  }
  return options
}
const replyWithLogin = (ctx: CustomContext, options: Types.ExtraReplyMessage) => {
  options.reply_markup = Markup.inlineKeyboard([loginButton]).reply_markup
  return ctx.reply("I wasn't talking to you, little light.", options)
}

bot.command('whoami', async (ctx) => {
  const options = replyOptions(ctx)
  if (ctx.user?.tokens && ctx.user?.bungie && ctx.user?.character) {
    ctx.user.bungie = await Bungie.UserGetBungieNetUserById(ctx.user.tokens)

    const { characters } = await Bungie.Destiny2GetProfileCharacters(ctx.user.tokens, ctx.user.character)
    ctx.user.character = characters.data[ctx.user.character.characterId]

    await ctx.reply(`${ctx.user.bungie.uniqueName} with <i>${ctx.user.character.light}</i> light`, options)
  } else {
    await replyWithLogin(ctx, options)
  }
})

const handler = async (req: NextApiRequest, res: NextApiResponse<void>) => {
  if (req.query.action === BOT_CRON_ACTION) {
    if (req.method !== 'POST') {
      res.status(405).end()
      return
    }

    try {
      await Promise.all([
        bot.telegram.setWebhook(BOT_BASE_URL + BOT_HOOK_ACTION, {
          max_connections: 1,
        }),
        bot.telegram.setMyCommands([
          { command: 'start', description: 'System wipe' },
          { command: 'time', description: 'Could you please tell me the time?' },
          { command: 'poll', description: 'When are you ready to play?' },
          { command: 'login', description: 'Let me in' },
          { command: 'whoami', description: 'Who am I?' },
        ]),
        Bungie.getDestinyManifest().then((v) => saveDestinyManifest(v)),
      ])
    } catch (e) {
      captureException(e)
      throw e
    }
    res.status(200).end()
    return
  }

  if (req.query.action === BOT_HOOK_ACTION) {
    if (req.method !== 'POST') {
      res.status(405).end()
      return
    }

    await bot.handleUpdate(req.body)
    res.status(200).end()
    return
  }

  if (req.query.action === BOT_TWEET_ACTION) {
    if (req.method !== 'POST') {
      res.status(405).end()
      return
    }
    let text: string = req.body.text
    if (req.body.link && text && !text.includes('https://')) {
      text = `${text}\n${req.body.link}`
    }
    await bot.telegram.sendMessage(BOT_TWEET_CHAT_ID, text, {
      disable_notification: true,
      disable_web_page_preview: true,
    })
    res.status(200).end()
    return
  }

  res.status(404).end()
}

export default handler
