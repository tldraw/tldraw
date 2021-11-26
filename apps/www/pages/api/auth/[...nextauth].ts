import { isSponsoringMe } from 'utils/isSponsoringMe'
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import NextAuth from 'next-auth'
import Providers from 'next-auth/providers'

export default function Auth(
  req: NextApiRequest,
  res: NextApiResponse
): ReturnType<NextApiHandler> {
  return NextAuth(req, res, {
    providers: [
      Providers.GitHub({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
        scope: 'read:user',
      }),
    ],
    callbacks: {
      async redirect(url, baseUrl) {
        return baseUrl
      },
      async signIn(user, account, profile: { login?: string }) {
        if (profile?.login) {
          const canLogin = await isSponsoringMe(profile.login)

          if (canLogin) {
            return canLogin
          }
        }

        return '/'
      },
    },
  })
}
