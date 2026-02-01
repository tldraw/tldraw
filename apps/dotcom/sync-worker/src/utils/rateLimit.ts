import { Environment } from '../types'

export async function isRateLimited(_env: Environment, _key: string): Promise<boolean> {
	// TODO: rate limiting is broken in cloudflare, disabled for now
	// const { success } = await env.RATE_LIMITER.limit({ key })
	// return !success
	return false
}
