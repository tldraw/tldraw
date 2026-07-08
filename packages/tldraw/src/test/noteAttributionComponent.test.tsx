import { act, waitFor } from '@testing-library/react'
import {
	Editor,
	TLNoteShape,
	TLUserStore,
	UserRecordType,
	computed,
	createShapeId,
	createUserId,
	toRichText,
} from '@tldraw/editor'
import { TLNoteShapeAttributionProps } from '../lib/shapes/note/DefaultNoteShapeAttribution'
import { TLComponents, Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

const noteId = createShapeId('note1')

// A minimal user store with a known signed-in user, so the note has a display name to attribute.
const currentUser = UserRecordType.create({ id: createUserId('alice'), name: 'Alice Mertnet' })
const users: TLUserStore = {
	currentUser: computed('currentUser', () => currentUser),
	resolve: (userId) => computed('resolve', () => (userId === 'alice' ? currentUser : null)),
}

// Create a note and type into it so that `textLastEditedBy` gets stamped with the current user,
// which is what makes the attribution badge render.
function createAttributedNote(editor: Editor) {
	act(() => {
		editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0 }])
		editor.updateShape<TLNoteShape>({
			id: noteId,
			type: 'note',
			props: { richText: toRichText('Hello') },
		})
	})
}

async function setup(components?: TLComponents) {
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} users={users} components={components} />,
		{ waitForPatterns: false }
	)
	return { editor, rendered }
}

describe('NoteShapeAttribution component', () => {
	it('renders the default attribution badge', async () => {
		const { editor, rendered } = await setup()
		createAttributedNote(editor)
		// the user store should resolve a display name for the first editor
		expect(editor.getAttributionDisplayName(editor.getAttributionUserId())).toBe('Alice Mertnet')

		await waitFor(() => {
			const badge = rendered.container.querySelector('.tl-note__attribution')
			expect(badge).not.toBeNull()
			expect(badge?.textContent).toBe('Alice')
		})
	})

	it('renders a custom NoteShapeAttribution component', async () => {
		function CustomAttribution({ firstName }: TLNoteShapeAttributionProps) {
			return <div data-testid="custom-attribution">custom: {firstName}</div>
		}

		const { editor, rendered } = await setup({ NoteShapeAttribution: CustomAttribution })
		createAttributedNote(editor)

		const badge = await rendered.findByTestId('custom-attribution')
		expect(badge.textContent).toBe('custom: Alice')
		// the default badge markup should not be present
		expect(rendered.container.querySelector('.tl-note__attribution')).toBeNull()
	})

	it('hides the attribution badge when NoteShapeAttribution is null', async () => {
		const { editor, rendered } = await setup({ NoteShapeAttribution: null })
		createAttributedNote(editor)

		// the note itself should render...
		await waitFor(() => {
			expect(rendered.container.querySelector('.tl-note__container')).not.toBeNull()
		})
		// ...but the attribution badge should not.
		expect(rendered.container.querySelector('.tl-note__attribution')).toBeNull()
	})
})
