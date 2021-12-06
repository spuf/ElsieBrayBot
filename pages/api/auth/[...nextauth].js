import NextAuth from 'next-auth'
import BungieProvider from 'next-auth/providers/bungie'

export default NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error', // Error code passed in query string as ?error=
    verifyRequest: null,
    newUser: null
  },
  providers: [
    BungieProvider({
      authorization: {
        url: 'https://www.bungie.net/en/oauth/authorize',
        params: {
          reauth: null,
          scope: null,
        },
      },
      token: 'https://www.bungie.net/platform/app/oauth/token/',
      clientId: process.env.BUNGIE_CLIENT_ID,
      clientSecret: process.env.BUNGIE_SECRET,
      headers: {
        'X-API-Key': process.env.BUNGIE_API_KEY,
      },
      userinfo: {
        request: ({ tokens }) => {
          console.log(tokens)
          return { id: tokens.membership_id, name: `#${tokens.membership_id}` }
        },
      },
      profile: (data) => data,
    }),
  ],
})
