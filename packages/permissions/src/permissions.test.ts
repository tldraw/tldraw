import { atom, computed, react } from '@tldraw/state'
import {
	PageRecordType,
	TLBinding,
	TLDOCUMENT_ID,
	TLPage,
	TLRecord,
	TLRecordChange,
	TLShape,
	TLAuthorize,
	TLWriteContext,
	bindAuthorizeCan,
	composeAuthorize,
	createBindingId,
	createShapeId,
} from '@tldraw/tlschema'
import { createPermissionStore, createPermissions } from './permissions'

const page = PageRecordType.create({
	id: PageRecordType.createId('p'),
	name: 'Page',
	index: 'a1' as any,
})

function shape(id: string): TLShape {
	return {
		id: createShapeId(id),
		typeName: 'shape',
		type: 'geo',
		parentId: page.id,
		index: 'a1',
		x: 0,
		y: 0,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		props: {},
		meta: {},
	} as unknown as TLShape
}

function binding(from: TLShape, to: TLShape): TLBinding {
	return {
		id: createBindingId('b'),
		typeName: 'binding',
		type: 'arrow',
		fromId: from.id,
		toId: to.id,
		props: {},
		meta: {},
	} as unknown as TLBinding
}

const create = (next: TLRecord): TLRecordChange => ({
	type: 'create',
	id: next.id,
	prev: null,
	next,
})
const update = (prev: TLRecord, next = prev): TLRecordChange => ({
	type: 'update',
	id: prev.id,
	prev,
	next,
})
const remove = (prev: TLRecord): TLRecordChange => ({
	type: 'delete',
	id: prev.id,
	prev,
	next: null,
})

// the context the room gives the write hook: ctx.can is the room's authorize.can
function ctx(
	authorize: TLAuthorize,
	userId: string | null,
	records: TLRecord[] = []
): TLWriteContext {
	const get = (id: string) => records.find((r) => r.id === id) as any
	return {
		userId,
		can: bindAuthorizeCan(authorize.can, { userId }),
		before: { get },
		after: { get },
	}
}

describe('createPermissionStore', () => {
	it('returns undefined until set, and copies what it is given', () => {
		const store = createPermissionStore()
		expect(store.get('alice').get()).toBeUndefined()
		const given = new Set(['tl:shape:create'])
		store.set('alice', given)
		given.add('tl:shape:delete')
		expect([...store.get('alice').get()!]).toEqual(['tl:shape:create'])
		store.delete('alice')
		expect(store.get('alice').get()).toBeUndefined()
	})

	it('is reactive', () => {
		const store = createPermissionStore()
		const seen: Array<number | undefined> = []
		const stop = react('watch', () => {
			seen.push(store.get('alice').get()?.size)
		})
		store.set('alice', ['a', 'b'])
		store.set('bob', ['a'])
		store.delete('alice')
		stop()
		expect(seen).toEqual([undefined, 2, undefined])
	})
})

