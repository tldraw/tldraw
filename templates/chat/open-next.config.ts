import { defineCloudflareConfig } from '@opennextjs/cloudflare'

const config = defineCloudflareConfig()
config.buildCommand = 'yarn build'

export default config
