export const AWS_REGION = 'eu-west-2'

export const isDevelopmentMode = process.env.NODE_ENV === 'development'

export const AuthConfig = {
  identityPoolId: isDevelopmentMode
    ? 'eu-west-2:d9ccaf9b-c345-45ef-9e9b-8b40546f106c'
    : process.env.REACT_APP_IDENTITY_POOL_ID,
  region: AWS_REGION,
  userPoolId: isDevelopmentMode ? 'eu-west-2_1jQSu6eVa' : process.env.REACT_APP_USER_POOL_ID,
  userPoolWebClientId: isDevelopmentMode
    ? '6tji4ed4oje0d3ebeiellp6fko'
    : process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
}

export const S3Config = {
  bucket: isDevelopmentMode
    ? 'klenuib945d3f8d54645a685bc3320108cc5d4205157-staging'
    : process.env.REACT_APP_STAGES_S3_BUCKET,
  region: AWS_REGION,
}
