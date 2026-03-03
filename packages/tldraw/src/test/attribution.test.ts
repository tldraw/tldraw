import { TLGeoShape, TLNoteShape, createShapeId, toRichText } from '@tldraw/editor'
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
