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
import {
	TLNoteShapeAttributionComponent,
	TLNoteShapeAttributionProps,
} from '../lib/shapes/note/DefaultNoteShapeAttribution'
import { NoteShapeUtil } from '../lib/shapes/note/NoteShapeUtil'
import { Tldraw } from '../lib/Tldraw'
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

// Pass `attribution` to configure the note shape util's `AttributionComponent` option; omit it to use
// the default badge.
async function setup(attribution?: { AttributionComponent: TLNoteShapeAttributionComponent }) {
	const shapeUtils = attribution ? [NoteShapeUtil.configure(attribution)] : undefined
	const { editor, rendered } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} users={users} shapeUtils={shapeUtils} />,
		{ waitForPatterns: false }
	)
	return { editor, rendered }
}

describe('NoteShapeAttribution component', () => {
	it('renders the default attribution badge', async () => {
		const { editor, rendered } = await setup()
		createAttributedNote(editor)
		// the user store should resolve a display name for the last editor
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

		const { editor, rendered } = await setup({ AttributionComponent: CustomAttribution })
		createAttributedNote(editor)

		const badge = await rendered.findByTestId('custom-attribution')
		expect(badge.textContent).toBe('custom: Alice')
		// the default badge markup should not be present
		expect(rendered.container.querySelector('.tl-note__attribution')).toBeNull()
	})

	it('hides the attribution badge when AttributionComponent is null', async () => {
		const { editor, rendered } = await setup({ AttributionComponent: null })
		createAttributedNote(editor)

		// the note itself should render...
		await waitFor(() => {
			expect(rendered.container.querySelector('.tl-note__container')).not.toBeNull()
		})
		// ...but the attribution badge should not.
		expect(rendered.container.querySelector('.tl-note__attribution')).toBeNull()
	})
})
