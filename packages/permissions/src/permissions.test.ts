import type { UnknownRecord } from '@tldraw/store'
import type { TLWriteRuleArgs, TLWriteRuleSession } from '@tldraw/tlschema'
import {
	createGrantsPolicy,
	defaultGrantsPolicy,
	getPermissionPlaces,
	getRequiredPermission,
	isChangePermitted,
	isPermitted,
	TL_PERMISSIONS,
	TLPermissionChange,
} from './permissions'

type Rec = UnknownRecord & Record<string, any>
const rec = (fields: Record<string, unknown>) => fields as Rec

const page = (id: string) => rec({ id, typeName: 'page' })
const shape = (id: string, parentId: string, type = 'geo') =>
	rec({ id, typeName: 'shape', type, parentId })
const binding = (id: string, fromId: string, toId: string) =>
	rec({ id, typeName: 'binding', fromId, toId })
const record = (typeName: string) => rec({ id: `${typeName}:1`, typeName })

const create = (next: Rec) => ({ type: 'create', prev: null, next }) as const
const update = (prev: Rec, next = prev) => ({ type: 'update', prev, next }) as const
const del = (prev: Rec) => ({ type: 'delete', prev, next: null }) as const

const reader = (...records: Rec[]) => {
	const byId = new Map<string, Rec>(records.map((r) => [r.id, r]))
	return (id: string) => byId.get(id)
}

// page:A holds a frame with a note in it; page:B holds a geo
const pageA = page('page:A')
const pageB = page('page:B')
const frame = shape('shape:frame', 'page:A', 'frame')
const note = shape('shape:note', 'shape:frame', 'note')
const geoB = shape('shape:geoB', 'page:B')
const board = reader(pageA, pageB, frame, note, geoB)

describe('isPermitted', () => {
	it('matches a permission by name', () => {
		expect(isPermitted(['tl:shape:create'], 'tl:shape:create')).toBe(true)
		expect(isPermitted(['tl:shape:create'], 'tl:shape:delete')).toBe(false)
		expect(isPermitted([], 'tl:shape:create')).toBe(false)
	})

	it('lets a trailing :* cover everything under its prefix', () => {
		expect(isPermitted(['tl:shape:*'], 'tl:shape:delete')).toBe(true)
		expect(isPermitted(['tl:shape:*'], 'tl:shape:delete:geo')).toBe(true)
		expect(isPermitted(['tl:shape:*'], 'tl:page:delete')).toBe(false)
		expect(TL_PERMISSIONS.every((p) => isPermitted(['tl:*'], p))).toBe(true)
	})

	it('lets a parent cover its children, not the other way round', () => {
		expect(isPermitted(['tl:shape:create'], 'tl:shape:create:geo')).toBe(true)
		expect(isPermitted(['tl:shape'], 'tl:shape:create')).toBe(true)
		// a type grant isn't every type
		expect(isPermitted(['tl:shape:create:note'], 'tl:shape:create')).toBe(false)
		expect(isPermitted(['tl:shape:create:note'], 'tl:shape:create:geo')).toBe(false)
		expect(isPermitted(['tl:shape:create:note'], 'tl:shape:create:note')).toBe(true)
	})

	it('only matches whole segments', () => {
		expect(isPermitted(['tl:shape:*'], 'tl:shapes:create')).toBe(false)
		expect(isPermitted(['tl:shape:create'], 'tl:shape:created')).toBe(false)
	})

	it('keeps host names apart from the tl ones', () => {
		expect(isPermitted(['tl:*'], 'app:grants:manage')).toBe(false)
		expect(isPermitted(['app:*'], 'app:grants:manage')).toBe(true)
	})

	it('counts a placed grant only at its place', () => {
		const granted = ['tl:shape:*@page:A']
		expect(isPermitted(granted, 'tl:shape:create', { at: ['page:A'] })).toBe(true)
		expect(isPermitted(granted, 'tl:shape:create', { at: ['page:B'] })).toBe(false)
		// asked with no place, a placed grant doesn't count
		expect(isPermitted(granted, 'tl:shape:create')).toBe(false)
		expect(isPermitted(granted, 'tl:shape:create', { at: (place) => place === 'page:A' })).toBe(
			true
		)
		// an unplaced grant counts anywhere
		expect(isPermitted(['tl:shape:*'], 'tl:shape:create', { at: ['page:B'] })).toBe(true)
	})

	it('counts a grant placed anywhere up the ancestor chain', () => {
		const at = getPermissionPlaces(board, note)
		expect(at).toEqual(['shape:note', 'shape:frame', 'page:A'])
		expect(isPermitted(['tl:shape:update@shape:note'], 'tl:shape:update:note', { at })).toBe(true)
		expect(isPermitted(['tl:shape:update@shape:frame'], 'tl:shape:update:note', { at })).toBe(true)
		expect(isPermitted(['tl:shape:update@page:A'], 'tl:shape:update:note', { at })).toBe(true)
		expect(isPermitted(['tl:shape:update@page:B'], 'tl:shape:update:note', { at })).toBe(false)
		// a grant on the note says nothing about its frame
		expect(
			isPermitted(['tl:shape:update@shape:note'], 'tl:shape:update:frame', {
				at: getPermissionPlaces(board, frame),
			})
		).toBe(false)
	})

	it('permits nothing when permissions are not in use', () => {
		expect(isPermitted(null, 'tl:shape:create')).toBe(false)
		expect(isPermitted(null, 'tl:shape:create', { requires: { 'tl:shape:create': [] } })).toBe(
			false
		)
	})
})

