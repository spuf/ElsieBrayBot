import { captureException } from '@sentry/nextjs'
import { DateTime } from 'luxon'
import type { NextApiRequest, NextApiResponse } from 'next'
import { Context, Markup, Telegraf } from 'telegraf'
import { levenshtein } from '../../../lib/string-compare'

const BOT_TOKEN = process.env.BOT_TOKEN as string
const BOT_BASE_URL = process.env.BOT_BASE_URL as string
const BOT_HOOK_ACTION = process.env.BOT_HOOK_ACTION as string
const BOT_CRON_ACTION = process.env.BOT_CRON_ACTION as string

const bot = new Telegraf<Context>(BOT_TOKEN, {
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

bot.start(async (ctx) => {
  await updateSettings()
  return ctx.reply(`I don't even have time to explain why I don't have time to explain.`, Markup.removeKeyboard())
})

const zoneNames: { [key: string]: string } = {
  'Europe/Moscow': 'Moscow',
  'Europe/London': 'London',
  'Europe/Lisbon': 'Lisbon',
  'Europe/Berlin': 'Berlin',
  'America/Los_Angeles': 'PDT',
}
const zoneAliases: { [key: string]: string[] } = {
  'Europe/Moscow': ['moscow', 'mow', 'msk'],
  'Europe/London': ['london', 'ldn', 'gmt', 'bst'],
  'Europe/Lisbon': ['lisbon', 'lsb', 'wet', 'west'],
  'Europe/Berlin': ['berlin', 'ber', 'cet', 'cest'],
  'America/Los_Angeles': ['pdt', 'pst'],
}

bot.command('time', (ctx) => {
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
      return ctx.reply('I believe where our paths cross, ground... could break.')
    }
  }

  const now = result || DateTime.now()
  return ctx.reply(
    Object.keys(zoneNames)
      .map(
        (tz) =>
          `${now.setZone(tz).toFormat('HH:mm')} ${
            tz == reqTz ? `<b>${zoneNames[tz]}</b>` : `<i>${zoneNames[tz]}</i>`
          } UTC${now.setZone(tz).toFormat('Z')}`,
      )
      .join('\n'),
    { parse_mode: 'HTML' },
  )
})

async function updateSettings() {
  try {
    await Promise.all([
      bot.telegram.setWebhook(BOT_BASE_URL + BOT_HOOK_ACTION, {
        max_connections: 1,
      }),
      bot.telegram.setMyCommands([
        { command: 'start', description: 'System wipe' },
        { command: 'time', description: 'Could you please tell me the time?' },
      ]),
    ])
  } catch (e) {
    captureException(e)
    throw e
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse<void>) => {
  if (req.query.action === BOT_CRON_ACTION) {
    if (req.method !== 'POST') {
      res.status(405).end()
      return
    }

    await updateSettings()
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

  res.status(404).end()
}

export default handler
