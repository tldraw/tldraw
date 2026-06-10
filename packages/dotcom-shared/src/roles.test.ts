import { describe, expect, it } from 'vitest'
import { capabilities } from './capabilities'
import { can, isRole } from './roles'

describe('capabilities', () => {
	it('is the expected set, with no duplicates', () => {
		expect([...capabilities]).toEqual([
			'accessFiles',
			'addFiles',
			'removeFiles',
			'manageInvites',
			'editGroup',
			'editMembers',
			'deleteGroup',
		])
		expect(new Set(capabilities).size).toBe(capabilities.length)
	})
})

describe('can', () => {
	it('grants owners every capability', () => {
		for (const capability of capabilities) {
			expect(can('owner', capability)).toBe(true)
		}
	})

	it('grants admins the non-administrative capabilities only', () => {
		const adminCapabilities = capabilities.filter((capability) => can('admin', capability))
		expect(adminCapabilities).toEqual(['accessFiles', 'addFiles', 'removeFiles', 'manageInvites'])
	})

	it('denies admins the administrative capabilities', () => {
		expect(can('admin', 'editGroup')).toBe(false)
		expect(can('admin', 'editMembers')).toBe(false)
		expect(can('admin', 'deleteGroup')).toBe(false)
	})

	it("admins' capabilities are a subset of owners'", () => {
		for (const capability of capabilities) {
			if (can('admin', capability)) {
				expect(can('owner', capability)).toBe(true)
			}
		}
	})

	it('denies unknown, empty, or missing roles every capability', () => {
		// `member` is included deliberately: the rename from `admin` is still
		// pending, so it is not yet a valid role.
		const notRoles = [null, undefined, '', 'member', 'nope', 'OWNER', 'toString', '__proto__']
		for (const role of notRoles) {
			for (const capability of capabilities) {
				expect(can(role, capability)).toBe(false)
			}
		}
	})
})

describe('isRole', () => {
	it('accepts known role strings', () => {
		expect(isRole('owner')).toBe(true)
		expect(isRole('admin')).toBe(true)
	})

	it('rejects unknown, empty, or missing values', () => {
		for (const value of [null, undefined, '', 'member', 'nope', 'toString', '__proto__']) {
			expect(isRole(value)).toBe(false)
		}
	})
})
