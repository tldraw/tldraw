import { Amplify, withSSRContext } from 'aws-amplify'
import { AuthConfig, S3Config } from '~services/aws/config'

Amplify.configure({
  Auth: AuthConfig,
  Storage: S3Config,
  ssr: true,
})

export default async function universe(req, res) {
  const { Auth } = withSSRContext({ req })

  try {
    const user = await Auth.currentAuthenticatedUser()

    const { jwtToken } = user.signInUserSession.idToken

    const result = await fetch(
      'https://pkijscs0ca.execute-api.eu-west-2.amazonaws.com/universe/v1/home?created_by_you=true',
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      }
    )

    const universeData = await result.json()

    res.status = 200
    return await res.json({ response: universeData })
  } catch (error) {
    res.statusCode = 401
    res.status(error.requestResult.statusCode).send(error.message)
  }
}
