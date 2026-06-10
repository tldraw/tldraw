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

	it('grants members the non-administrative capabilities only', () => {
		const memberCapabilities = capabilities.filter((capability) => can('member', capability))
		expect(memberCapabilities).toEqual(['accessFiles', 'addFiles', 'removeFiles', 'manageInvites'])
	})

	it('denies members the administrative capabilities', () => {
		expect(can('member', 'editGroup')).toBe(false)
		expect(can('member', 'editMembers')).toBe(false)
		expect(can('member', 'deleteGroup')).toBe(false)
	})

	it("members' capabilities are a subset of owners'", () => {
		for (const capability of capabilities) {
			if (can('member', capability)) {
				expect(can('owner', capability)).toBe(true)
			}
		}
	})

	it('denies unknown, empty, or missing roles every capability', () => {
		// `admin` is included deliberately: it was renamed to `member`, so it is no
		// longer a valid role.
		const notRoles = [null, undefined, '', 'admin', 'nope', 'OWNER', 'toString', '__proto__']
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
		expect(isRole('member')).toBe(true)
	})

	it('rejects unknown, empty, or missing values', () => {
		for (const value of [null, undefined, '', 'admin', 'nope', 'toString', '__proto__']) {
			expect(isRole(value)).toBe(false)
		}
	})
})
