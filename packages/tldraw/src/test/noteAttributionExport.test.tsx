import {
	TLNoteShape,
	TLUserStore,
	UserRecordType,
	computed,
	createShapeId,
	createUserId,
	toRichText,
} from '@tldraw/editor'
import { vi } from 'vitest'
import {
	DefaultNoteShapeAttribution,
	getNoteShapeAttributionComponent,
	setNoteShapeAttributionComponent,
} from '../lib/shapes/note/DefaultNoteShapeAttribution'
import { TestEditor } from './TestEditor'

vi.useRealTimers()

const noteId = createShapeId('note1')
const currentUser = UserRecordType.create({ id: createUserId('alice'), name: 'Alice Mertnet' })
const users: TLUserStore = {
	currentUser: computed('currentUser', () => currentUser),
	resolve: (userId) => computed('resolve', () => (userId === 'alice' ? currentUser : null)),
}

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({}, { users })
	editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0 }])
	editor.updateShape<TLNoteShape>({
		id: noteId,
		type: 'note',
		props: { richText: toRichText('Hello') },
	})
})

afterEach(() => {
	editor?.dispose()
})

describe('getNoteShapeAttributionComponent', () => {
	it('defaults to DefaultNoteShapeAttribution', () => {
		expect(getNoteShapeAttributionComponent(editor)).toBe(DefaultNoteShapeAttribution)
	})

	it('returns the stashed override', () => {
		const Custom = () => null
		setNoteShapeAttributionComponent(editor, Custom)
		expect(getNoteShapeAttributionComponent(editor)).toBe(Custom)
	})

	it('returns null when the override is null', () => {
		setNoteShapeAttributionComponent(editor, null)
		expect(getNoteShapeAttributionComponent(editor)).toBeNull()
	})
})

describe('note attribution in SVG export', () => {
	it('renders the default attribution badge in exports', async () => {
		const result = await editor.getSvgString([noteId])
		expect(result!.svg).toContain('tl-note__attribution')
		expect(result!.svg).toContain('Alice')
	})

	it('omits the attribution badge when the override is null', async () => {
		setNoteShapeAttributionComponent(editor, null)
		const result = await editor.getSvgString([noteId])
		expect(result!.svg).not.toContain('tl-note__attribution')
	})

	it('renders a custom attribution component in exports', async () => {
		setNoteShapeAttributionComponent(editor, ({ firstName }) => (
			<div data-attribution="custom">custom: {firstName}</div>
		))
		const result = await editor.getSvgString([noteId])
		expect(result!.svg).toContain('custom: Alice')
	})
})