describe('createPermissions', () => {
	it('can checks the permission name, and a user that is not loaded has none', () => {
		const { permissions } = createPermissions()
		expect(permissions.can('alice', 'tl:shape:create')).toBe(false)
		permissions.set('alice', ['tl:shape:create'])
		expect(permissions.can('alice', 'tl:shape:create')).toBe(true)
		expect(permissions.can('alice', 'tl:shape:edit', { shape: shape('a') })).toBe(false)
	})

	it('authorize.can checks the user in ctx', () => {
		const { permissions, authorize } = createPermissions()
		permissions.set('alice', ['tl:page:create'])
		expect(authorize.can!('tl:page:create', undefined, { userId: 'alice' })).toBe(true)
		expect(authorize.can!('tl:page:create', undefined, { userId: 'bob' })).toBe(false)
		expect(authorize.can!('tl:page:create', undefined, { userId: null })).toBe(false)
	})

	it('authorize.write refuses with the first missing permission', () => {
		const { permissions, authorize } = createPermissions()
		const write = authorize.write!
		permissions.set('alice', ['tl:shape:create'])
		const a = shape('a')

		expect(write([create(a)], ctx(authorize, 'alice'))).toBeNull()
		expect(write([update(a)], ctx(authorize, 'alice'))).toEqual({ reason: 'tl:shape:edit' })
		expect(write([remove(a)], ctx(authorize, 'alice'))).toEqual({ reason: 'tl:shape:delete' })
		expect(write([create(page)], ctx(authorize, 'alice'))).toEqual({ reason: 'tl:page:create' })
		expect(write([create(a)], ctx(authorize, null))).toEqual({ reason: 'tl:shape:create' })
	})

	it('authorize.write asks ctx.can, so a rule added to can applies to writes too', () => {
		const { permissions, authorize: base } = createPermissions()
		permissions.set('alice', ['tl:shape:create', 'tl:shape:edit'])
		// the app adds a rule: no one edits note shapes
		const authorize = composeAuthorize(base, {
			can: (permission, data) =>
				!(permission === 'tl:shape:edit' && data && 'shape' in data && data.shape.type === 'note'),
		})
		const geo = shape('a')
		const note = { ...shape('b'), type: 'note' } as TLShape
		expect(authorize.write!([update(geo)], ctx(authorize, 'alice'))).toBeNull()
		expect(authorize.write!([update(note)], ctx(authorize, 'alice'))).toEqual({
			reason: 'tl:shape:edit',
		})
	})

	it('maps pages and the document to page permissions', () => {
		const { permissions, authorize } = createPermissions()
		permissions.set('alice', ['tl:page:edit'])
		const doc = { id: TLDOCUMENT_ID, typeName: 'document', name: '', gridSize: 10, meta: {} } as any
		expect(authorize.write!([update(page as TLPage)], ctx(authorize, 'alice'))).toBeNull()
		expect(authorize.write!([update(doc)], ctx(authorize, 'alice'))).toBeNull()
		expect(authorize.write!([remove(page)], ctx(authorize, 'alice'))).toEqual({
			reason: 'tl:page:delete',
		})
	})

	it('judges a binding as an edit of the shape it starts from, unless that shape is created or deleted too', () => {
		const { permissions, authorize } = createPermissions()
		const from = shape('from')
		const to = shape('to')
		const b = binding(from, to)

		permissions.set('alice', ['tl:shape:create'])
		// a new arrow and its binding: only the create is judged
		expect(
			authorize.write!([create(from), create(b)], ctx(authorize, 'alice', [from, to]))
		).toBeNull()
		// binding an existing shape is an edit
		expect(authorize.write!([create(b)], ctx(authorize, 'alice', [from, to]))).toEqual({
			reason: 'tl:shape:edit',
		})

		permissions.set('alice', ['tl:shape:delete'])
		// deleting the arrow removes its binding as part of the delete
		expect(
			authorize.write!([remove(from), remove(b)], ctx(authorize, 'alice', [from, to]))
		).toBeNull()
	})

	it('leaves records it does not govern to other hooks', () => {
		const { authorize } = createPermissions()
		const comment = { id: 'comment:1', typeName: 'comment', meta: {} } as unknown as TLRecord
		expect(authorize.write!([create(comment)], ctx(authorize, 'alice'))).toBeNull()
	})

	it('takes its own source', () => {
		const role = atom('role', 'viewer')
		const source = {
			get: (_userId: string) =>
				computed('perms', () =>
					role.get() === 'editor' ? new Set(['tl:shape:create']) : new Set<string>()
				),
		}
		const { permissions, authorize } = createPermissions({ source })
		expect(permissions.can('x', 'tl:shape:create')).toBe(false)
		expect(permissions.get('x').get()).toEqual(new Set())
		role.set('editor')
		expect(authorize.can!('tl:shape:create', undefined, { userId: 'x' })).toBe(true)
	})
})
