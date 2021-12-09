import * as admin from 'firebase-admin'
import { encrypt, decrypt, hash } from './crypt'

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)),
  databaseURL: 'https://elsie-bray-bot-default-rtdb.firebaseio.com',
})

export async function saveUser(id, data) {
  admin
    .database()
    .ref(`users/${await hash(id)}`)
    .set(await encrypt(data))
}
