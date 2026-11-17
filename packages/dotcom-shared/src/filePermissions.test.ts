import { describe, expect, it } from 'vitest'
import { getFileAccess, getFilePermissions, getFileUpdatePermissions } from './filePermissions'

const file = (shared: boolean, sharedLinkType = 'edit') => ({ shared, sharedLinkType })

describe('getFileAccess', () => {
	it('gives members access whatever the link says', () => {
		expect(getFileAccess(file(false), 'member')).toBe('member')
		expect(getFileAccess(file(true, 'view'), 'owner')).toBe('member')
	})

	it('gives guests the link type, failing closed on legacy values', () => {
		expect(getFileAccess(file(true, 'edit'), null)).toBe('editor')
		expect(getFileAccess(file(true, 'view'), null)).toBe('viewer')
		expect(getFileAccess(file(true, 'legacy-something'), null)).toBe('viewer')
		expect(getFileAccess(file(false), null)).toBe('none')
	})
})

describe('getFilePermissions', () => {
	it('gives file settings to members only', () => {
		expect(getFilePermissions('member', true)).toContain('file:share')
		expect(getFilePermissions('editor', true)).not.toContain('file:share')
		expect(getFilePermissions('editor', true)).toContain('tl:shape:edit')
	})

	it('gives comments only to signed-in users, and viewers nothing', () => {
		expect(getFilePermissions('editor', false)).not.toContain('tl:comment:create')
		expect(getFilePermissions('editor', true)).toContain('tl:comment:create')
		expect(getFilePermissions('viewer', true)).toEqual([])
	})
})

describe('getFileUpdatePermissions', () => {
	it('maps each changed column to its permission', () => {
		expect(getFileUpdatePermissions({ id: 'f', name: 'x' })).toEqual(['file:rename'])
		expect(getFileUpdatePermissions({ id: 'f', shared: true, sharedLinkType: 'view' })).toEqual([
			'file:share',
		])
		expect(getFileUpdatePermissions({ id: 'f', published: true, name: 'x' })).toEqual([
			'file:publish',
			'file:rename',
		])
	})
})
