import { Result } from './control'

export async function time<T>(
	fn: () => Promise<T>
): Promise<Result<[number, T], [number, unknown]>> {
	const now = Date.now()
	try {
		const r = await fn()
		return Result.ok<[number, T]>([Date.now() - now, r] as const)
	} catch (e) {
		return Result.err<[number, unknown]>([Date.now() - now, e as unknown] as const)
	}
}
