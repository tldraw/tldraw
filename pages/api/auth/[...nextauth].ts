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
  // SQL or MongoDB database (or leave empty)
  // database: process.env.DATABASE_URL,
  callbacks: {
    async redirect(url, baseUrl) {
      return url.startsWith(baseUrl) ? url : baseUrl
    },
  },
})
