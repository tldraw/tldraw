import {
	Atom,
	TLNoteShape,
	TLUser,
	UserRecordType,
	atom,
	computed,
	createShapeId,
	createUserId,
	toRichText,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

// Build an editor whose current user can be switched between Alice (user-1) and Bob (user-2),
// so we can assert who a note's attribution is stamped to across edits, duplication, and paste.
function makeMultiUserEditor(currentUser: Atom<TLUser>) {
	const alice = UserRecordType.create({ id: createUserId('user-1'), name: 'Alice' })
	const bob = UserRecordType.create({ id: createUserId('user-2'), name: 'Bob' })
	return new TestEditor(
		{},
		{
			users: {
				currentUser,
				resolve: (userId) =>
					computed('resolve-' + userId, () => {
						if (userId === 'user-1') return alice
						if (userId === 'user-2') return bob
						return null
					}),
			},
		}
	)
}

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
		const userId = editor.user.getExternalId()
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

		const userId = editor.user.getExternalId()

		editor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { richText: toRichText('Hello') },
		})

		const note = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note.props.textLastEditedBy).toBe(userId)
	})

	it('updates textLastEditedBy to the most recent editor', () => {
		const alice = UserRecordType.create({ id: createUserId('user-1'), name: 'Alice' })
		const bob = UserRecordType.create({ id: createUserId('user-2'), name: 'Bob' })
		const currentUser = atom('currentUser', alice)
		const customEditor = new TestEditor(
			{},
			{
				users: {
					currentUser,
					resolve: (userId) =>
						computed('resolve-' + userId, () => {
							if (userId === 'user-1') return alice
							if (userId === 'user-2') return bob
							return null
						}),
				},
			}
		)

		customEditor.createShapes([{ id: ids.note1, type: 'note', x: 0, y: 0 }])

		// Alice edits the note first
		customEditor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { richText: toRichText('Hello') },
		})
		expect(customEditor.getShape<TLNoteShape>(ids.note1)!.props.textLastEditedBy).toBe('user-1')

		// Bob edits the note next — the latest editor wins
		currentUser.set(bob)
		customEditor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { richText: toRichText('Hello world') },
		})
		expect(customEditor.getShape<TLNoteShape>(ids.note1)!.props.textLastEditedBy).toBe('user-2')

		customEditor.dispose()
	})

	it('resets textLastEditedBy to null when text is deleted', () => {
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
		expect(note1.props.textLastEditedBy).not.toBeNull()

		editor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { richText: toRichText('') },
		})

		const note2 = editor.getShape<TLNoteShape>(ids.note1)!
		expect(note2.props.textLastEditedBy).toBeNull()
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
		const userId = editor.user.getExternalId()
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

describe('note attribution on duplicate', () => {
	it('re-stamps attribution to the current user when duplicating a note with text', () => {
		const alice = UserRecordType.create({ id: createUserId('user-1'), name: 'Alice' })
		const bob = UserRecordType.create({ id: createUserId('user-2'), name: 'Bob' })
		const currentUser = atom<TLUser>('currentUser', bob)
		const customEditor = makeMultiUserEditor(currentUser)

		// Bob authors the note
		customEditor.createShapes([{ id: ids.note1, type: 'note', x: 0, y: 0 }])
		customEditor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { richText: toRichText('Hello') },
		})
		expect(customEditor.getShape<TLNoteShape>(ids.note1)!.props.textLastEditedBy).toBe('user-2')

		// Alice duplicates it — the copy is attributed to Alice, the original stays Bob's
		currentUser.set(alice)
		customEditor.duplicateShapes([ids.note1])

		const dupId = customEditor.getSelectedShapeIds()[0]
		expect(dupId).not.toBe(ids.note1)
		expect(customEditor.getShape<TLNoteShape>(dupId)!.props.textLastEditedBy).toBe('user-1')
		expect(customEditor.getShape<TLNoteShape>(ids.note1)!.props.textLastEditedBy).toBe('user-2')

		customEditor.dispose()
	})

	it('keeps attribution null when duplicating an empty note', () => {
		editor.createShapes([{ id: ids.note1, type: 'note', x: 0, y: 0 }])
		editor.duplicateShapes([ids.note1])

		const dupId = editor.getSelectedShapeIds()[0]
		expect(dupId).not.toBe(ids.note1)
		expect(editor.getShape<TLNoteShape>(dupId)!.props.textLastEditedBy).toBeNull()
	})

	it('re-stamps attribution to the current user when pasting a note with text', () => {
		const alice = UserRecordType.create({ id: createUserId('user-1'), name: 'Alice' })
		const bob = UserRecordType.create({ id: createUserId('user-2'), name: 'Bob' })
		const currentUser = atom<TLUser>('currentUser', bob)
		const customEditor = makeMultiUserEditor(currentUser)

		// Bob authors the note
		customEditor.createShapes([{ id: ids.note1, type: 'note', x: 0, y: 0 }])
		customEditor.updateShape<TLNoteShape>({
			id: ids.note1,
			type: 'note',
			props: { richText: toRichText('Hello') },
		})

		// Alice copies and pastes it — the pasted copy is attributed to Alice
		const content = customEditor.getContentFromCurrentPage([ids.note1])!
		currentUser.set(alice)
		customEditor.selectNone()
		customEditor.putContentOntoCurrentPage(content, { select: true })

		const pastedId = customEditor.getSelectedShapeIds()[0]
		expect(pastedId).not.toBe(ids.note1)
		expect(customEditor.getShape<TLNoteShape>(pastedId)!.props.textLastEditedBy).toBe('user-1')
		expect(customEditor.getShape<TLNoteShape>(ids.note1)!.props.textLastEditedBy).toBe('user-2')

		customEditor.dispose()
	})
})
