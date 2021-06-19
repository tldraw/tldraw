import { NextApiRequest, NextApiResponse } from 'next'
import NextAuth from 'next-auth'
import Providers from 'next-auth/providers'

const options = {
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      profile(profile) {
        return {
          id: profile.id,
          login: profile.login,
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
        } as any
      },
    }),
  ],
  callbacks: {
    async redirect(url: string, baseUrl: string) {
      return url.startsWith(baseUrl) ? url : baseUrl
    },
  },
}

export default function (req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, options)
}
