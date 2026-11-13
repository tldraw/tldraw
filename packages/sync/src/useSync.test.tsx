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
			clientB.opts.onAfterConnect(clientB, {
				access: { document: 'write', objects: 'write' },
				isReadonly: false,
				objectAccess: 'write',
			})
			clientB.opts.onLoad(clientB)
		})

		// the healthy room must not inherit the old room's NOT_FOUND
		expect(latest).toMatchObject({
			status: 'synced-remote',
			connectionStatus: 'online',
			access: { document: 'write', objects: 'write' },
			objectAccess: 'write',
		})
	})

	it('feeds server refusals to the store, then to the host callback', () => {
		const onPushRefused = vi.fn(() => {
			throw new Error('host bug')
		})
		render({ connect: () => makeSocket() as any, roomId: 'a', assets, onPushRefused })
		const client = Mock.instances[0]
		const seen: unknown[] = []
		client.store.props.collaboration.refusals.subscribe((r: unknown) => seen.push(r))

		const refusal = { reason: 'not your page', ids: ['shape:a'] }
		expect(() => client.opts.onPushRefused(refusal)).toThrow('host bug')

		expect(seen).toEqual([{ ...refusal, source: 'server' }])
		expect(onPushRefused).toHaveBeenCalledWith(refusal)
	})

	describe('authorize', () => {
		const rule = vi.fn(() => null)
		const connect = (
			client: { opts: any },
			userId: string | null,
			document: 'read' | 'write',
			objectTypes?: string[],
			permissions?: string[]
		) =>
			act(() =>
				client.opts.onAfterConnect(client, {
					access: { document, objects: 'write' },
					userId,
					permissions: permissions ?? null,
					objectTypes,
					isReadonly: document === 'read',
					objectAccess: 'write',
				})
			)

		it('has no session until the first connect, then the one the server granted', () => {
			render({ connect: () => makeSocket() as any, assets, authorize: { rule } })
			const authorize = Mock.instances[0].store.props.authorize
			expect(authorize.getSession()).toBeNull()

			connect(Mock.instances[0], 'user-1', 'write')
			expect(authorize.getSession()).toEqual({
				sessionId: expect.any(String),
				userId: 'user-1',
				meta: undefined,
				access: { document: 'write', objects: 'write' },
				permissions: null,
			})
		})

		it('follows the permissions from connect and from later updates', () => {
			render({ connect: () => makeSocket() as any, assets, authorize: { rule } })
			const client = Mock.instances[0]
			const { authorize, collaboration } = client.store.props
			expect(collaboration.permissions.get()).toBeNull()

			connect(client, 'user-1', 'write', undefined, ['tl:shape:*'])
			expect(collaboration.permissions.get()).toEqual(['tl:shape:*'])
			expect(authorize.getSession().permissions).toEqual(['tl:shape:*'])

			act(() => client.opts.onPermissionsChanged(['tl:*']))
			expect(collaboration.permissions.get()).toEqual(['tl:*'])
			expect(authorize.getSession().permissions).toEqual(['tl:*'])

			// a reconnect brings the server's current list, or none
			connect(client, 'user-1', 'write')
			expect(collaboration.permissions.get()).toBeNull()
		})

		it('exposes permissions without a local rule', () => {
			render({ connect: () => makeSocket() as any, assets })
			const client = Mock.instances[0]
			connect(client, 'user-1', 'write', undefined, ['tl:page:*'])
			expect(client.store.props.authorize).toBeUndefined()
			expect(client.store.props.collaboration.permissions.get()).toEqual(['tl:page:*'])
		})

		it('keeps the last session across a reconnect, then takes the new one', () => {
			render({ connect: () => makeSocket() as any, assets, authorize: { rule } })
			const client = Mock.instances[0]
			const authorize = client.store.props.authorize
			connect(client, 'user-1', 'write')
			const first = authorize.getSession()

			// offline: nothing new from the server, the last grant still applies
			expect(authorize.getSession()).toEqual(first)

			connect(client, 'user-1', 'read')
			expect(authorize.getSession().access).toEqual({ document: 'read', objects: 'write' })
		})

		it('takes the object types from the connect', () => {
			render({ connect: () => makeSocket() as any, assets, authorize: { rule } })
			const client = Mock.instances[0]
			const authorize = client.store.props.authorize
			expect(authorize.objectTypes).toBeUndefined()

			connect(client, null, 'write', ['comment'])
			expect(authorize.objectTypes).toEqual(['comment'])

			// an empty list from the room is an answer, not a reason to fall back
			connect(client, null, 'write', [])
			expect(authorize.objectTypes).toEqual([])
		})

		it('falls back to the deprecated objectTypes option when the connect has none', () => {
			render({
				connect: () => makeSocket() as any,
				assets,
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				authorize: { rule, objectTypes: ['comment'] },
			})
			const client = Mock.instances[0]
			const authorize = client.store.props.authorize
			expect(authorize.objectTypes).toEqual(['comment'])

			connect(client, null, 'write')
			expect(authorize.objectTypes).toEqual(['comment'])

			connect(client, null, 'write', ['note'])
			expect(authorize.objectTypes).toEqual(['note'])
		})

		it('uses the latest rule and objectTypes without a new client', () => {
			const ruleB = vi.fn(() => ({ reason: 'b' }))
			const socket = makeSocket()
			const connectFn = () => socket as any
			render({ connect: connectFn, assets, authorize: { rule } })
			connect(Mock.instances[0], null, 'write')
			render({
				connect: connectFn,
				assets,
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				authorize: { rule: ruleB, objectTypes: ['comment'] },
			})
			expect(Mock.instances).toHaveLength(1)

			const authorize = Mock.instances[0].store.props.authorize
			expect(authorize.objectTypes).toEqual(['comment'])
			expect(authorize.rule({} as any)).toEqual({ reason: 'b' })
		})

		it('gives the store no rule when none is passed', () => {
			render({ connect: () => makeSocket() as any, assets })
			expect(Mock.instances[0].store.props.authorize).toBeUndefined()
		})
	})
})