describe('getPermissionPlaces', () => {
	it('walks a shape to its page', () => {
		expect(getPermissionPlaces(board, geoB)).toEqual(['shape:geoB', 'page:B'])
		expect(getPermissionPlaces(board, pageA)).toEqual(['page:A'])
	})

	it('puts a binding at the shape it starts from', () => {
		expect(getPermissionPlaces(board, binding('binding:1', 'shape:note', 'shape:geoB'))).toEqual([
			'binding:1',
			'shape:note',
			'shape:frame',
			'page:A',
		])
	})

	it('stops at a missing parent, keeping its id', () => {
		const orphan = shape('shape:orphan', 'shape:gone')
		expect(getPermissionPlaces(board, orphan)).toEqual(['shape:orphan', 'shape:gone'])
	})

	it('survives a parent cycle', () => {
		const a = shape('shape:a', 'shape:b')
		const b = shape('shape:b', 'shape:a')
		expect(getPermissionPlaces(reader(a, b), a).length).toBeLessThan(1010)
	})
})

describe('requires', () => {
	const requires = {
		'tl:shape:create': ['tl:shape:create', 'page:edit'],
		'tl:shape:delete': { anyOf: ['tl:shape:delete', 'page:edit'] },
	}

	it('defaults to the action itself', () => {
		expect(isPermitted(['tl:page:update'], 'tl:page:update', { requires })).toBe(true)
		expect(isPermitted(['page:edit'], 'tl:page:update', { requires })).toBe(false)
	})

	it('needs every name of a list', () => {
		expect(isPermitted(['tl:shape:create', 'page:edit'], 'tl:shape:create', { requires })).toBe(
			true
		)
		expect(isPermitted(['tl:shape:create'], 'tl:shape:create', { requires })).toBe(false)
		expect(isPermitted(['page:edit'], 'tl:shape:create', { requires })).toBe(false)
	})

	it('needs one name of an anyOf', () => {
		expect(isPermitted(['page:edit'], 'tl:shape:delete', { requires })).toBe(true)
		expect(isPermitted(['tl:shape:delete'], 'tl:shape:delete', { requires })).toBe(true)
		expect(isPermitted([], 'tl:shape:delete', { requires })).toBe(false)
	})

	it("lets a typed action inherit its parent's entry, keeping its type", () => {
		// the entry's own key stands for the full action
		expect(isPermitted(['tl:shape:create', 'page:edit'], 'tl:shape:create:geo', { requires })).toBe(
			true
		)
		expect(
			isPermitted(['tl:shape:create:note', 'page:edit'], 'tl:shape:create:note', { requires })
		).toBe(true)
		expect(
			isPermitted(['tl:shape:create:note', 'page:edit'], 'tl:shape:create:geo', { requires })
		).toBe(false)
		// page:edit is still needed
		expect(isPermitted(['tl:shape:create:geo'], 'tl:shape:create:geo', { requires })).toBe(false)
	})

	it('uses the nearest entry', () => {
		const nested = {
			'tl:shape': ['tl:shape', 'shapes:on'],
			'tl:shape:create:note': ['tl:shape:create:note'],
		}
		expect(
			isPermitted(['tl:shape:create:note'], 'tl:shape:create:note', { requires: nested })
		).toBe(true)
		expect(isPermitted(['tl:shape:*'], 'tl:shape:create:geo', { requires: nested })).toBe(false)
		expect(
			isPermitted(['tl:shape:*', 'shapes:on'], 'tl:shape:create:geo', { requires: nested })
		).toBe(true)
	})

	it('does not expand names through other entries', () => {
		const chained = { 'tl:shape:create': ['page:edit'], 'page:edit': ['never'] }
		expect(isPermitted(['page:edit'], 'tl:shape:create', { requires: chained })).toBe(true)
	})

	it('checks every name at the same place', () => {
		const at = ['shape:geoB', 'page:B']
		expect(
			isPermitted(['tl:shape:*', 'page:edit@page:A'], 'tl:shape:create:geo', { requires, at })
		).toBe(false)
		expect(
			isPermitted(['tl:shape:*', 'page:edit@page:B'], 'tl:shape:create:geo', { requires, at })
		).toBe(true)
	})
})

