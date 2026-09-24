import { defineCloudflareConfig } from '@opennextjs/cloudflare'

const config = defineCloudflareConfig()
config.buildCommand = 'pnpm build'

export default config
