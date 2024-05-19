import { nanoid } from 'nanoid'
import {
	Editor,
	TLArrowBinding,
	TLArrowShape,
	TLRecord,
	TLStore,
	computed,
	createPresenceStateDerivation,
	createTLStore,
	isRecordsDiffEmpty,
} from 'tldraw'
import { prettyPrintDiff } from '../../../tldraw/src/test/testutils/pretty'
import { TLSyncClient } from '../lib/TLSyncClient'
import { schema } from '../lib/schema'
import { FuzzEditor, Op } from './FuzzEditor'
import { RandomSource } from './RandomSource'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

jest.mock('@tldraw/editor/src/lib/editor/managers/TickManager.ts', () => {
	return {
		TickManager: class {
			start() {
				// noop
			}
		},
	}
})

// @ts-expect-error
global.requestAnimationFrame = (cb: () => any) => {
	cb()
}

jest.mock('nanoid', () => {
	const { RandomSource } = jest.requireActual('./RandomSource')
	let source = new RandomSource(0)
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const readable = require('uuid-readable')
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const uuid = require('uuid-by-string')
	const nanoid = () => {
		return readable.short(uuid(source.randomInt().toString(16))).replaceAll(' ', '_')
	}
	return {
		nanoid,
		default: nanoid,
		__reseed(seed: number) {
			source = new RandomSource(seed)
		},
	}
})

const disposables: Array<() => void> = []

afterEach(() => {
	for (const dispose of disposables) {
		dispose()
	}
	disposables.length = 0
})

class FuzzTestInstance extends RandomSource {
	store: TLStore
	editor: FuzzEditor | null = null
	client: TLSyncClient<TLRecord>
	socketPair: TestSocketPair<TLRecord>
	id: string

	hasLoaded = false

	constructor(
		public readonly seed: number,
		server: TestServer<TLRecord>
	) {
		super(seed)

		this.id = nanoid()
		this.store = createTLStore({ schema, id: this.id })
		this.socketPair = new TestSocketPair(this.id, server)
		this.client = new TLSyncClient<TLRecord>({
			store: this.store,
			socket: this.socketPair.clientSocket,
			onSyncError: (reason) => {
				throw new Error('onSyncError:' + reason)
			},
			onLoad: () => {
				this.editor = new FuzzEditor(this.id, this.seed, this.store)
			},
			onLoadError: (e) => {
				throw new Error('onLoadError', e)
			},
			presence: createPresenceStateDerivation(
				computed('', () => ({
					id: this.id,
					name: 'test',
					color: 'red',
					locale: 'en',
				}))
			)(this.store),
		})

		disposables.push(() => {
			this.client.close()
		})
	}
}

function assertPeerStoreIsUsable(peer: FuzzTestInstance) {
	const diffToEnsureUsable = peer.store.extractingChanges(() => peer.store.ensureStoreIsUsable())
	if (!isRecordsDiffEmpty(diffToEnsureUsable)) {
		throw new Error(`store of ${peer.id} was not usable\n${prettyPrintDiff(diffToEnsureUsable)}`)
	}
}

let totalNumShapes = 0
let totalNumPages = 0

function arrowsAreSound(editor: Editor) {
	const arrows = editor.getCurrentPageShapes().filter((s): s is TLArrowShape => s.type === 'arrow')
	for (const arrow of arrows) {
		const bindings = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')
		const terminalsSeen = new Set()
		for (const binding of bindings) {
			if (terminalsSeen.has(binding.props.terminal)) {
				return false
			}

			terminalsSeen.add(binding.props.terminal)

			if (!editor.store.has(binding.toId)) {
				return false
			}
		}
	}
	return true
}

