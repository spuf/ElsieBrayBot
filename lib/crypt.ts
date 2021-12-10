import * as jose from 'jose'
import crypto from 'crypto'

let crypt_key = null
export async function getCryptKey() {
  if (crypt_key) {
    return crypt_key
  }

  if (process.env.CRYPT_KEY) {
    crypt_key = await jose.importJWK(JSON.parse(process.env.CRYPT_KEY))
    return crypt_key
  }

  const key_alg = 'ES256'
  const { privateKey } = await jose.generateKeyPair(key_alg)
  crypt_key = JSON.stringify({ alg: key_alg, ...(await jose.exportJWK(privateKey)) })
  console.log(crypt_key)
  process.exit()
}

const sign_header = { alg: 'ES256' }
const encrypt_header = { alg: 'ECDH-ES', enc: 'A256GCM' }

export async function sign(payload, exp) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader(sign_header)
    .setExpirationTime(Math.round(exp))
    .sign(await getCryptKey())
}

export async function verify<T>(token: string): Promise<T> {
  try {
    const { payload } = await jose.jwtVerify(token, await getCryptKey())
    return <T>(<unknown>payload)
  } catch (e) {
    console.error(e)
    return null
  }
}

export async function encrypt(data) {
  return await new jose.CompactEncrypt(new TextEncoder().encode(JSON.stringify(data)))
    .setProtectedHeader(encrypt_header)
    .encrypt(await getCryptKey())
}

export async function decrypt(value) {
  const { plaintext } = await jose.compactDecrypt(value, await getCryptKey())
  return JSON.parse(new TextDecoder().decode(plaintext))
}

export async function hash(data) {
  return crypto.createHash('sha256').update(data).digest('base64url')
}
