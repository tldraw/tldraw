import {
	TLGeoShape,
	TLNoteShape,
	createShapeId,
	getTldrawMetaFromShapeMeta,
	tldrawShapeMetaKey,
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

describe('shape attribution (meta.__tldraw)', () => {
	it('sets createdBy and updatedBy as user ID strings on createShapes', () => {
		const userId = editor.user.getId()
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const shape = editor.getShape<TLGeoShape>(ids.box1)!
		const tlmeta = getTldrawMetaFromShapeMeta(shape.meta)
		expect(tlmeta.createdBy).toBe(userId)
		expect(tlmeta.updatedBy).toBe(userId)
		expect(tlmeta.createdAt).toBeGreaterThan(0)
		expect(tlmeta.updatedAt).toBeGreaterThan(0)
	})

	it('updates updatedBy but preserves createdBy on updateShapes', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const created = editor.getShape<TLGeoShape>(ids.box1)!

		editor.updateShape({ id: ids.box1, type: 'geo', x: 50 })
		const updated = editor.getShape<TLGeoShape>(ids.box1)!
		const createdTlmeta = getTldrawMetaFromShapeMeta(created.meta)
		const updatedTlmeta = getTldrawMetaFromShapeMeta(updated.meta)

		expect(updatedTlmeta.createdBy).toEqual(createdTlmeta.createdBy)
		expect(updatedTlmeta.createdAt).toBe(createdTlmeta.createdAt)
		expect(updatedTlmeta.updatedBy).toBe(editor.user.getId())
		expect(updatedTlmeta.updatedAt).toBeGreaterThanOrEqual(createdTlmeta.updatedAt!)
	})

	it('preserves explicit meta.__tldraw in partial on create', () => {
		const customTlmeta = {
			createdBy: 'custom-user',
			updatedBy: 'custom-user',
			createdAt: 1000,
			updatedAt: 1000,
		}
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 0,
				y: 0,
				meta: { [tldrawShapeMetaKey]: customTlmeta },
			},
		])
		const shape = editor.getShape<TLGeoShape>(ids.box1)!
		expect(getTldrawMetaFromShapeMeta(shape.meta)).toEqual(customTlmeta)
	})

	it('ignores explicit meta.__tldraw in partial on update', () => {
		editor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const created = editor.getShape<TLGeoShape>(ids.box1)!
		const customTlmeta = {
			createdBy: 'someone-else',
			updatedBy: 'someone-else',
			createdAt: 2000,
			updatedAt: 2000,
		}
		editor.updateShape({
			id: ids.box1,
			type: 'geo',
			x: 50,
			meta: { [tldrawShapeMetaKey]: customTlmeta },
		})
		const shape = editor.getShape<TLGeoShape>(ids.box1)!
		const createdTlmeta = getTldrawMetaFromShapeMeta(created.meta)
		const shapeTlmeta = getTldrawMetaFromShapeMeta(shape.meta)
		expect(shapeTlmeta.createdBy).toEqual(createdTlmeta.createdBy)
		expect(shapeTlmeta.createdAt).toBe(createdTlmeta.createdAt)
		expect(shapeTlmeta.updatedBy).toBe(editor.user.getId())
		expect(shapeTlmeta.updatedAt).toBeGreaterThanOrEqual(createdTlmeta.updatedAt!)
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

	it('returns null for null input', () => {
		expect(editor.getAttributionDisplayName(null)).toBeNull()
	})
})

describe('note shape textLastEditedBy', () => {
	it('sets textLastEditedBy as user ID string when richText changes', () => {
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

describe('TLUserStore', () => {
	it('uses custom user store for attribution', () => {
		const customEditor = new TestEditor(
			{},
			{
				users: {
					getCurrentUser: () => ({ id: 'auth-user-42', name: 'Alice', meta: {} }),
					resolve: (userId) =>
						userId === 'auth-user-42' ? { id: userId, name: 'Alice', meta: {} } : null,
				},
			}
		)

		customEditor.createShapes([{ id: ids.box1, type: 'geo', x: 0, y: 0 }])
		const shape = customEditor.getShape<TLGeoShape>(ids.box1)!

		const tlmeta = getTldrawMetaFromShapeMeta(shape.meta)
		expect(tlmeta.createdBy).toBe('auth-user-42')
		expect(tlmeta.updatedBy).toBe('auth-user-42')
		customEditor.dispose()
	})

	it('uses custom user store for display name resolution', () => {
		const customEditor = new TestEditor(
			{},
			{
				users: {
					getCurrentUser: () => ({ id: 'user-1', name: 'Alice', meta: {} }),
					resolve: (userId) => {
						if (userId === 'user-1') return { id: userId, name: 'Alice', meta: {} }
						if (userId === 'user-2') return { id: userId, name: 'Bob', meta: {} }
						return null
					},
				},
			}
		)

		expect(customEditor.getAttributionDisplayName('user-1')).toBe('Alice')
		expect(customEditor.getAttributionDisplayName('user-2')).toBe('Bob')
		expect(customEditor.getAttributionDisplayName('user-unknown')).toBeNull()
		customEditor.dispose()
	})

	it('falls back to default user store when none provided', () => {
		const userId = editor.user.getId()
		expect(editor.getAttributionUserId()).toBe(userId)
		expect(editor.getAttributionDisplayName(userId)).toBe(editor.user.getName())
	})

	it('returns null userId when user store has no current user', () => {
		const customEditor = new TestEditor(
			{},
			{
				users: {
					getCurrentUser: () => null,
				},
			}
		)

		expect(customEditor.getAttributionUserId()).toBeNull()
		customEditor.dispose()
	})
})
