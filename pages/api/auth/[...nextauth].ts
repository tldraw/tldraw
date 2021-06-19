import NextAuth from 'next-auth'
import Providers from 'next-auth/providers'
import { redirect } from 'next/dist/next-server/server/api-utils'

export default NextAuth({
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async redirect(url, baseUrl) {
      return url.startsWith(baseUrl) ? url : baseUrl
    },
  },
})
