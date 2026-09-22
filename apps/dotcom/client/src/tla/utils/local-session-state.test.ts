import { getFromLocalStorage } from 'tldraw'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	clearLastVisitedFile,
	getLastVisitedFileId,
	getLocalSessionState,
	resetLocalSessionStateButKeepTheme,
	setLastVisitedFile,
} from './local-session-state'

describe('last visited file cache', () => {
	beforeEach(() => {
		clearLastVisitedFile()
	})

	it('returns null when nothing is cached', () => {
		expect(getLastVisitedFileId('user-a')).toBeNull()
	})

	it('returns the cached id for the user that wrote it', () => {
		setLastVisitedFile('user-a', 'file-1')
		expect(getLastVisitedFileId('user-a')).toBe('file-1')
	})

	it("never hands one account another account's file", () => {
		setLastVisitedFile('user-a', 'file-1')
		expect(getLastVisitedFileId('user-b')).toBeNull()
	})

	it('overwrites on the next visit', () => {
		setLastVisitedFile('user-a', 'file-1')
		setLastVisitedFile('user-a', 'file-2')
		expect(getLastVisitedFileId('user-a')).toBe('file-2')
	})

	it('persists to local storage', () => {
		setLastVisitedFile('user-a', 'file-1')
		const stored = JSON.parse(getFromLocalStorage('tldrawapp_session_3')!)
		expect(stored.lastVisitedFile).toEqual({ userId: 'user-a', fileId: 'file-1' })
	})

	it('is dropped by the sign-out reset', () => {
		setLastVisitedFile('user-a', 'file-1')
		resetLocalSessionStateButKeepTheme()
		expect(getLastVisitedFileId('user-a')).toBeNull()
		expect(getLocalSessionState().lastVisitedFile).toBeUndefined()
	})
})
