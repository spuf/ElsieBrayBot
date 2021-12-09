import { Telegraf, Markup } from 'telegraf'
import { DateTime } from 'luxon'

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
      .join(' '.repeat(4)),
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
    Markup.inlineKeyboard([Markup.button.login('Let me in', new URL('/guardian', process.env.BASE_URL).toString())]),
  ),
)

export default function handler(req, res) {
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
