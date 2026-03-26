import {
	TLNoteShape,
	UserRecordType,
	computed,
	createShapeId,
	createUserId,
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

describe('note shape textFirstEditedBy', () => {
	it('sets textFirstEditedBy as user ID string when richText changes', () => {
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
		expect(note.props.textFirstEditedBy).toBe(userId)
	})

	it('does not overwrite textFirstEditedBy on subsequent edits', () => {
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

		const note1 = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note1.props.textFirstEditedBy).toBe(userId)

		editor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { richText: toRichText('Hello world') },
		})

		const note2 = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note2.props.textFirstEditedBy).toBe(userId)
	})

	it('resets textFirstEditedBy to null when text is deleted', () => {
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
			props: { richText: toRichText('Hello') },
		})

		const note1 = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note1.props.textFirstEditedBy).not.toBeNull()

		editor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { richText: toRichText('') },
		})

		const note2 = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note2.props.textFirstEditedBy).toBeNull()
	})

	it('does not set textFirstEditedBy when only position changes', () => {
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
		expect(note.props.textFirstEditedBy).toBeNull()
	})

	it('does not set textFirstEditedBy when color changes', () => {
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
		expect(note.props.textFirstEditedBy).toBeNull()
	})
})

describe('TLUserStore', () => {
	it('uses custom user store for display name resolution', () => {
		const alice = UserRecordType.create({ id: createUserId('user-1'), name: 'Alice' })
		const bob = UserRecordType.create({ id: createUserId('user-2'), name: 'Bob' })
		const customEditor = new TestEditor(
			{},
			{
				users: {
					currentUser: computed('currentUser', () => alice),
					resolve: (userId) =>
						computed('resolve-' + userId, () => {
							if (userId === 'user-1') return alice
							if (userId === 'user-2') return bob
							return null
						}),
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
					currentUser: computed('currentUser', () => null),
				},
			}
		)

		expect(customEditor.getAttributionUserId()).toBeNull()
		customEditor.dispose()
	})
})
