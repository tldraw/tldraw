import { atom, computed } from '@tldraw/state'
import {
	Editor,
	TLRecord,
	TLRefusal,
	TLWriteRule,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
} from 'tldraw'
import { afterEach, expect, it } from 'vitest'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

const disposables: Array<() => void> = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

// the same rule on both sides: no shape past x = 1000
const rule: TLWriteRule<TLRecord> = ({ changes }) => {
	const far = changes.filter((c) => c.next?.typeName === 'shape' && c.next.x > 1000)
	return far.length ? { reason: 'too far', ids: far.map((c) => c.next!.id) } : null
}

function setup() {
	const schema = createTLSchema()
	const judgedOnServer: string[] = []
	const server = new TestServer<TLRecord>(schema, undefined, {
		authorize: (args) => {
			for (const c of args.changes) judgedOnServer.push((c.next ?? c.prev).id)
			return rule(args)
		},
	})
	const socketPair = new TestSocketPair<TLRecord>('local-rule', server)
	socketPair.connect()
	const store = createTLStore({
		schema,
		authorize: {
			rule,
			getSession: () => ({
				sessionId: 'local-rule',
				userId: null,
				meta: undefined,
				access: { document: 'write', objects: 'write' },
				permissions: null,
			}),
		},
	})
	const client = new TLSyncClient<TLRecord>({
		store,
		socket: socketPair.clientSocket,
		presence: computed('presence', () => null),
		onLoad: () => {},
		onSyncError: (reason) => {
			throw new Error(`unexpected sync error: ${reason}`)
		},
	})
	disposables.push(() => client.close())
	const editor = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: defaultTools,
		initialState: 'select',
		store,
		getContainer: () => document.createElement('div'),
	})
	disposables.push(() => editor.dispose())
	// client permissions need the license's permissions feature
	editor.licenseManager = {
		state: atom('license state', 'licensed'),
		isFeatureEnabled: () => true,
	} as any
	const refusals: TLRefusal[] = []
	editor.on('refused', (r) => refusals.push(r))
	const settle = () => {
		store._flushHistory()
		while (socketPair.getNeedsFlushing()) {
			socketPair.flushClientSentEvents()
			server.flushDebouncingMessages()
			socketPair.flushServerSentEvents()
		}
	}
	settle()
	return { editor, server, judgedOnServer, refusals, settle }
}

it('never pushes a change the local rule refused', () => {
	const { editor, server, judgedOnServer, refusals, settle } = setup()
	const near = createShapeId('near')
	const far = createShapeId('far')

	editor.createShape({ id: near, type: 'geo', x: 10, y: 10 })
	editor.createShape({ id: far, type: 'geo', x: 2000, y: 10 })
	settle()

	expect(refusals).toEqual([{ reason: 'too far', ids: [far], source: 'local' }])
	expect(editor.getShape(far)).toBeUndefined()
	expect(judgedOnServer).toContain(near)
	expect(judgedOnServer).not.toContain(far)
	expect(server.storage.documents.has(near)).toBe(true)
	expect(server.storage.documents.has(far)).toBe(false)
})
