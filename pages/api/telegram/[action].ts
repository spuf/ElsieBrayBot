import { Telegraf, Markup } from 'telegraf'
import { DateTime } from 'luxon'
import { readUser, saveUser } from '../../../lib/store'
import type { NextApiRequest, NextApiResponse } from 'next'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'
import * as Bungie from '../../../lib/bungie'

const bot_token = process.env.BOT_TOKEN
const bot_base_url = process.env.BOT_BASE_URL
const bot_hook_action = process.env.BOT_HOOK_ACTION
const bot_cron_action = process.env.BOT_CRON_ACTION
if (!bot_token || !bot_base_url || !bot_hook_action || !bot_cron_action) {
  throw new Error()
}

const bot = new Telegraf(bot_token, {
  telegram: { webhookReply: true },
})
bot.use(Telegraf.log())

const keyboard = Markup.keyboard(['/poll']).resize().oneTime()

bot.start((ctx) => ctx.reply(`I don't even have time to explain why I don't have time to explain.`, keyboard))

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
  const user = await readUser(ctx.from.id)
  if (user) {
    const answer = await Bungie.getBungieNetUserById(user.tokens)
    user.tokens = answer.tokens

    user.bungie_id = answer.data.membershipId
    user.bungie_username = answer.data.uniqueName

    await saveUser(ctx.from.id, user)
  }

  const text = user?.bungie_username || 'Who knows...'
  const options: ExtraReplyMessage = {}
  if (ctx.message.chat.type !== 'private') {
    options.reply_to_message_id = ctx.message.message_id
  }
  return await ctx.reply(text, options)
})

bot.command('debug', async (ctx) => {
  if (ctx.message.chat.type !== 'private') {
    return
  }
  const user = await readUser(ctx.from.id)
  return await ctx.reply('```json\n' + JSON.stringify(user, null, 2) + '\n```', { parse_mode: 'MarkdownV2' })
})

export default function handler(req: NextApiRequest, res: NextApiResponse<void>) {
  if (req.query.action === bot_cron_action) {
    if (req.method !== 'POST') {
      return res.status(405).end()
    }

    return Promise.all([
      bot.telegram.setWebhook(bot_base_url + bot_hook_action, {
        max_connections: 1,
      }),
      bot.telegram.setMyCommands([
        { command: 'start', description: 'System wipe' },
        { command: 'poll', description: 'When are you ready to play?' },
        { command: 'login', description: 'Let me in' },
        { command: 'whoami', description: 'Who am I?' },
      ]),
    ]).then(() => res.status(200).end())
  }

  if (req.query.action === bot_hook_action) {
    if (req.method !== 'POST') {
      return res.status(405).end()
    }
    return bot.handleUpdate(req.body).finally(() => res.status(200).end())
  }

  return res.status(404).end()
}
