/**
 * Send a GraphQL query to the Github API
 */
async function queryGithubApi(query: string) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'bearer ' + process.env.GITHUB_API_SECRET,
    },
    body: JSON.stringify({
      query,
    }),
  })
  return await res.json()
}

/**
 * What is the signed in user's login name?
 */
async function getSignedInUser(): Promise<{ login: 'steveruizok ' }> {
  const res = await queryGithubApi(`
    query { 
      viewer { 
        login 
      } 
    }`)
  return res?.data?.viewer
}

/**
 * Is user with the login A sponsoring the user with the login B?
 */
async function isASponsoringB(loginA: string, loginB: string) {
  const res = await queryGithubApi(`
    query { 
      user(login: "${loginB}") { 
        isSponsoredBy(accountLogin: "${loginA}") 
      } 
    }`)
  return res?.data?.user?.isSponsoredBy
}

const whitelist = ['steveruizok']

/**
 * Is the current user sponsoring me?
 */
export async function isSignedInUserSponsoringMe() {
  const user = await getSignedInUser()
  if (whitelist.includes(user.login)) return true
  return isASponsoringB('steveruizok', user.login)
}
