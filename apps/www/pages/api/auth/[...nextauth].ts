import { isSignedInUserSponsoringMe } from 'utils/github'
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

export default function Auth(
  req: NextApiRequest,
  res: NextApiResponse
): ReturnType<NextApiHandler> {
  return NextAuth(req, res, {
    theme: {
      colorScheme: 'light',
    },
    providers: [
      GithubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        scope: 'read:user',
      }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      async redirect({ baseUrl }) {
        return baseUrl
      },
      async signIn() {
        return true
      },
      async session({ session, token, user }) {
        if (token) {
          session.isSponsor = await isSignedInUserSponsoringMe()
        }
        return session
      },
    },
  })
}
