const whitelist = ['steveruizok']

export async function isSponsoringMe(login: string) {
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
