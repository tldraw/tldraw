import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JevScheduler } from './JevScheduler'

describe('Jev scheduling', () => {
	let scheduler: JevScheduler<string>
	let eligible: boolean
	let resolve: (choice: string) => void
	let reject: (error: Error) => void
	let signal: AbortSignal
	const apply = vi.fn()
	const onError = vi.fn()
	const request = vi.fn((requestSignal: AbortSignal) => {
		signal = requestSignal
		return new Promise<string>((res, rej) => {
			resolve = res
			reject = rej
		})
	})

	beforeEach(() => {
		vi.useFakeTimers()
		vi.clearAllMocks()
		eligible = true
		scheduler = new JevScheduler({ canRun: () => eligible, request, apply, onError })
	})
	afterEach(() => {
		scheduler.dispose()
		vi.useRealTimers()
	})

	it('coalesces movement and makes one request after the cursor stops', async () => {
		for (let i = 0; i < 10; i++) {
			scheduler.trigger()
			await vi.advanceTimersByTimeAsync(50)
		}
		expect(request).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(180)
		expect(request).toHaveBeenCalledTimes(1)
		resolve('tool:arrow')
		await vi.advanceTimersByTimeAsync(0)
		expect(apply).toHaveBeenCalledWith('tool:arrow')
		await vi.advanceTimersByTimeAsync(10_000)
		expect(request).toHaveBeenCalledTimes(1)
	})

	it('discards a result when the canvas becomes unavailable and never applies it later', async () => {
		scheduler.trigger(40)
		await vi.advanceTimersByTimeAsync(40)
		eligible = false
		resolve('style:color:red')
		await vi.advanceTimersByTimeAsync(0)
		eligible = true
		await vi.advanceTimersByTimeAsync(5_000)
		expect(apply).not.toHaveBeenCalled()
	})

	it('does not request inference when the canvas is unavailable', async () => {
		eligible = false
		scheduler.trigger()
		await vi.advanceTimersByTimeAsync(1_000)
		expect(request).not.toHaveBeenCalled()
	})

	it('discards stale results and coalesces new input into one subsequent request', async () => {
		scheduler.trigger(40)
		await vi.advanceTimersByTimeAsync(40)
		for (let i = 0; i < 5; i++) scheduler.trigger()
		await vi.advanceTimersByTimeAsync(500)
		expect(request).toHaveBeenCalledTimes(1)
		resolve('tool:arrow')
		await vi.advanceTimersByTimeAsync(1)
		expect(apply).not.toHaveBeenCalled()
		expect(request).toHaveBeenCalledTimes(2)
	})

	it('keeps the pointer-up trigger when its resulting store changes arrive', async () => {
		scheduler.trigger(40)
		scheduler.invalidate(true)
		await vi.advanceTimersByTimeAsync(40)
		expect(request).toHaveBeenCalledTimes(1)
	})

	it('rejects changes made during inference even if the editor returns to idle', async () => {
		scheduler.trigger(0)
		await vi.advanceTimersByTimeAsync(0)
		scheduler.invalidate(true)
		resolve('tool:arrow')
		await vi.advanceTimersByTimeAsync(0)
		expect(apply).not.toHaveBeenCalled()
	})

	it('expires slow results', async () => {
		scheduler.trigger(0)
		await vi.advanceTimersByTimeAsync(1_501)
		resolve('tool:arrow')
		await vi.advanceTimersByTimeAsync(0)
		expect(apply).not.toHaveBeenCalled()
	})

	it('backs off after service failures without an autonomous retry loop', async () => {
		scheduler.trigger(0)
		await vi.advanceTimersByTimeAsync(0)
		reject(new Error('offline'))
		await vi.advanceTimersByTimeAsync(0)
		expect(onError).toHaveBeenCalledOnce()
		scheduler.trigger(0)
		await vi.advanceTimersByTimeAsync(9_999)
		expect(request).toHaveBeenCalledTimes(1)
		await vi.advanceTimersByTimeAsync(1)
		expect(request).toHaveBeenCalledTimes(2)
	})

	it('aborts and ignores in-flight work on disposal', async () => {
		scheduler.trigger(0)
		await vi.advanceTimersByTimeAsync(0)
		scheduler.dispose()
		expect(signal.aborted).toBe(true)
		resolve('tool:arrow')
		await vi.advanceTimersByTimeAsync(0)
		expect(apply).not.toHaveBeenCalled()
	})
})