function runTest(seed: number) {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	require('nanoid').__reseed(seed)
	const server = new TestServer(schema)
	const instance = new FuzzTestInstance(seed, server)

	const peers = [instance, new FuzzTestInstance(instance.randomInt(), server)]
	const numExtraPeers = instance.randomInt(MAX_PEERS - 2)
	for (let i = 0; i < numExtraPeers; i++) {
		peers.push(new FuzzTestInstance(instance.randomInt(), server))
	}

	const allOk = (when: string) => {
		if (peers.some((p) => p.editor?.editor && !p.editor?.editor.getCurrentPage())) {
			throw new Error(`not all peer editors have current page (${when})`)
		}
		if (peers.some((p) => p.editor?.editor && !p.editor?.editor.getCurrentPageState())) {
			throw new Error(`not all peer editors have page states (${when})`)
		}
		if (
			peers.some(
				(p) => p.client.isConnectedToRoom && p.socketPair.clientSocket.connectionStatus !== 'online'
			)
		) {
			throw new Error(`peer client connection status mismatch (${when})`)
		}
		if (peers.some((p) => p.editor?.editor && !arrowsAreSound(p.editor.editor))) {
			throw new Error(`peer editor arrows are not sound (${when})`)
		}
		const numOtherPeersConnected = peers.filter((p) => p.hasLoaded).length - 1
		if (
			peers.some(
				(p) =>
					p.hasLoaded &&
					p.editor?.editor.store.query.ids('instance_presence').get().size !==
						numOtherPeersConnected
			)
		) {
			throw new Error(`not all peer editors have instance presence (${when})`)
		}
	}

	const ops: Array<{ peerId: string; op: Op; id: number }> = []
	try {
		for (let i = 0; i < NUM_OPS_PER_TEST; i++) {
			const peer = peers[instance.randomInt(peers.length)]

			if (peer.editor) {
				const op = peer.editor.getRandomOp()
				ops.push({ peerId: peer.id, op, id: ops.length })

				allOk('before applyOp')
				peer.editor.applyOp(op)
				assertPeerStoreIsUsable(peer)
				allOk('after applyOp')

				server.flushDebouncingMessages()

				if (peer.socketPair.isConnected && peer.randomInt(6) === 0) {
					// randomly disconnect a peer
					peer.socketPair.disconnect()
					allOk('disconnect')
				} else if (!peer.socketPair.isConnected && peer.randomInt(2) === 0) {
					// randomly reconnect a peer
					peer.socketPair.connect()
					allOk('connect')
				}
			} else if (!peer.socketPair.isConnected && peer.randomInt(2) === 0) {
				peer.socketPair.connect()
				allOk('connect 2')
			}

			const peersThatNeedFlushing = peers.filter((p) => p.socketPair.getNeedsFlushing())
			for (const peer of peersThatNeedFlushing) {
				if (peer.randomInt(10) < 4) {
					allOk('before flush server ' + i)
					peer.socketPair.flushServerSentEvents()
					allOk('flush server ' + i)
				} else if (peer.randomInt(10) < 2) {
					peer.socketPair.flushClientSentEvents()
					allOk('flush client')
				}
			}
		}

		// bring all clients online and flush all messages to make sure everyone has seen all messages
		while (peers.some((p) => !p.socketPair.isConnected)) {
			for (const peer of peers) {
				if (!peer.socketPair.isConnected && peer.randomInt(2) === 0) {
					peer.socketPair.connect()
					allOk('final connect')
					assertPeerStoreIsUsable(peer)
				}
			}
		}

		while (peers.some((p) => p.socketPair.getNeedsFlushing())) {
			server.flushDebouncingMessages()

			for (const peer of peers) {
				if (peer.socketPair.getNeedsFlushing()) {
					peer.socketPair.flushServerSentEvents()
					allOk('final flushServer')
					peer.socketPair.flushClientSentEvents()
					allOk('final flushClient')
					assertPeerStoreIsUsable(peer)
				}
			}
		}

		// peers should all be usable without changes:
		for (const peer of peers) {
			assertPeerStoreIsUsable(peer)
		}

		// all stores should be the same
		for (let i = 1; i < peers.length; i++) {
			const expected = peers[i - 1]
			const actual = peers[i]
			try {
				expect(actual.store.serialize('document')).toEqual(expected.store.serialize('document'))
			} catch (e: any) {
				throw new Error(`received = ${actual.id}, expected = ${expected.id}\n${e.message}`)
			}
		}

		totalNumPages += peers[0].store.query.ids('page').get().size
		totalNumShapes += peers[0].store.query.ids('shape').get().size
	} catch (e) {
		console.error('seed', seed)
		console.error(
			'peers',
			JSON.stringify(
				peers.map((p) => p.id),
				null,
				2
			)
		)
		console.error('ops', JSON.stringify(ops, null, '\t'))
		throw e
	}
}

const NUM_TESTS = 50
const NUM_OPS_PER_TEST = 100
const MAX_PEERS = 4

test('seed 8360926944486245 - undo/redo page integrity regression', () => {
	runTest(8360926944486245)
})
test('seed 3467175630814895 - undo/redo page integrity regression', () => {
	runTest(3467175630814895)
})
test('seed 6820615056006575 - undo/redo page integrity regression', () => {
	runTest(6820615056006575)
})
test('seed 5279266392988747 - undo/redo page integrity regression', () => {
	runTest(5279266392988747)
})

for (let i = 0; i < NUM_TESTS; i++) {
	const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
	test(`seed ${seed}`, () => {
		runTest(seed)
	})
}

test('totalNumPages', () => {
	expect(totalNumPages).not.toBe(0)
})

test('totalNumShapes', () => {
	expect(totalNumShapes).not.toBe(0)
})