describe('getRequiredPermission', () => {
	it('maps every change to its action', () => {
		expect(
			['page', 'binding', 'asset', 'document'].map((typeName) => [
				typeName,
				getRequiredPermission(create(record(typeName))),
				getRequiredPermission(update(record(typeName))),
				getRequiredPermission(del(record(typeName))),
			])
		).toEqual([
			['page', 'tl:page:create', 'tl:page:update', 'tl:page:delete'],
			['binding', 'tl:shape:update', 'tl:shape:update', 'tl:shape:update'],
			['asset', 'tl:shape:create', null, null],
			['document', null, null, null],
		])
	})

	it("types a shape action by the shape's type", () => {
		expect(getRequiredPermission(create(note))).toBe('tl:shape:create:note')
		expect(getRequiredPermission(update(geoB))).toBe('tl:shape:update:geo')
		expect(getRequiredPermission(del(frame))).toBe('tl:shape:delete:frame')
	})

	it('types a binding by the shape it starts from', () => {
		const arrow = shape('shape:arrow', 'page:A', 'arrow')
		const b = binding('binding:1', 'shape:arrow', 'shape:note')
		expect(getRequiredPermission(create(b), { get: reader(arrow, note) })).toBe(
			'tl:shape:update:arrow'
		)
	})
})

describe('isChangePermitted', () => {
	const requires = {
		'tl:shape:create': ['tl:shape:create', 'page:edit'],
		'tl:shape:update': ['tl:shape:update', 'page:edit'],
		'tl:shape:delete': ['tl:shape:delete', 'page:edit'],
	}
	const student = ['tl:shape:*', 'page:edit@page:A']
	const check = (granted: string[], change: TLPermissionChange, before = board, after = board) =>
		isChangePermitted(granted, change, { requires, before, after })

	it('needs the action the change maps to', () => {
		expect(isChangePermitted(['tl:shape:create'], del(geoB))).toBe(false)
		expect(isChangePermitted(['tl:shape:*'], del(geoB))).toBe(true)
		expect(isChangePermitted(['tl:shape:delete:geo'], del(geoB))).toBe(true)
		expect(isChangePermitted(['tl:shape:delete:note'], del(geoB))).toBe(false)
	})

	it('allows records no permission covers', () => {
		expect(isChangePermitted([], update(record('document')))).toBe(true)
		expect(isChangePermitted([], update(geoB))).toBe(false)
	})

	it('checks a create where the record ends up', () => {
		const newOnA = shape('shape:new', 'page:A')
		const newOnB = shape('shape:new', 'page:B')
		expect(check(student, create(newOnA), board, reader(pageA, newOnA))).toBe(true)
		expect(check(student, create(newOnB), board, reader(pageB, newOnB))).toBe(false)
	})

	it('checks a delete where the record was', () => {
		expect(check(student, del(note))).toBe(true)
		expect(check(student, del(geoB))).toBe(false)
	})

	it('checks an update on both sides, so a grant on A cannot move a shape off B', () => {
		const movedToA = { ...geoB, parentId: 'page:A' }
		expect(check(student, update(geoB, movedToA), board, reader(pageA, pageB, movedToA))).toBe(
			false
		)
		const movedToB = { ...note, parentId: 'page:B' }
		expect(check(student, update(note, movedToB), board, reader(pageA, pageB, movedToB))).toBe(
			false
		)
		const both = ['tl:shape:*', 'page:edit@page:A', 'page:edit@page:B']
		expect(check(both, update(geoB, movedToA), board, reader(pageA, pageB, movedToA))).toBe(true)
	})

	it('judges a moved frame on both pages, not the shapes inside it', () => {
		const movedFrame = { ...frame, parentId: 'page:B' }
		const after = reader(pageA, pageB, movedFrame, note)
		// the note rides along unchanged: only the frame is in the changes
		expect(
			check(['tl:shape:update:frame', 'page:edit'], update(frame, movedFrame), board, after)
		).toBe(true)
		expect(check(student, update(frame, movedFrame), board, after)).toBe(false)
		expect(check(['tl:shape:*', 'page:edit@page:B'], update(frame, movedFrame), board, after)).toBe(
			false
		)
	})

	it('reads a binding as an update of the shape it starts from, where it is', () => {
		const arrowA = shape('shape:arrow', 'page:A', 'arrow')
		const arrowB = shape('shape:arrowB', 'page:B', 'arrow')
		const world = reader(pageA, pageB, arrowA, arrowB, note, geoB)
		const fromA = binding('binding:1', 'shape:arrow', 'shape:note')
		const fromB = binding('binding:2', 'shape:arrowB', 'shape:geoB')
		expect(check(student, create(fromA), world, world)).toBe(true)
		expect(check(student, create(fromB), world, world)).toBe(false)
		expect(check(['tl:shape:update:arrow', 'page:edit'], create(fromA), world, world)).toBe(true)
		expect(check(['tl:shape:update:note', 'page:edit'], create(fromA), world, world)).toBe(false)
	})

	it('lets an asset be created when some type of shape may be, somewhere', () => {
		const asset = record('asset')
		expect(check(student, create(asset))).toBe(true)
		expect(check(['tl:shape:create:image', 'page:edit@page:A'], create(asset))).toBe(true)
		expect(check(['tl:shape:update', 'page:edit'], create(asset))).toBe(false)
		expect(check(['tl:shape:create'], create(asset))).toBe(false)
	})

	it('fails closed when permissions are not in use', () => {
		expect(isChangePermitted(null, create(note))).toBe(false)
		expect(isChangePermitted(null, create(record('document')))).toBe(true)
	})
})

