import { Telegraf, Markup, Context, Types } from 'telegraf'
import { DateTime } from 'luxon'
import { readUser, saveUser, saveDestinyManifest, getDestinyManifest, UserModel } from '../../../lib/store'
import type { NextApiRequest, NextApiResponse } from 'next'
import * as Bungie from '../../../lib/bungie'
import { withSentry, captureException } from '@sentry/nextjs'

interface CustomContext extends Context {
  user?: UserModel
}

const bot = new Telegraf<CustomContext>(process.env.BOT_TOKEN, {
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
bot.use(async (ctx, next) => {
  const id = ctx.from?.id?.toString()
  ctx.user = id ? await readUser(id) : null
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

const loginButton = Markup.button.login('Let me in', new URL('/guardian', process.env.BASE_URL).toString())
bot.command('login', (ctx) =>
  ctx.reply('Many Guardians fell. Strong ones. But you made it here.', Markup.inlineKeyboard([loginButton]))
)
const replyOptions = (ctx: CustomContext) => {
  const options: Types.ExtraReplyMessage = {}
  if (ctx.message.chat.type !== 'private') {
    options.reply_to_message_id = ctx.message.message_id
  }
  return options
}
const replyWithLogin = (ctx: CustomContext, options: Types.ExtraReplyMessage) => {
  options.reply_markup = Markup.inlineKeyboard([loginButton]).reply_markup
  return ctx.reply("I wasn't talking to you, little light.", options)
}

bot.command('whoami', async (ctx) => {
  const options = replyOptions(ctx)
  if (ctx.user) {
    ctx.user.bungie = await Bungie.UserGetBungieNetUserById(ctx.user.tokens)
    ctx.user.bungie_username = ctx.user.bungie.uniqueName

    const { profiles } = await Bungie.Destiny2GetLinkedProfiles(ctx.user.tokens)
    ctx.user.profile = profiles[0]

    const { characters } = await Bungie.Destiny2GetProfileCharacters(ctx.user.tokens, ctx.user.profile)
    ctx.user.character = characters.data[Object.keys(characters.data)[0]]

    await ctx.reply(`${ctx.user.bungie_username} with ${ctx.user.character.light} light`, options)
  } else {
    await replyWithLogin(ctx, options)
  }
})

bot.command('weekly', async (ctx) => {
  const options = replyOptions(ctx)
  if (ctx.user) {
    const manifest = await getDestinyManifest()
    const data = await Bungie.Destiny2GetCharacterActivities(ctx.user.tokens, ctx.user.profile, ctx.user.character)
    ctx.user.activities = data.activities.data.availableActivities.map((v) => {
      const m = manifest.jsonWorldComponentContentPaths.en.DestinyActivityDefinition[v.activityHash].displayProperties
      v.name = m.name
      v.desciption = m.description
      return v
    })

    await ctx.reply(
      ctx.user.activities
        .filter((v) => v.activityHash in Bungie.ActivityHash)
        .map((v) => `${v.name} — ${v.desciption}`)
        .join('\n'),
      options
    )
  } else {
    await replyWithLogin(ctx, options)
  }
})

export default withSentry(async (req: NextApiRequest, res: NextApiResponse<void>) => {
  if (req.query.action === process.env.BOT_CRON_ACTION) {
    if (req.method !== 'POST') {
      return res.status(405).end()
    }

    try {
      await Promise.all([
        bot.telegram.setWebhook(process.env.BOT_BASE_URL + process.env.BOT_HOOK_ACTION, {
          max_connections: 1,
        }),
        bot.telegram.setMyCommands([
          { command: 'start', description: 'System wipe' },
          { command: 'poll', description: 'When are you ready to play?' },
          { command: 'login', description: 'Let me in' },
          { command: 'whoami', description: 'Who am I?' },
          { command: 'weekly', description: 'What is going on' },
        ]),
        Bungie.getDestinyManifest().then((v) => saveDestinyManifest(v)),
      ])
    } catch (e) {
      captureException(e)
      throw e
    }
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
