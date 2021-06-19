import { NextApiRequest, NextApiResponse } from 'next'
import NextAuth from 'next-auth'
import { signin } from 'next-auth/client'
import Providers from 'next-auth/providers'

export default function (req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, {
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
      async session(session, token) {
        // @ts-ignore
        session.user.id = token.id
        return session
      },
      async signIn(user, account, profile) {
        // @ts-ignore
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
