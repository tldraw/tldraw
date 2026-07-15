import { describe, expect, it } from 'vitest'
import { computeFileAccess } from './fileAccess'

describe('computeFileAccess', () => {
	it('gives owners/group members full access on both lanes, regardless of tier', () => {
		for (const sharedLinkType of ['edit', 'comment', 'view']) {
			expect(
				computeFileAccess({ sharedLinkType, hasOwnerAccess: true, isAuthenticated: true })
			).toEqual({ isReadonly: false, objectAccess: 'write' })
		}
	})

	it('lets an authenticated editor guest edit the canvas and comment', () => {
		expect(
			computeFileAccess({ sharedLinkType: 'edit', hasOwnerAccess: false, isAuthenticated: true })
		).toEqual({ isReadonly: false, objectAccess: 'write' })
	})

	it('lets an authenticated commenter guest comment but not edit the canvas', () => {
		expect(
			computeFileAccess({ sharedLinkType: 'comment', hasOwnerAccess: false, isAuthenticated: true })
		).toEqual({ isReadonly: true, objectAccess: 'write' })
	})

	it('makes a viewer guest read-only on both lanes', () => {
		expect(
			computeFileAccess({ sharedLinkType: 'view', hasOwnerAccess: false, isAuthenticated: true })
		).toEqual({ isReadonly: true, objectAccess: 'read' })
	})

	it('denies comment writes to anonymous guests even on comment/edit tiers', () => {
		// Comment authors need a user row (Postgres FK), so an anonymous session can never comment.
		expect(
			computeFileAccess({
				sharedLinkType: 'comment',
				hasOwnerAccess: false,
				isAuthenticated: false,
			})
		).toEqual({ isReadonly: true, objectAccess: 'read' })
		// An anonymous editor can still edit the canvas, but not comment.
		expect(
			computeFileAccess({ sharedLinkType: 'edit', hasOwnerAccess: false, isAuthenticated: false })
		).toEqual({ isReadonly: false, objectAccess: 'read' })
	})
})
