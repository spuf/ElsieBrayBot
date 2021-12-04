import { Telegraf } from 'telegraf';

const token = process.env.BOT_TOKEN
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

const bot = new Telegraf(token, {
  telegram: { webhookReply: true }
})

bot.telegram.setWebhook(process.env.BOT_HOOK_PATH ?? '/')

bot.start((ctx) => ctx.reply(`I don't even have time to explain why I don't have time to explain.`))

export default function handler(req, res) {
  try {
    await bot.handleUpdate(req.body)
  } finally {
    res.status(200).end()
  }
}
