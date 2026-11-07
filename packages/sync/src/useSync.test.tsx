import { TLSyncClient } from '@tldraw/sync-core'
import { act, createElement } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteTLStoreWithStatus, useSync, UseSyncOptions } from './useSync'

vi.mock('@tldraw/sync-core', async () => {
	const actual = await vi.importActual<typeof import('@tldraw/sync-core')>('@tldraw/sync-core')
	// capture each client's callbacks so the test can drive the handshake outcome directly
	class MockTLSyncClient {
		static instances: MockTLSyncClient[] = []
		store: any
		socket: any
		constructor(public opts: any) {
			this.store = opts.store
			this.socket = opts.socket
			MockTLSyncClient.instances.push(this)
		}
		close = vi.fn()
	}
	return { ...actual, TLSyncClient: MockTLSyncClient }
})

const Mock = TLSyncClient as unknown as {
	instances: Array<{ opts: any; store: any; socket: any }>
}

const assets = { upload: vi.fn(), resolve: vi.fn() } as any

function makeSocket() {
	return {
		connectionStatus: 'online' as const,
		sendMessage: vi.fn(),
		onReceiveMessage: vi.fn(() => () => {}),
		onStatusChange: vi.fn(() => () => {}),
		restart: vi.fn(),
		close: vi.fn(),
	}
}

describe('useSync', () => {
	let root: Root
	let container: HTMLDivElement
	let latest: RemoteTLStoreWithStatus

	function Harness(props: { opts: UseSyncOptions }) {
		latest = useSync(props.opts)
		return null
	}
	function render(opts: UseSyncOptions) {
		act(() => root.render(createElement(Harness, { opts })))
	}

	beforeEach(() => {
		;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
		Mock.instances.length = 0
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})
	afterEach(() => {
		act(() => root.unmount())
		container.remove()
		vi.restoreAllMocks()
	})

	it("clears a previous client's error once a new room loads", () => {
		const socketA = makeSocket()
		render({ connect: () => socketA as any, roomId: 'a', assets })
		expect(latest.status).toBe('loading')

		// the first room is missing: the hook reports the error
		act(() => Mock.instances[0].opts.onSyncError('NOT_FOUND'))
		expect(latest.status).toBe('error')

		// the caller switches to another room without remounting; a fresh client is created
		const socketB = makeSocket()
		render({ connect: () => socketB as any, roomId: 'b', assets })
		expect(Mock.instances).toHaveLength(2)
		const clientB = Mock.instances[1]

		act(() => {
			clientB.opts.onAfterConnect(clientB, { isReadonly: false, objectAccess: 'write' })
			clientB.opts.onLoad(clientB)
		})

		// the healthy room must not inherit the old room's NOT_FOUND
		expect(latest).toMatchObject({
			status: 'synced-remote',
			connectionStatus: 'online',
			objectAccess: 'write',
		})
	})
})
