import * as jose from 'jose'

let crypt_key
if (process.env.CRYPT_KEY) {
  crypt_key = await jose.importJWK(JSON.parse(_CRYPT_KEY))
} else {
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
    .sign(crypt_key)
}

export async function verify(token) {
  try {
    const { payload } = await jose.jwtVerify(token, crypt_key)
    return payload
  } catch (e) {
    console.error(e)
    return null
  }
}

export async function encrypt(data) {
  return await new jose.CompactEncrypt(new TextEncoder().encode(JSON.stringify(data)))
    .setProtectedHeader(encrypt_header)
    .encrypt(crypt_key)
}

export async function decrypt(value) {
  const { plaintext, protectedHeader } = await jose.compactDecrypt(value, crypt_key)
  return JSON.parse(new TextDecoder().decode(plaintext))
}