describe('record types of your own', () => {
	const types = { sticker: 'stickers:edit' }

	it('are not judged without an entry', () => {
		expect(isChangePermitted(['tl:shape:*'], update(record('sticker')))).toBe(true)
		expect(isChangePermitted(['tl:shape:*'], update(record('sticker')), { types })).toBe(false)
		expect(isChangePermitted(['stickers:edit'], create(record('sticker')), { types })).toBe(true)
	})

	it('cover every kind of write', () => {
		const sticker = record('sticker')
		for (const change of [create(sticker), update(sticker), del(sticker)]) {
			expect(getRequiredPermission(change, { types })).toBe('stickers:edit')
		}
	})

	it('win over the built-in mapping', () => {
		expect(
			getRequiredPermission(update(record('binding')), { types: { binding: 'arrows:edit' } })
		).toBe('arrows:edit')
	})
})

describe('createGrantsPolicy', () => {
	const session = (permissions: string[] | null): TLWriteRuleSession => ({
		sessionId: 's',
		userId: 'sam',
		meta: undefined,
		access: { document: 'write', objects: 'write' },
		permissions,
	})
	const args = (
		permissions: string[] | null,
		changes: TLWriteRuleArgs['changes'],
		after = board
	): TLWriteRuleArgs => ({ session: session(permissions), changes, before: board, after })

	const policy = createGrantsPolicy({
		requires: { 'tl:shape:create': ['tl:shape:create', 'page:edit'] },
	})

	it('carries its requires and types', () => {
		expect(policy.requires).toEqual({ 'tl:shape:create': ['tl:shape:create', 'page:edit'] })
		expect(policy.types).toEqual({})
	})

	it('refuses a change without its grant, naming the typed action', () => {
		const onB = shape('shape:new', 'page:B')
		expect(
			policy.rule(args(['tl:shape:*', 'page:edit@page:A'], [create(onB)], reader(pageB, onB)))
		).toEqual({ reason: 'Needs tl:shape:create:geo', ids: ['shape:new'] })
		const onA = shape('shape:new', 'page:A')
		expect(
			policy.rule(args(['tl:shape:*', 'page:edit@page:A'], [create(onA)], reader(pageA, onA)))
		).toBeNull()
	})

	it('refuses a session without a list', () => {
		expect(policy.rule(args(null, [del(geoB)]))).toEqual({
			reason: 'Needs tl:shape:delete:geo',
			ids: ['shape:geoB'],
		})
	})

	it('runs its rules after the grant checks, in order', () => {
		const calls: string[] = []
		const withRules = createGrantsPolicy({
			rules: [
				() => (calls.push('first'), null),
				() => (calls.push('second'), { reason: 'second says no' }),
				() => (calls.push('third'), null),
			],
		})
		expect(withRules.rule(args([], [del(geoB)]))?.reason).toBe('Needs tl:shape:delete:geo')
		expect(calls).toEqual([])
		expect(withRules.rule(args(['tl:*'], [del(geoB)]))).toEqual({ reason: 'second says no' })
		expect(calls).toEqual(['first', 'second'])
	})

	it('has a ready-made default', () => {
		expect(defaultGrantsPolicy.rule(args(['tl:shape:*'], [del(geoB)]))).toBeNull()
		expect(defaultGrantsPolicy.rule(args(['tl:page:*'], [del(geoB)]))).not.toBeNull()
	})
})
