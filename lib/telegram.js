import crypto from 'crypto'

// https://core.telegram.org/widgets/login#receiving-authorization-data
const telegarms_args = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date']
telegarms_args.sort()

export function checkAuth(query) {
  const sign = telegarms_args
    .filter((k) => query[k])
    .map((k) => `${k}=${query[k]}`)
    .join('\n')
  if (!sign) {
    return false
  }

  const hash = crypto
    .createHmac('sha256', crypto.createHash('sha256').update(process.env.BOT_TOKEN).digest())
    .update(sign)
    .digest('hex')

  return hash === query.hash
}
