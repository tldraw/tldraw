import { performance as perfHooks } from 'node:perf_hooks'
import { afterEach, describe, expect, it } from 'vitest'
import { sgrMouse, sleep, startTestApp, waitFrames, type TestApp } from './appHarness'

// Thresholds are loose for CI; the medians land far below them on a quiet machine.
const FIRST_WRITE_MS = 15
const SMALL_FRAME_BYTES = 512

let t: TestApp | null = null

afterEach(() => {
	t?.dispose()
	t = null
})

function msSince(start: bigint, end: bigint): number {
	return Number(end - start) / 1e6
}

async function quiet(app: TestApp, ms: number) {
	await sleep(ms)
	app.fake.clearWrites()
}

describe('input latency', () => {
	it('turns one mouse move after idle into exactly one small write within a few milliseconds', async () => {
		t = await startTestApp()
		await quiet(t, 100)
		expect(t.frame.isParked()).toBe(true)
		const fedAt = process.hrtime.bigint()
		// A move changes the status bar coordinates, so the frame has something to write.
		t.fake.feed(sgrMouse('move', 20, 10))
		await waitFrames(t, 1, 200)
		await sleep(5)
		const writes = t.fake.getWrites()
		expect(writes).toHaveLength(1)
		expect(msSince(fedAt, writes[0].time)).toBeLessThan(FIRST_WRITE_MS)
		expect(writes[0].data.length).toBeLessThan(SMALL_FRAME_BYTES)
	})

	it('coalesces thirty moves in one chunk into one write', async () => {
		t = await startTestApp()
		await quiet(t, 100)
		let chunk = ''
		for (let i = 0; i < 30; i++) chunk += sgrMouse('move', 10 + i, 10 + (i % 5))
		t.fake.feed(chunk)
		await waitFrames(t, 1, 200)
		await sleep(5)
		expect(t.fake.getWrites()).toHaveLength(1)
	})

	it('runs at the frame cap, not per event, under a stream of moves', async () => {
		t = await startTestApp({ maxFps: 60 })
		await quiet(t, 100)
		const framesBefore = t.frame.getStats().frames
		const start = performance.now()
		let i = 0
		while (performance.now() - start < 200) {
			t.fake.feed(sgrMouse('move', 10 + (i % 40), 5 + (i % 10)))
			i++
			await sleep(4)
		}
		const frames = t.frame.getStats().frames - framesBefore
		const expected = 200 / (1000 / 60)
		expect(frames).toBeGreaterThanOrEqual(Math.floor(expected) - 3)
		expect(frames).toBeLessThanOrEqual(Math.ceil(expected) + 3)
		expect(i).toBeGreaterThan(frames)
	})

	it('parks completely when idle: no frames, no writes, an idle event loop', async () => {
		t = await startTestApp()
		t.fake.feed(sgrMouse('move', 20, 10))
		await sleep(500)
		expect(t.frame.isParked()).toBe(true)
		t.fake.clearWrites()
		const framesBefore = t.frame.getStats().frames
		// Event loop utilization is per thread; process.cpuUsage would also count the other vitest
		// workers running in this process.
		const eluBefore = perfHooks.eventLoopUtilization()
		const cpuBefore = process.cpuUsage()
		await sleep(500)
		const elu = perfHooks.eventLoopUtilization(eluBefore)
		const cpu = process.cpuUsage(cpuBefore)
		expect(t.frame.getStats().frames - framesBefore).toBe(0)
		expect(t.fake.getWrites()).toHaveLength(0)
		expect(elu.utilization).toBeLessThan(0.1)
		expect((cpu.user + cpu.system) / 1000).toBeLessThan(1000)
	})

	it('pans on a wheel event within one frame', async () => {
		t = await startTestApp()
		await quiet(t, 100)
		const { editor } = t.app.getContext()
		const before = editor.getCamera().y
		t.fake.feed(sgrMouse('wheelDown', 20, 10))
		await waitFrames(t, 1, 200)
		expect(editor.getCamera().y).not.toBe(before)
		await sleep(5)
		expect(t.fake.getWrites().length).toBeGreaterThanOrEqual(1)
	})
})
