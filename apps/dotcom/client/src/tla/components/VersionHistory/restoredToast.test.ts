import { describe, expect, it, vi } from 'vitest'
import { buildRestoredToast } from './restoredToast'

const event = {
	type: 'file_restored' as const,
	restoreId: 'r1',
	restoredFrom: '2026-10-01T10:00:00.000Z',
	preRestoreTs: '2026-10-29T10:00:00.000Z',
	byUserId: 'u1',
	byName: 'Mitja',
}

describe('buildRestoredToast', () => {
	it('toast has undo action calling restore with undoes', () => {
		const undo = vi.fn()
		const toast = buildRestoredToast(event, { title: 'T', undoLabel: 'Undo', onUndo: undo })
		expect(toast).toMatchObject({ id: 'file-restored-r1', title: 'T' })
		toast.actions![0].onClick()
		expect(undo).toHaveBeenCalledWith({ timestamp: event.preRestoreTs, undoes: 'r1' })
	})

	it('no undo action without preRestoreTs', () => {
		const toast = buildRestoredToast(
			{ ...event, preRestoreTs: null },
			{ title: 'T', undoLabel: 'Undo', onUndo: vi.fn() }
		)
		expect(toast.actions).toBeUndefined()
	})
})
