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

const keyboard = Markup.keyboard([Markup.button.callback('Play', 'play')])

bot.start((ctx) => ctx.reply(`I don't even have time to explain why I don't have time to explain.`, keyboard))

bot.command('play', (ctx) => {
  const options = [][(30, 60, 90, 120)].forEach((m) => {
    const time = DateTime.now(plus({ minutes: m }))
    const option = ['Europe/Moscow', 'Europe/London']
      .map((tz) => time.setZone(tz).toLocaleString(DateTime.TIME_24_WITH_SHORT_OFFSET))
      .join(' / ')
    options.push(option)
  })
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
