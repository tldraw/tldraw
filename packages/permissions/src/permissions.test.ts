import {
	createPermissionPolicy,
	getRequiredPermission,
	hasPermission,
	judgeChange,
	TL_PERMISSIONS,
	TLPermissionGrant,
} from './permissions'

const record = (typeName: string) => ({ id: `${typeName}:1`, typeName })
const create = (typeName: string) =>
	({ type: 'create', prev: null, next: record(typeName) }) as const
const update = (typeName: string) =>
	({ type: 'update', prev: record(typeName), next: record(typeName) }) as const
const del = (typeName: string) => ({ type: 'delete', prev: record(typeName), next: null }) as const

describe('hasPermission', () => {
	it('matches a permission by name', () => {
		expect(hasPermission(['tl:shape:create'], 'tl:shape:create')).toBe(true)
		expect(hasPermission(['tl:shape:create'], 'tl:shape:delete')).toBe(false)
		expect(hasPermission([], 'tl:shape:create')).toBe(false)
	})

	it('lets a trailing :* cover everything under its prefix', () => {
		expect(hasPermission(['tl:shape:*'], 'tl:shape:delete')).toBe(true)
		expect(hasPermission(['tl:shape:*'], 'tl:page:delete')).toBe(false)
		expect(TL_PERMISSIONS.every((p) => hasPermission(['tl:*'], p))).toBe(true)
	})

	it('does not treat a prefix without :* as a wildcard', () => {
		expect(hasPermission(['tl:shape'], 'tl:shape:create')).toBe(false)
		expect(hasPermission(['tl:shape:*'], 'tl:shapes:create')).toBe(false)
	})

	it('keeps host names apart from the tl ones', () => {
		expect(hasPermission(['tl:*'], 'app:grants:manage')).toBe(false)
		expect(hasPermission(['app:*'], 'app:grants:manage')).toBe(true)
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

describe('judgeChange', () => {
	it('says which permission is missing', () => {
		expect(judgeChange(['tl:shape:create'], del('shape'))).toBe('Needs tl:shape:delete')
		expect(judgeChange(['tl:shape:*'], del('shape'))).toBe(null)
	})

	it('allows records no permission covers', () => {
		expect(judgeChange([], update('document'))).toBe(null)
	})
})

describe('createPermissionPolicy', () => {
	it('reads the granted list on every call', () => {
		let granted: TLPermissionGrant[] = []
		const policy = createPermissionPolicy(() => granted)

		expect(policy.can('tl:page:create')).toBe(false)
		expect(policy.canChangeRecord(create('page'))).toBe(false)

		granted = ['tl:page:create']
		expect(policy.can('tl:page:create')).toBe(true)
		expect(policy.canChangeRecord(create('page'))).toBe(true)
		expect(policy.canChangeRecord(del('page'))).toBe(false)
	})
})
