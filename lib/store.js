import * as admin from 'firebase-admin'
import { encrypt, decrypt, hash } from './crypt'

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)),
  databaseURL: 'https://elsie-bray-bot-default-rtdb.firebaseio.com',
})

export async function saveUser(id, data) {
  const key = await hash(id)
  const value = await encrypt(data)
  return new Promise((resolve, reject) => {
    admin
      .database()
      .ref(`users/${key}`)
      .set(value, (e) => {
        if (e) {
          reject(e)
        } else {
          resolve()
        }
      })
  })
}
