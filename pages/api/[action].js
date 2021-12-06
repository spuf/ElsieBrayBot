import { Telegraf, Markup } from 'telegraf'
import { DateTime } from 'luxon'

const bot_token = process.env.BOT_TOKEN
const bot_hook_base = process.env.BOT_HOOK_BASE
const bot_hook_action = process.env.BOT_HOOK_PATH
if (!bot_token || !bot_hook_base || !bot_hook_action) {
  throw new Error()
}

const bot = new Telegraf(bot_token, {
  telegram: { webhookReply: true },
})
bot.use(Telegraf.log())

const keyboard = Markup.keyboard(['/poll']).resize()

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
      .join('    ')
  )
  options.push('Later')
  options.push('Pass')
  return ctx.replyWithPoll('When are you ready to play?', options, {
    is_anonymous: false,
  })
})

export default function handler(req, res) {
  if (req.query.action === 'init') {
    if (req.method !== 'GET') {
      return res.status(405).end()
    }

    return bot.telegram.setWebhook(bot_hook_base + bot_hook_action).then(() => res.status(200).end())
  }

  if (req.query.action === bot_hook_action) {
    if (req.method !== 'POST') {
      return res.status(405).end()
    }
    return bot.handleUpdate(req.body).finally(() => res.status(200).end())
  }

  return res.status(404).end()
}
