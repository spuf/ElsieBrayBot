import { captureException } from '@sentry/nextjs'
import { AxiosError } from 'axios'
import { DateTime } from 'luxon'
import type { NextApiRequest, NextApiResponse } from 'next'
import { Context, Markup, Telegraf, TelegramError, Types } from 'telegraf'
import * as Bungie from '../../../lib/bungie'
import { readUser, saveDestinyManifest, saveUser, UserModel } from '../../../lib/store'
import { levenshtein } from '../../../lib/string-compare'
import sanitizeHtml from 'sanitize-html'
import { kv } from '@vercel/kv'

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
const zoneAliases: { [key: string]: string[] } = {
  'Europe/Moscow': ['moscow', 'mow', 'msk'],
  'Europe/London': ['london', 'ldn', 'gmt', 'bst'],
  'Europe/Lisbon': ['lisbon', 'lsb', 'wet', 'west'],
  'America/Los_Angeles': ['pdt', 'pst'],
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

bot.command('config', async (ctx) => {
  const options = replyOptions(ctx)

  options.reply_markup = Markup.inlineKeyboard(
    Object.keys(zoneNames).map((tz) => Markup.button.callback(`${zoneNames[tz]}`, `set-tz ${tz}`))
  ).reply_markup
  return ctx.reply('Set timezone', options)
})

bot.action(/set-tz (.+)/, async (ctx) => {
  await kv.set(`telegram.${ctx.callbackQuery.from.id}.timezone`, ctx.match[1])
  const userTz = await kv.get(`telegram.${ctx.callbackQuery.from.id}.timezone`)
  return ctx.answerCbQuery(`Saved ${userTz}`)
})

bot.command('time', (ctx) => {
  const options = replyOptions(ctx)

  let result: DateTime | undefined
  let reqTz: string | undefined
  const args = ctx.update.message.text.split(' ')
  if (args.length > 1) {
    const argTz = args.slice(-1)[0] || null
    if (argTz) {
      let min: number | null = null
      Object.keys(zoneNames).forEach((tz) => {
        zoneAliases[tz].forEach((tzAlias) => {
          const cur = levenshtein(argTz.toLowerCase(), tzAlias.toLowerCase())
          if (min == null || min > cur) {
            min = cur
            reqTz = tz
          }
        })
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
      .map(
        (tz) =>
          `${now.setZone(tz).toFormat('HH:mm')} ${
            tz == reqTz ? `<b>${zoneNames[tz]}</b>` : `<i>${zoneNames[tz]}</i>`
          } UTC${now.setZone(tz).toFormat('Z')}`
      )
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
  options.protect_content = true
  options.parse_mode = 'HTML'
  if (ctx.message && ctx.message.chat.type !== 'private') {
    options.reply_to_message_id = ctx.message.message_id
    options.allow_sending_without_reply = true
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

    // await ctx.reply(`${ctx.user.bungie.uniqueName} with <i>${ctx.user.character.light}</i> light`, options)
    await ctx.replyWithPhoto(ctx.user.character.emblemBackgroundPath, {
      ...options,
      caption: `${ctx.user.bungie.uniqueName} with <b>${ctx.user.character.light}</b> light`,
    })
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
    let text: string = req.body.text || ''
    text = text.replace(/\<br\s*\/?\>/gim, '\n')
    text = sanitizeHtml(text, {
      allowedTags: ['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'a', 'code', 'pre'],
      allowedAttributes: {
        a: ['href'],
        code: ['class'],
      },
    })
    text = text.replace(/<a href="[^"]+">#destiny2<\/a>\s+\[[^]+\]/gim, '')

    let chatId: string | number | undefined = BOT_TWEET_CHAT_ID
    while (chatId) {
      try {
        await bot.telegram.sendMessage(chatId, text, {
          disable_notification: true,
          disable_web_page_preview: true,
          protect_content: true,
          parse_mode: 'HTML',
        })
        break
      } catch (err) {
        if (err instanceof TelegramError) {
          chatId = err.response.parameters?.migrate_to_chat_id
          continue
        }
        throw err
      }
    }
    res.status(200).end()
    return
  }

  res.status(404).end()
}

export default handler
