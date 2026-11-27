import { describe, expect, it, vi } from 'vitest'
import { StoredImage } from './mcpImage'
import { RoomNotFoundError } from './roomEffectHelpers'
import { TLFileDurableObject } from './TLFileDurableObject'

vi.mock('cloudflare:workers', () => ({ DurableObject: class {} }))

const IMAGE: StoredImage = {
	objectName: 'abc-shot-png',
	src: 'https://content.example/abc-shot-png',
	name: 'shot.png',
	fileSize: 1234,
	info: { mimeType: 'image/png', w: 800, h: 600, isAnimated: false },
}

const PAGE = { id: 'page:one', typeName: 'page', name: 'First', index: 'a1', meta: {} }

/**
 * The file's durable object with only what writeMcpImage touches: who the caller is to this file,
 * whether tabs are connected, and the room's records.
 */
function harness({
	file = {},
	role = 'owner' as string | null,
	documentInfo = { slug: 'board_1', isApp: true, deleted: false },
	sockets = 0,
	getStorage,
}: {
	file?: object
	role?: string | null
	documentInfo?: object
	sockets?: number
	getStorage?(): Promise<never>
} = {}) {
	const records = new Map<string, any>([[PAGE.id, PAGE]])
	const order: string[] = []
	const storage = {
		transaction: (fn: (txn: any) => unknown) => {
			order.push('write')
			return {
				result: fn({
					values: () => records.values(),
					set: (id: string, record: unknown) => records.set(id, record),
				}),
			}
		},
	}
	const object = Object.assign(Object.create(TLFileDurableObject.prototype), {
		_documentInfo: documentInfo,
		env: {},
		state: { getWebSockets: () => new Array(sockets) },
		getAppFileRecordWithRole: async () => ({
			file: { id: 'board_1', isDeleted: false, shared: false, sharedLinkType: 'view', ...file },
			role,
		}),
		getRoom: async () => {
			order.push('room')
		},
		getStorage: getStorage ?? (async () => storage),
	}) as TLFileDurableObject
	const write = (overrides: object = {}) =>
		object.writeMcpImage({
			fileId: 'board_1',
			userId: 'user_1',
			image: IMAGE,
			pageId: null,
			position: null,
			w: null,
			altText: null,
			...overrides,
		})
	return { write, records, order }
}

describe('writeMcpImage', () => {
	it('writes the asset and the shape for a member of the board’s workspace', async () => {
		const { write, records, order } = harness()
		const written = await write({ position: { x: 5, y: 6 } })
		expect(written).toEqual({
			ok: true,
			shapeId: 'shape:mcp-abc-shot-png',
			pageId: 'page:one',
			pageName: 'First',
			x: 5,
			y: 6,
			w: 800,
			h: 600,
		})
		expect([...records.keys()]).toEqual([
			'page:one',
			'asset:mcp-abc-shot-png',
			'shape:mcp-abc-shot-png',
		])
		// Nobody is on the board, so there is no room to boot.
		expect(order).toEqual(['write'])
	})

	// A hibernated object keeps its sockets but not its room, and only a running room tells them of a
	// storage write. Booted after the write, it starts from a clock that already includes the image.
	it('boots the room before writing when tabs are connected', async () => {
		const { write, order } = harness({ sockets: 2 })
		await write()
		expect(order).toEqual(['room', 'write'])
	})

	it('adds nothing the second time the same upload is placed', async () => {
		const { write, records } = harness()
		const first = await write()
		const again = await write({ position: { x: 900, y: 900 } })
		expect(again).toEqual(first)
		expect(records.size).toBe(3)
	})

	// The worker checks access before it stores anything, but from Postgres and a moment earlier.
	// This is the check that stands between a caller and the room.
	it('lets a guest write only through an edit link', async () => {
		const guest = { role: null }
		const viaEditLink = harness({ ...guest, file: { shared: true, sharedLinkType: 'edit' } })
		expect(await viaEditLink.write()).toMatchObject({ ok: true })

		const viaViewLink = harness({ ...guest, file: { shared: true, sharedLinkType: 'view' } })
		expect(await viaViewLink.write()).toEqual({ ok: false, reason: 'image_forbidden' })
		expect(viaViewLink.order).toEqual([])

		const unshared = harness(guest)
		expect(await unshared.write()).toEqual({ ok: false, reason: 'not_found' })
		expect(unshared.records.size).toBe(1)
	})

	it('answers a deleted board, and one this object does not hold, as not found', async () => {
		for (const options of [
			{ file: { isDeleted: true } },
			{ documentInfo: { slug: 'board_1', isApp: true, deleted: true } },
			{ documentInfo: { slug: 'another_board', isApp: true, deleted: false } },
			{ documentInfo: { slug: 'board_1', isApp: false, deleted: false } },
		]) {
			const { write, order } = harness(options)
			expect(await write()).toEqual({ ok: false, reason: 'not_found' })
			expect(order).toEqual([])
		}
	})

	it('says so when the page is not on the board, or the board has no content yet', async () => {
		const { write, records } = harness()
		expect(await write({ pageId: 'page:gone' })).toEqual({
			ok: false,
			reason: 'page_not_found',
			pageId: 'page:gone',
		})
		expect(records.size).toBe(1)

		const empty = harness({
			getStorage: async () => {
				throw new RoomNotFoundError('board_1')
			},
		})
		expect(await empty.write()).toEqual({ ok: false, reason: 'board_empty' })
	})
})
