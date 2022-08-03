import { Amplify, withSSRContext } from 'aws-amplify'
import { AuthConfig, S3Config } from '~services/aws/config'

Amplify.configure({
  Auth: AuthConfig,
  Storage: S3Config,
  ssr: true,
})

export default async function user(req, res) {
  const { Auth } = withSSRContext({ req })

  const user = await Auth.currentAuthenticatedUser()
  res.json({ user: user.username })

  try {
  } catch (error) {
    res.statusCode = 401
    res.json({ user: null })
  }
}
