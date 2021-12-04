import { Telegraf } from 'telegraf'

const token = process.env.BOT_TOKEN
const base = process.env.BOT_HOOK_BASE
const path = process.env.BOT_HOOK_PATH
if (!token || !base || !path) {
  throw new Error()
}

const bot = new Telegraf(token, {
  telegram: { webhookReply: true },
})

const keyboard = Markup.keyboard([Markup.button.pollRequest('Play time poll', 'regular')])

bot.start((ctx) => ctx.reply(`I don't even have time to explain why I don't have time to explain.`), keyboard)

bot.command('poll', (ctx) =>
  ctx.replyWithPoll('When you are ready to play?', ['In 1 hour', '2 hours', '3 hours', '4 hours', '5 hours'], { is_anonymous: false })
)

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
