import { Environment } from '../types'

export async function isRateLimited(env: Environment, key: string): Promise<boolean> {
	const { success } = await env.RATE_LIMITER.limit({ key })
	return !success
}
