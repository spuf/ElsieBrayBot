import * as jose from 'jose'

export async function jwtSign(payload, exp) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.round(exp))
    .sign(Buffer.from(process.env.JWT_SECRET))
}

export async function jwtVerify(token) {
  try {
    const { payload } = await jose.jwtVerify(token, Buffer.from(process.env.JWT_SECRET))
    return payload
  } catch (e) {
    return null
  }
}
