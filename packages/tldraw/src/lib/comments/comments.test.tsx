import { act, fireEvent, screen } from '@testing-library/react'
import { Editor, createShapeId } from '@tldraw/editor'
import {
	renderTldrawComponent,
	renderTldrawComponentWithEditor,
} from '../../test/testutils/renderTldrawComponent'
import { Tldraw } from '../Tldraw'
import { TLComment, TLCommentCreate } from './TLCommentStore'

const shapeId = createShapeId('a')

function comment(text: string): TLComment {
	return {
		id: `comment:${text}`,
		anchor: { type: 'shape', shapeId },
		authorId: 'me',
		text,
		createdAt: 0,
		updatedAt: 0,
	}
}

describe('<Tldraw comments />', () => {
	it('renders a pin (titled with the comment text) for each comment', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw comments={[comment('hi there')]} onMount={onMount} />,
			{ waitForPatterns: false }
		)
		await act(async () => {
			editor.createShape({ id: shapeId, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
		})
		expect(await screen.findByTitle('hi there')).toBeTruthy()
	})

	it('calls onCreateComment when the composer is submitted (without adding to the list itself)', async () => {
		const created: TLCommentCreate[] = []
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw comments={[]} onCreateComment={(i) => void created.push(i)} onMount={onMount} />
			),
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

		expect(created).toEqual([{ anchor: { type: 'shape', shapeId }, text: 'new comment' }])
		// controlled: nothing renders until the app reflects it back into `comments`
		expect(screen.queryByTitle('new comment')).toBeNull()
	})

	it('does not render comment UI when the comments prop is omitted', async () => {
		await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
			waitForPatterns: false,
		})
		expect(screen.queryByPlaceholderText('Comment on the selected shape…')).toBeNull()
	})

	it('is controlled — updating the comments prop adds a pin', async () => {
		let editor!: Editor
		function Harness({ comments }: { comments: TLComment[] }) {
			return (
				<Tldraw
					comments={comments}
					onMount={(e) => {
						editor = e
					}}
				/>
			)
		}

		const rendered = await renderTldrawComponent(<Harness comments={[]} />, {
			waitForPatterns: false,
		})
		await act(async () => {
			editor.createShape({ id: shapeId, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
		})
		expect(screen.queryByTitle('from prop')).toBeNull()

		await act(async () => {
			rendered.rerender(<Harness comments={[comment('from prop')]} />)
		})
		expect(await screen.findByTitle('from prop')).toBeTruthy()
	})
})
