// @vitest-environment node
import { applyObjectDiff, diffRecord, RecordOpType, type NetworkDiff } from '@tldraw/sync-core/src/lib/diff'
import { CORE_ACTIVITIES, createShapeId, type TLShape } from '@tldraw/tlschema'

let createServerPermissionsFilter: typeof import('./TLPermissionsManager').createServerPermissionsFilter

function makeShape(id: string, overrides: Partial<TLShape> = {}): TLShape {
	return {
		id: createShapeId(id),
		typeName: 'shape',
		type: 'geo',
		parentId: 'page:page_1' as TLShape['parentId'],
		index: 'a1',
		x: 0,
		y: 0,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
		props: {
			w: 100,
			h: 100,
		},
		...overrides,
	} as TLShape
}

describe('createServerPermissionsFilter', () => {
	beforeAll(async () => {
		;({ createServerPermissionsFilter } = await import('./TLPermissionsManager'))
	})

	it('discards denied shape creates', () => {
		const filter = createServerPermissionsFilter<{ userId: string }>(
			{ [CORE_ACTIVITIES.CREATE_SHAPE]: false },
			[]
		)
		const shape = makeShape('shape_1')
		const diff: NetworkDiff<TLShape> = {
			[shape.id]: [RecordOpType.Put, shape],
		}

		const result = filter({
			sessionId: 'session_1',
			meta: { userId: 'user_1' },
			diff,
			getRecord: () => undefined,
		})

		expect(result).toEqual({})
	})

	it('removes disallowed move fields from shape patches', () => {
		const filter = createServerPermissionsFilter<{ userId: string }>({
			[CORE_ACTIVITIES.UPDATE_SHAPE]: true,
			[CORE_ACTIVITIES.MOVE_SHAPE]: false,
			[CORE_ACTIVITIES.EDIT_SHAPE_PROPS]: true,
		})
		const prev = makeShape('shape_2')
		const next = makeShape('shape_2', {
			x: 120,
			y: 80,
			props: { ...(prev.props as object), w: 220 } as any,
		})
		const patch = diffRecord(prev, next)!
		const diff: NetworkDiff<TLShape> = {
			[prev.id]: [RecordOpType.Patch, patch],
		}

		const result = filter({
			sessionId: 'session_1',
			meta: { userId: 'user_1' },
			diff,
			getRecord: () => prev,
		})
		const filteredPatch = result[prev.id]
		expect(filteredPatch?.[0]).toBe(RecordOpType.Patch)

		const filteredNext = applyObjectDiff(prev, (filteredPatch as any)[1]) as TLShape
		expect(filteredNext.x).toBe(prev.x)
		expect(filteredNext.y).toBe(prev.y)
		expect(filteredNext.props).not.toEqual(prev.props)
	})
})
