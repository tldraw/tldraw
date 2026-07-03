import { act, fireEvent, screen } from '@testing-library/react'
import { atom, createShapeId } from '@tldraw/editor'
import { renderTldrawComponentWithEditor } from '../../test/testutils/renderTldrawComponent'
import { Tldraw } from '../Tldraw'
import { TLComment, TLCommentStore } from './TLCommentStore'

function createFakeCommentStore() {
	const comments$ = atom<TLComment[]>('fake comments', [])
	let nextId = 0
	const store: TLCommentStore = {
		getCommentsForDocument: () => comments$,
		create: async ({ anchor, text }) => {
			comments$.update((cs) => [
				...cs,
				{ id: `comment:${nextId++}`, anchor, authorId: 'me', text, createdAt: 0, updatedAt: 0 },
			])
		},
		delete: async (id) => {
			comments$.update((cs) => cs.filter((c) => c.id !== id))
		},
	}
	return { store, comments$ }
}

const shapeId = createShapeId('a')

describe('<Tldraw comments />', () => {
	it('renders a pin (titled with the comment text) for each comment', async () => {
		const { store, comments$ } = createFakeCommentStore()
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw comments={store} onMount={onMount} />,
			{ waitForPatterns: false }
		)

		await act(async () => {
			editor.createShape({ id: shapeId, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			comments$.set([
				{
					id: 'comment:1',
					anchor: { type: 'shape', shapeId },
					authorId: 'me',
					text: 'hi there',
					createdAt: 0,
					updatedAt: 0,
				},
			])
		})

		expect(await screen.findByTitle('hi there')).toBeTruthy()
	})

	it('creates a comment through the store when the composer is submitted', async () => {
		const { store, comments$ } = createFakeCommentStore()
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw comments={store} onMount={onMount} />,
			{ waitForPatterns: false }
		)

		await act(async () => {
			editor.createShape({ id: shapeId, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.setSelectedShapes([shapeId])
		})

		const input = await screen.findByPlaceholderText('Comment on the selected shape…')
		await act(async () => {
			fireEvent.change(input, { target: { value: 'new comment' } })
			fireEvent.keyDown(input, { key: 'Enter' })
		})

		expect(comments$.get().map((c) => c.text)).toEqual(['new comment'])
		expect(await screen.findByTitle('new comment')).toBeTruthy()
	})

	it('does not render comment UI when no store is provided', async () => {
		await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
			waitForPatterns: false,
		})
		expect(screen.queryByPlaceholderText('Comment on the selected shape…')).toBeNull()
	})
})
