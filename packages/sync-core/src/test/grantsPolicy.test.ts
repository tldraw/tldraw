import { createGrantsPolicy } from '@tldraw/permissions'
import { createShapeId, PageRecordType, TLPageId, TLRecord } from '@tldraw/tlschema'
import { createTLSchema } from 'tldraw'
import { describe, expect, it, vi } from 'vitest'
import { RecordOpType } from '../lib/diff'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import { getTlsyncProtocolVersion } from '../lib/protocol'
import { TLSocketRoom } from '../lib/TLSocketRoom'

// The room takes the same policy object the client store does, not just its rule.

const schema = createTLSchema()
const policy = createGrantsPolicy({
	requires: {
		'tl:shape:create': ['tl:shape:create', 'page:edit'],
		'tl:shape:update': ['tl:shape:update', 'page:edit'],
	},
})

const page = (id: string) =>
	PageRecordType.create({ id: id as TLPageId, name: id, index: 'a1' as any })
const frame = (id: string, parentId: string) =>
	schema.types.shape.create({
		id: createShapeId(id),
		type: 'frame',
		parentId: parentId as any,
		index: 'a1' as any,
		props: { w: 100, h: 100, name: '', color: 'black' },
	})

function setup() {
	const storage = new InMemorySyncStorage<TLRecord>({
		snapshot: {
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
			documents: [page('page:A'), page('page:B'), frame('on-b', 'page:B')].map((state) => ({
				state,
				lastChangedClock: 0,
			})),
		},
	})
	const room = new TLSocketRoom<TLRecord, undefined>({ schema, storage, authorize: policy })
	const socket = {
		send: vi.fn(),
		close: vi.fn(),
		readyState: WebSocket.OPEN,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}
	room.handleSocketConnect({
		sessionId: 'sam',
		socket,
		userId: 'sam',
		permissions: ['tl:shape:*', 'page:edit@page:A'],
	})
	room.handleSocketMessage(
		'sam',
		JSON.stringify({
			type: 'connect',
			connectRequestId: 'connect-sam',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: schema.serialize(),
		})
	)
	const push = (record: TLRecord) => {
		socket.send.mockClear()
		room.handleSocketMessage(
			'sam',
			JSON.stringify({
				type: 'push',
				clientClock: 1,
				diff: { [record.id]: [RecordOpType.Put, record] },
			})
		)
		return socket.send.mock.calls
			.map((c) => JSON.parse(c[0]))
			.flatMap((m) => (m.type === 'data' ? m.data : [m]))
			.find((m) => m.type === 'push_result')
	}
	return { room, push }
}

describe('a grants policy as the room authorize', () => {
	it('allows a create on a page with the grant', () => {
		const { room, push } = setup()
		const onA = frame('on-a', 'page:A')
		expect(push(onA)).toMatchObject({ action: 'commit' })
		expect(room.getRecord(onA.id)).toBeDefined()
	})

	it('refuses a create on a page without it, naming the typed action', () => {
		const { room, push } = setup()
		const onB = frame('new-on-b', 'page:B')
		expect(push(onB)).toMatchObject({
			action: 'discard',
			refused: { reason: 'Needs tl:shape:create:frame', ids: [onB.id] },
		})
		expect(room.getRecord(onB.id)).toBeUndefined()
	})

	it('refuses moving a shape off a page without the grant', () => {
		const { room, push } = setup()
		const moved = { ...frame('on-b', 'page:A') }
		expect(push(moved)).toMatchObject({ action: 'discard' })
		expect((room.getRecord(moved.id) as any).parentId).toBe('page:B')
	})
})
