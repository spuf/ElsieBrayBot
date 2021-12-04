import { Telegraf } from 'telegraf'

const token = process.env.BOT_TOKEN
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}
const path = (process.env.BOT_HOOK_PATH ?? '/') + token

const bot = new Telegraf(token, {
  telegram: { webhookReply: true },
})

bot.telegram.setWebhook(path)

bot.start((ctx) => ctx.reply(`I don't even have time to explain why I don't have time to explain.`))

export default function handler(req, res) {
  if (req.query.path !== token) {
    return res.status(404).end()
  }
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  bot.handleUpdate(req.body).finally(() => res.status(200).end())
}
