import { UnknownRecord } from '@tldraw/store'
import { createTLSchema, CustomRecordInfo } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { describe, expect, it, vi } from 'vitest'
import { RecordOpType } from '../lib/diff'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import { getTlsyncProtocolVersion, TLConnectRequest } from '../lib/protocol'
import { TLSocketRoom } from '../lib/TLSocketRoom'
import { getPluginObjectTypes, TLSyncPlugin } from '../lib/TLSyncPlugin'
import { RoomSnapshot } from '../lib/TLSyncRoom'
import { TLSyncStorageTransaction } from '../lib/TLSyncStorage'

// A minimal document-scoped custom record type, modeled on objectStore.test.ts's `note` record,
// used here to stand in for a plugin-contributed record (e.g. a comment).

const widgetConfig: CustomRecordInfo = {
	scope: 'document',
	validator: T.any as any,
}

// the schema the room derives internally when constructed with only the widget plugin (no
// explicit `schema` option) — used to build a matching `connect` handshake in tests below.
const widgetOnlySchema = createTLSchema({ records: { widget: widgetConfig } })

function makeWidgetPlugin(overrides: Partial<TLSyncPlugin> = {}): TLSyncPlugin {
	return {
		id: 'widget-plugin',
		records: { widget: widgetConfig },
		objectTypes: ['widget'],
		...overrides,
	}
}

// A minimal WebSocketMinimal mock for driving TLSocketRoom, which wraps sockets in
// ServerSocketAdapter and expects `send`/`readyState`, not the raw TLRoomSocket shape.
function makeRawSocket() {
	return {
		readyState: 1,
		send: vi.fn(),
		close: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}
}

describe('getPluginObjectTypes', () => {
	it('unions and dedupes plugin objectTypes with extras', () => {
		expect(
			getPluginObjectTypes(
				[
					{ id: 'a', objectTypes: ['x', 'y'] },
					{ id: 'b', objectTypes: ['y', 'z'] },
				],
				['w', 'x']
			).sort()
		).toEqual(['w', 'x', 'y', 'z'])
	})

	it('returns an empty array when given no plugins and no extras', () => {
		expect(getPluginObjectTypes(undefined)).toEqual([])
		expect(getPluginObjectTypes([])).toEqual([])
	})
})

describe('TLSocketRoom plugins option', () => {
	it('derives schema from plugin records when no schema is passed', () => {
		const plugin = makeWidgetPlugin()
		let room!: TLSocketRoom<any, any>
		expect(() => {
			room = new TLSocketRoom({ plugins: [plugin] })
		}).not.toThrow()

		const socket = makeRawSocket()
		room.handleSocketConnect({ sessionId: 'writer', socket: socket as any })
		room.handleSocketMessage(
			'writer',
			JSON.stringify({
				type: 'connect',
				connectRequestId: 'connect-writer',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: widgetOnlySchema.serialize(),
			} satisfies TLConnectRequest)
		)

		const widget = { id: 'widget:1', typeName: 'widget', label: 'hi' }
		room.handleSocketMessage(
			'writer',
			JSON.stringify({
				type: 'push',
				clientClock: 1,
				diff: { [widget.id]: [RecordOpType.Put, widget] },
			})
		)

		const record = room.getRecord(widget.id)
		expect(record).toMatchObject({ id: widget.id, label: 'hi' })
		room.close()
	})

	it('throws at construction when a passed schema is missing plugin record types', () => {
		const plugin = makeWidgetPlugin()
		expect(() => new TLSocketRoom({ schema: createTLSchema() as any, plugins: [plugin] })).toThrow(
			/widget/
		)
	})

	it('throws at construction on duplicate plugin ids', () => {
		const pluginA = makeWidgetPlugin({ id: 'dup', objectTypes: undefined, records: undefined })
		const pluginB = makeWidgetPlugin({ id: 'dup', objectTypes: undefined, records: undefined })
		expect(() => new TLSocketRoom({ plugins: [pluginA, pluginB] })).toThrow(/duplicate plugin id/i)
	})

	it('fans out onCommittedChanges to plugins and the host option, and survives a throwing plugin', async () => {
		const plugin1Callback = vi.fn(() => {
			throw new Error('boom')
		})
		const plugin2Callback = vi.fn()
		const hostCallback = vi.fn()
		const errorLog = vi.fn()

		const plugin1 = makeWidgetPlugin({ id: 'p1', onCommittedChanges: plugin1Callback })
		const plugin2: TLSyncPlugin = {
			id: 'p2',
			onCommittedChanges: plugin2Callback,
		}

		const room = new TLSocketRoom({
			plugins: [plugin1, plugin2],
			onCommittedChanges: hostCallback,
			log: { error: errorLog },
		})

		const socket = makeRawSocket()
		room.handleSocketConnect({ sessionId: 'writer', socket: socket as any })
		room.handleSocketMessage(
			'writer',
			JSON.stringify({
				type: 'connect',
				connectRequestId: 'connect-writer',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: widgetOnlySchema.serialize(),
			} satisfies TLConnectRequest)
		)

		const widget = { id: 'widget:2', typeName: 'widget', label: 'hey' }
		room.handleSocketMessage(
			'writer',
			JSON.stringify({
				type: 'push',
				clientClock: 1,
				diff: { [widget.id]: [RecordOpType.Put, widget] },
			})
		)
		await Promise.resolve()
		await Promise.resolve()

		expect(plugin1Callback).toHaveBeenCalledTimes(1)
		expect(plugin2Callback).toHaveBeenCalledTimes(1)
		expect(hostCallback).toHaveBeenCalledTimes(1)
		expect(errorLog).toHaveBeenCalled()
		room.close()
	})
})

describe('storage plugins option', () => {
	it('InMemorySyncStorage partitions plugin objectTypes into the object lane', () => {
		const schema = createTLSchema({ records: { widget: widgetConfig } })
		const snapshot = {
			documents: [],
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		}
		const plugin: TLSyncPlugin = { id: 'p', objectTypes: ['widget'] }
		const storage = new InMemorySyncStorage<UnknownRecord>({ snapshot, plugins: [plugin] })

		storage.transaction((txn: TLSyncStorageTransaction<UnknownRecord>) => {
			txn.set('widget:1', { id: 'widget:1', typeName: 'widget', label: 'x' } as any)
		})

		expect(
			storage.getObjectsSnapshot().map((d: RoomSnapshot['documents'][number]) => d.state.id)
		).toEqual(['widget:1'])
		expect(
			storage.getSnapshot().documents.map((d: RoomSnapshot['documents'][number]) => d.state.id)
		).toEqual([])
	})
})
