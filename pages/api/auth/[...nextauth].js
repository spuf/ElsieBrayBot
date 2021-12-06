import NextAuth from 'next-auth'
import BungieProvider from 'next-auth/providers/bungie'

export default NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    BungieProvider({
        clientId: process.env.BUNGIE_CLIENT_ID,
        clientSecret: process.env.BUNGIE_SECRET,
        headers: {
          'X-API-Key': process.env.BUNGIE_API_KEY
        }
      }),
  ],
})
