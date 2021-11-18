import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import NextAuth from 'next-auth'
import Providers from 'next-auth/providers'
import { withSentry } from '@sentry/nextjs'

function Auth(req: NextApiRequest, res: NextApiResponse): ReturnType<NextApiHandler> {
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
        const canLogin = await isSponsoringMe(profile?.login)

        if (canLogin) {
          return canLogin
        } else {
          return '/sponsorware'
        }
      },
    },
  })
}

export default withSentry(Auth)

const whitelist = ['steveruizok']

async function isSponsoringMe(login: string) {
  if (whitelist.includes(login)) return true

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'bearer ' + process.env.GITHUB_API_SECRET,
    },
    body: JSON.stringify({
      query: `
        query { 
          user(login: "steveruizok") { 
            isSponsoredBy(accountLogin: "${login}") 
          } 
        }
      `,
    }),
  }).then((res) => res.json())

  return res?.data?.user?.isSponsoredBy
}
