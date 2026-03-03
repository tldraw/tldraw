import {
	TLGeoShape,
	TLIdentityProvider,
	TLNoteShape,
	createShapeId,
	toRichText,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

const ids = {
	box1: createShapeId('box1'),
	note1: createShapeId('note1'),
}

describe('shape attribution (tlmeta)', () => {
	it('sets createdBy and updatedBy on createShapes', () => {
		const userId = editor.user.getId()
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const shape = editor.getShape<TLGeoShape>(ids.box1)!
		expect(shape.tlmeta.createdBy).toBe(userId)
		expect(shape.tlmeta.updatedBy).toBe(userId)
		expect(shape.tlmeta.createdAt).toBeGreaterThan(0)
		expect(shape.tlmeta.updatedAt).toBeGreaterThan(0)
	})

	it('updates updatedBy but preserves createdBy on updateShapes', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const created = editor.getShape<TLGeoShape>(ids.box1)!

		editor.updateShape({ id: ids.box1, type: 'geo', x: 50 })
		const updated = editor.getShape<TLGeoShape>(ids.box1)!

		expect(updated.tlmeta.createdBy).toBe(created.tlmeta.createdBy)
		expect(updated.tlmeta.createdAt).toBe(created.tlmeta.createdAt)
		expect(updated.tlmeta.updatedBy).toBe(editor.user.getId())
		expect(updated.tlmeta.updatedAt).toBeGreaterThanOrEqual(created.tlmeta.updatedAt!)
	})

	it('preserves explicit tlmeta in partial on create', () => {
		const customTlmeta = {
			createdBy: 'custom-user',
			updatedBy: 'custom-user',
			createdAt: 1000,
			updatedAt: 1000,
		}
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0, tlmeta: customTlmeta }])
		const shape = editor.getShape<TLGeoShape>(ids.box1)!
		expect(shape.tlmeta).toEqual(customTlmeta)
	})

	it('preserves explicit tlmeta in partial on update', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const customTlmeta = {
			createdBy: 'someone-else',
			updatedBy: 'someone-else',
			createdAt: 2000,
			updatedAt: 2000,
		}
		editor.updateShape({ id: ids.box1, type: 'geo', x: 50, tlmeta: customTlmeta })
		const shape = editor.getShape<TLGeoShape>(ids.box1)!
		expect(shape.tlmeta).toEqual(customTlmeta)
	})
})

describe('getAttributionDisplayName', () => {
	it('returns current user name for own userId', () => {
		const userId = editor.user.getId()
		const name = editor.getAttributionDisplayName(userId)
		expect(name).toBe(editor.user.getName())
	})

	it('returns null for unknown userId', () => {
		const name = editor.getAttributionDisplayName('unknown-user-123')
		expect(name).toBeNull()
	})
})

describe('note shape textLastEditedBy', () => {
	it('sets textLastEditedBy when richText changes', () => {
		editor.createShapes([
			{
				id: ids.note1,
				type: 'note',
				x: 0,
				y: 0,
			},
		])

		const userId = editor.user.getId()

		editor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { richText: toRichText('Hello') },
		})

		const note = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note.props.textLastEditedBy).toBe(userId)
	})

	it('does not set textLastEditedBy when only position changes', () => {
		editor.createShapes([
			{
				id: ids.note1,
				type: 'note',
				x: 0,
				y: 0,
			},
		])

		editor.updateShape({ id: ids.note1, type: 'note', x: 100 })

		const note = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note.props.textLastEditedBy).toBeNull()
	})

	it('does not set textLastEditedBy when color changes', () => {
		editor.createShapes([
			{
				id: ids.note1,
				type: 'note',
				x: 0,
				y: 0,
			},
		])

		editor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { color: 'red' },
		})

		const note = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note.props.textLastEditedBy).toBeNull()
	})
})

describe('TLIdentityProvider', () => {
	it('uses custom identity provider for attribution userId', () => {
		const customIdentity: TLIdentityProvider = {
			getCurrentUser: () => ({ id: 'auth-user-42', name: 'Alice' }),
			resolveUser: (userId) => (userId === 'auth-user-42' ? { id: userId, name: 'Alice' } : null),
		}
		const customEditor = new TestEditor({ identity: customIdentity })

		customEditor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const shape = customEditor.getShape<TLGeoShape>(ids.box1)!

		expect(shape.tlmeta.createdBy).toBe('auth-user-42')
		expect(shape.tlmeta.updatedBy).toBe('auth-user-42')
		customEditor.dispose()
	})

	it('uses custom identity provider for display name resolution', () => {
		const customIdentity: TLIdentityProvider = {
			getCurrentUser: () => ({ id: 'user-1', name: 'Alice' }),
			resolveUser: (userId) => {
				if (userId === 'user-1') return { id: userId, name: 'Alice' }
				if (userId === 'user-2') return { id: userId, name: 'Bob' }
				return null
			},
		}
		const customEditor = new TestEditor({ identity: customIdentity })

		expect(customEditor.getAttributionDisplayName('user-1')).toBe('Alice')
		expect(customEditor.getAttributionDisplayName('user-2')).toBe('Bob')
		expect(customEditor.getAttributionDisplayName('user-unknown')).toBeNull()
		customEditor.dispose()
	})

	it('falls back to default identity when none provided', () => {
		// Default editor — no custom identity
		const userId = editor.user.getId()
		expect(editor.getAttributionUserId()).toBe(userId)
		expect(editor.getAttributionDisplayName(userId)).toBe(editor.user.getName())
	})

	it('exposes identity provider on editor', () => {
		const customIdentity: TLIdentityProvider = {
			getCurrentUser: () => ({ id: 'test', name: 'Test' }),
			resolveUser: () => null,
		}
		const customEditor = new TestEditor({ identity: customIdentity })

		expect(customEditor.getIdentity()).toBe(customIdentity)
		expect(customEditor.getIdentity().getCurrentUser()).toEqual({ id: 'test', name: 'Test' })
		customEditor.dispose()
	})

	it('default identity resolves current user via preferences', () => {
		const user = editor.getIdentity().getCurrentUser()
		expect(user).not.toBeNull()
		expect(user!.id).toBe(editor.user.getId())
		expect(user!.name).toBe(editor.user.getName())
	})
})
