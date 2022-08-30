import crypto from 'crypto'

const BOT_TOKEN = process.env.BOT_TOKEN as string

// https://core.telegram.org/widgets/login#receiving-authorization-data
const telegarms_args = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date']
telegarms_args.sort()

export function getData(query: Partial<{ [x: string]: string | string[] }>) {
  const sign = telegarms_args
    .filter((k) => query[k])
    .map((k) => `${k}=${String(query[k])}`)
    .join('\n')

  return {
    id: String(query.id),
    username: String(query.username),
    date: String(query.auth_date),
    sign,
    hash: String(query.hash),
  }
}

export function checkSign(sign: string, hash: string) {
  if (!sign) {
    return false
  }

  return (
    hash ===
    crypto.createHmac('sha256', crypto.createHash('sha256').update(BOT_TOKEN).digest()).update(sign).digest('hex')
  )
}
