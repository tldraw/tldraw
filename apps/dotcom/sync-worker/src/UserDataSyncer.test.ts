import { vi } from 'vitest'
import { UserDataSyncer } from './UserDataSyncer'

function makeSyncer(boot: () => Promise<void>) {
	return Object.assign(Object.create(UserDataSyncer.prototype), {
		numConsecutiveReboots: 0,
		logEvent: vi.fn(),
		log: { debug: vi.fn() },
		queue: { push: (callback: () => Promise<void>) => callback() },
		boot,
		captureException: vi.fn(),
	}) as UserDataSyncer
}

describe('UserDataSyncer', () => {
	afterEach(() => {
		vi.clearAllTimers()
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	test('clears the boot timeout when boot finishes', async () => {
		vi.useFakeTimers()
		const syncer = makeSyncer(async () => {})

		await syncer.reboot({ delay: false, source: 'test' })

		expect(vi.getTimerCount()).toBe(0)
	})

	test('clears a timeout whose timer id is zero', async () => {
		const setTimeoutSpy = vi
			.spyOn(globalThis, 'setTimeout')
			.mockReturnValue(0 as unknown as ReturnType<typeof setTimeout>)
		const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
		const syncer = makeSyncer(async () => {})

		await syncer.reboot({ delay: false, source: 'test' })

		expect(setTimeoutSpy).toHaveBeenCalledOnce()
		expect(clearTimeoutSpy).toHaveBeenCalledWith(0)
	})

	test('clears the boot timeout if error reporting throws', async () => {
		vi.useFakeTimers()
		const syncer = makeSyncer(async () => {
			throw new Error('boot failed')
		})
		Object.assign(syncer, {
			captureException: () => {
				throw new Error('error reporting failed')
			},
		})

		await expect(syncer.reboot({ delay: false, source: 'test' })).rejects.toThrow(
			'error reporting failed'
		)
		expect(vi.getTimerCount()).toBe(0)
	})
})
