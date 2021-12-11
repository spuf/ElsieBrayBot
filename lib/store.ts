import * as admin from 'firebase-admin'
import { State } from '../pages/api/auth/[action]'
import * as Bungie from './bungie'
import { encrypt, decrypt, hash } from './crypt'

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)),
  databaseURL: 'https://elsie-bray-bot-default-rtdb.firebaseio.com',
})

async function save(key: string, value: any) {
  return new Promise<void>((resolve, reject) => {
    admin
      .database()
      .ref(key)
      .set(value, (e) => {
        if (e) {
          reject(e)
        } else {
          resolve()
        }
      })
  })
}

export interface UserModel extends State {
  tokens?: Bungie.TokenSet
  bungie?: Bungie.GeneralUser
  profile?: Bungie.DestinyProfile
  character?: Bungie.DestinyCharacter
  data?: Bungie.DestinyCharacterActivities
}

export async function saveUser(id: string, data: UserModel) {
  const key = await hash(id)
  const value = await encrypt(data)
  return await save(`users/${key}`, value)
}

export async function readUser(id: string): Promise<UserModel> {
  const key = await hash(id)
  const snapshot = await admin.database().ref(`users/${key}`).get()
  const value = snapshot.val()
  if (!value) {
    return value
  }
  return await decrypt(value)
}

export async function saveDestinyManifest(manifest: Bungie.DestinyManifest) {
  return await save(`destiny`, manifest)
}
