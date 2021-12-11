import { Telegraf, Markup, Context, Types } from 'telegraf'
import { DateTime } from 'luxon'
import { readUser, saveUser, UserModel } from '../../../lib/store'
import type { NextApiRequest, NextApiResponse } from 'next'
import * as Bungie from '../../../lib/bungie'
import { withSentry } from '@sentry/nextjs'

interface ContextWithUser extends Context {
  user?: UserModel
}

const bot = new Telegraf<ContextWithUser>(process.env.BOT_TOKEN, {
  telegram: { webhookReply: true },
})

bot.use(Telegraf.log())
bot.use(async (ctx, next) => {
  const id = ctx.from.id.toString()
  ctx.user = await readUser(id)
  if (ctx.user) {
    ctx.user.tokens = await Bungie.refreshAccessToken(ctx.user.tokens)
    await next()
    await saveUser(id, ctx.user)
  } else {
    await next()
  }
})

bot.start((ctx) =>
  ctx.reply(`I don't even have time to explain why I don't have time to explain.`, Markup.removeKeyboard())
)

const zoneNames = {
  'Europe/Moscow': 'MSK',
  'Europe/London': 'LND',
}
bot.command('poll', (ctx) => {
  const now = DateTime.now()
  const time = now.plus({ minutes: 10 - (now.minute % 10) })
  const options = [30, 60, 90, 120].map((m) =>
    ['Europe/Moscow', 'Europe/London']
      .map((tz) => time.plus({ minutes: m }).setZone(tz).toFormat('HH:mm') + ' ' + zoneNames[tz])
      .join(' '.repeat(4))
  )
  options.push('Later')
  options.push('Pass')
  return ctx.replyWithPoll('When are you ready to play?', options, {
    is_anonymous: false,
  })
})

bot.command('login', (ctx) =>
  ctx.reply(
    'Many Guardians fell. Strong ones. But you made it here.',
    Markup.inlineKeyboard([Markup.button.login('Let me in', new URL('/guardian', process.env.BASE_URL).toString())])
  )
)

bot.command('whoami', async (ctx) => {
  const options: Types.ExtraReplyMessage = {}
  if (ctx.message.chat.type !== 'private') {
    options.reply_to_message_id = ctx.message.message_id
  }

  if (ctx.user) {
    ctx.user.profile = await Bungie.getBungieNetUserById(ctx.user.tokens)
    ctx.user.bungie_username = ctx.user.profile.uniqueName
    await ctx.reply(ctx.user.bungie_username, options)
  } else {
    await ctx.reply('Who knows...', options)
  }
})

bot.command('debug', async (ctx) => {
  if (ctx.message.chat.type === 'private') {
    await ctx.reply('```json\n' + JSON.stringify(ctx.user, null, 2) + '\n```', { parse_mode: 'MarkdownV2' })
  }
})

export default withSentry(async (req: NextApiRequest, res: NextApiResponse<void>) => {
  if (req.query.action === process.env.BOT_CRON_ACTION) {
    if (req.method !== 'POST') {
      return res.status(405).end()
    }

    await Promise.all([
      bot.telegram.setWebhook(process.env.BOT_BASE_URL + process.env.BOT_HOOK_ACTION, {
        max_connections: 1,
      }),
      bot.telegram.setMyCommands([
        { command: 'start', description: 'System wipe' },
        { command: 'poll', description: 'When are you ready to play?' },
        { command: 'login', description: 'Let me in' },
        { command: 'whoami', description: 'Who am I?' },
      ]),
      bot.telegram.setMyCommands([{ command: 'debug', description: 'Show my data' }], {
        scope: { type: 'all_private_chats' },
      }),
    ])

    return res.status(200).end()
  }

  if (req.query.action === process.env.BOT_HOOK_ACTION) {
    if (req.method !== 'POST') {
      return res.status(405).end()
    }

    await bot.handleUpdate(req.body)

    return res.status(200).end()
  }

  return res.status(404).end()
})
