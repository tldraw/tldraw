import type { TLPermissionGrant } from '@tldraw/tlschema'
import {
	createPermissionPolicy,
	getRequiredPermission,
	isPermitted,
	isChangePermitted,
	TL_PERMISSIONS,
} from './permissions'

const record = (typeName: string) => ({ id: `${typeName}:1`, typeName })
const create = (typeName: string) =>
	({ type: 'create', prev: null, next: record(typeName) }) as const
const update = (typeName: string) =>
	({ type: 'update', prev: record(typeName), next: record(typeName) }) as const
const del = (typeName: string) => ({ type: 'delete', prev: record(typeName), next: null }) as const

describe('isPermitted', () => {
	it('matches a permission by name', () => {
		expect(isPermitted(['tl:shape:create'], 'tl:shape:create')).toBe(true)
		expect(isPermitted(['tl:shape:create'], 'tl:shape:delete')).toBe(false)
		expect(isPermitted([], 'tl:shape:create')).toBe(false)
	})

	it('lets a trailing :* cover everything under its prefix', () => {
		expect(isPermitted(['tl:shape:*'], 'tl:shape:delete')).toBe(true)
		expect(isPermitted(['tl:shape:*'], 'tl:page:delete')).toBe(false)
		expect(TL_PERMISSIONS.every((p) => isPermitted(['tl:*'], p))).toBe(true)
	})

	it('does not treat a prefix without :* as a wildcard', () => {
		expect(isPermitted(['tl:shape'], 'tl:shape:create')).toBe(false)
		expect(isPermitted(['tl:shape:*'], 'tl:shapes:create')).toBe(false)
	})

	it('keeps host names apart from the tl ones', () => {
		expect(isPermitted(['tl:*'], 'app:grants:manage')).toBe(false)
		expect(isPermitted(['app:*'], 'app:grants:manage')).toBe(true)
	})
})

describe('getRequiredPermission', () => {
	it('maps every change to its permission', () => {
		expect(
			['shape', 'page', 'binding', 'asset', 'document'].map((typeName) => [
				typeName,
				getRequiredPermission(create(typeName)),
				getRequiredPermission(update(typeName)),
				getRequiredPermission(del(typeName)),
			])
		).toEqual([
			['shape', 'tl:shape:create', 'tl:shape:update', 'tl:shape:delete'],
			['page', 'tl:page:create', 'tl:page:update', 'tl:page:delete'],
			['binding', 'tl:shape:update', 'tl:shape:update', 'tl:shape:update'],
			['asset', 'tl:shape:create', null, null],
			['document', null, null, null],
		])
	})
})

describe('isChangePermitted', () => {
	it('needs the permission the change maps to', () => {
		expect(isChangePermitted(['tl:shape:create'], del('shape'))).toBe(false)
		expect(isChangePermitted(['tl:shape:*'], del('shape'))).toBe(true)
	})

	it('allows records no permission covers', () => {
		expect(isChangePermitted([], update('document'))).toBe(true)
		expect(isChangePermitted([], update('shape'))).toBe(false)
	})
})

describe('permissions not in use', () => {
	it('grant nothing to a rule, so a forgotten list fails closed', () => {
		expect(isPermitted(null, 'tl:shape:create')).toBe(false)
		expect(isChangePermitted(null, create('shape'))).toBe(false)
		// a change no permission covers is still allowed
		expect(isChangePermitted(null, create('document'))).toBe(true)
	})
})

describe('createPermissionPolicy', () => {
	it('reads the granted list on every call', () => {
		let granted: TLPermissionGrant[] = []
		const policy = createPermissionPolicy(() => granted)

		expect(policy.isPermitted('tl:page:create')).toBe(false)
		expect(policy.isChangePermitted(create('page'))).toBe(false)

		granted = ['tl:page:create']
		expect(policy.isPermitted('tl:page:create')).toBe(true)
		expect(policy.isChangePermitted(create('page'))).toBe(true)
		expect(policy.isChangePermitted(del('page'))).toBe(false)
	})

	it("reads the editor's session permissions by default", () => {
		let granted: TLPermissionGrant[] = ['tl:page:*']
		const editor = { getPermissions: () => granted }
		const policy = createPermissionPolicy()

		expect(policy.isPermitted('tl:page:create', editor)).toBe(true)
		expect(policy.isChangePermitted(create('shape'), editor)).toBe(false)
		granted = ['tl:shape:*']
		expect(policy.isPermitted('tl:page:create', editor)).toBe(false)
		expect(policy.isChangePermitted(create('shape'), editor)).toBe(true)
		// no editor, nothing granted
		expect(policy.isPermitted('tl:shape:create')).toBe(false)
	})
})

describe('record types of your own', () => {
	const types = { sticker: 'stickers:edit' }

	it('are not judged without an entry', () => {
		expect(isChangePermitted(['tl:shape:*'], update('sticker'))).toBe(true)
		expect(isChangePermitted(['tl:shape:*'], update('sticker'), types)).toBe(false)
		expect(isChangePermitted(['stickers:edit'], create('sticker'), types)).toBe(true)
	})

	it('cover every kind of write', () => {
		for (const change of [create('sticker'), update('sticker'), del('sticker')]) {
			expect(getRequiredPermission(change, types)).toBe('stickers:edit')
		}
	})

	it('win over the built-in mapping', () => {
		expect(getRequiredPermission(update('binding'), { binding: 'arrows:edit' })).toBe('arrows:edit')
	})

	it('reach createPermissionPolicy', () => {
		const policy = createPermissionPolicy(() => ['tl:shape:*'], { types })
		expect(policy.isChangePermitted(update('sticker'))).toBe(false)
		expect(policy.isChangePermitted(update('shape'))).toBe(true)
	})
})
