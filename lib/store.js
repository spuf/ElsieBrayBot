import { initializeApp, cert } from 'firebase-admin/app'
import { getDatabase, ref, set } from 'firebase/database'
import { encrypt, decrypt, hash } from './crypt'

const app = initializeApp({
  credential: cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)),
  databaseURL: 'https://elsie-bray-bot-default-rtdb.firebaseio.com',
})

const database = getDatabase(app)

export async function saveUser(id, data) {
  set(ref(database, `users/${await hash(id)}`), await encrypt(data))
}
