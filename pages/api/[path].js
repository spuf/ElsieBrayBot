import { Telegraf, Markup } from 'telegraf'
import { DateTime } from 'luxon'

const token = process.env.BOT_TOKEN
const base = process.env.BOT_HOOK_BASE
const path = process.env.BOT_HOOK_PATH
if (!token || !base || !path) {
  throw new Error()
}

const bot = new Telegraf(token, {
  telegram: { webhookReply: true },
})
bot.use(Telegraf.log())

const keyboard = Markup.keyboard([Markup.button.callback('Play poll', 'poll')])

bot.start((ctx) => ctx.reply(`I don't even have time to explain why I don't have time to explain.`, keyboard))

bot.command('poll', (ctx) => {
  const options = [30, 60, 90, 120].map((m) =>
    ['Europe/Moscow', 'Europe/London']
      .map((tz) => DateTime.now().plus({ minutes: m }).setZone(tz).toLocaleString(DateTime.TIME_24_WITH_SHORT_OFFSET))
      .join(' / ')
  )
  options.push('Pass')
  return ctx.replyWithPoll('When are you ready to play?', options, {
    is_anonymous: false,
  })
})

bot.telegram.setMyCommands()
export default function handler(req, res) {
  if (path === 'init') {
    if (req.method !== 'GET') {
      return res.status(405).end()
    }

    return bot.telegram.setWebhook(base + path).then(() => res.status(200).end())
  }

  if (req.query.path === path) {
    if (req.method !== 'POST') {
      return res.status(405).end()
    }
    return bot.handleUpdate(req.body).finally(() => res.status(200).end())
  }

  return res.status(404).end()
}
