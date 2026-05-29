import { beforeEach, describe, expect, it } from 'vitest'
import {
	buildTab,
	createMockBrowserContext,
	createMockChannelFactory,
	createMockLockManager,
	FakeSocket,
	flushMicrotasks,
} from './mocks'
import { CrossTabLockManager } from './types'

describe('createPresenter: presenter election', () => {
	let channels: ReturnType<typeof createMockChannelFactory>
	let locks: CrossTabLockManager
	let sockets: FakeSocket[]

	beforeEach(() => {
		channels = createMockChannelFactory()
		locks = createMockLockManager()
		sockets = []
	})

	it('the tab focused at construction is the initial presenter', async () => {
		const aEnv = createMockBrowserContext({ focused: true, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserContext: aEnv.ctx,
		})
		await flushMicrotasks()

		expect(a.$isPresenter.get()).toBe(true)
		a.close()
	})

	it('a tab without focus at construction is not the presenter', async () => {
		const aEnv = createMockBrowserContext({ focused: false, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserContext: aEnv.ctx,
		})
		await flushMicrotasks()

		expect(a.$isPresenter.get()).toBe(false)
		a.close()
	})

	it('a focus event makes that tab the presenter and demotes the previous one', async () => {
		const aEnv = createMockBrowserContext({ focused: true, visible: true })
		const bEnv = createMockBrowserContext({ focused: false, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserContext: aEnv.ctx,
		})
		await flushMicrotasks()
		const b = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
			browserContext: bEnv.ctx,
		})
		await flushMicrotasks()

		// A focused at construction; B did not.
		expect(a.$isPresenter.get()).toBe(true)
		expect(b.$isPresenter.get()).toBe(false)

		// Now focus B.
		bEnv.focus()

		expect(a.$isPresenter.get()).toBe(false)
		expect(b.$isPresenter.get()).toBe(true)

		a.close()
		b.close()
	})

	it('the last-focused tab wins ties between simultaneous claims', async () => {
		const aEnv = createMockBrowserContext({ focused: false, visible: true })
		const bEnv = createMockBrowserContext({ focused: false, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserContext: aEnv.ctx,
		})
		await flushMicrotasks()
		const b = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'B',
			sockets,
			browserContext: bEnv.ctx,
		})
		await flushMicrotasks()

		// Both start unfocused — neither is presenter.
		expect(a.$isPresenter.get()).toBe(false)
		expect(b.$isPresenter.get()).toBe(false)

		// A focuses first.
		aEnv.focus()
		expect(a.$isPresenter.get()).toBe(true)
		expect(b.$isPresenter.get()).toBe(false)

		// Then B focuses — takes over.
		bEnv.focus()
		expect(a.$isPresenter.get()).toBe(false)
		expect(b.$isPresenter.get()).toBe(true)

		// Then A focuses again — takes back.
		aEnv.focus()
		expect(a.$isPresenter.get()).toBe(true)
		expect(b.$isPresenter.get()).toBe(false)

		a.close()
		b.close()
	})

	it('blur alone does not demote the presenter — it stays until another tab claims', async () => {
		const aEnv = createMockBrowserContext({ focused: true, visible: true })
		const a = buildTab({
			channels,
			locks,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
			browserContext: aEnv.ctx,
		})
		await flushMicrotasks()

		expect(a.$isPresenter.get()).toBe(true)

		// Lose focus to something outside our pool (the OS taskbar, another app).
		aEnv.blur()

		// Still presenter — nothing has claimed.
		expect(a.$isPresenter.get()).toBe(true)

		a.close()
	})

	it('fallback-mode tabs are always presenters', async () => {
		const a = buildTab({
			channels,
			locks: null as any,
			channelKey: 'room1',
			tabId: 'A',
			sockets,
		})
		await flushMicrotasks()

		expect(a.$isPresenter.get()).toBe(true)
		a.close()
	})
})

