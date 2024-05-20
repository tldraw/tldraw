import { act, render, screen } from '@testing-library/react'
import {
	BaseBoxShapeTool,
	BaseBoxShapeUtil,
	Editor,
	HTMLContainer,
	TLBaseShape,
	TldrawEditor,
	createShapeId,
	createTLStore,
	noop,
} from '@tldraw/editor'
import { defaultTools } from '../lib/defaultTools'
import { GeoShapeUtil } from '../lib/shapes/geo/GeoShapeUtil'
import { renderTldrawComponent } from './testutils/renderTldrawComponent'

function checkAllShapes(editor: Editor, shapes: string[]) {
	expect(Object.keys(editor!.shapeUtils)).toStrictEqual(shapes)
}

describe('<TldrawEditor />', () => {
	it('Renders without crashing', async () => {
		await renderTldrawComponent(<TldrawEditor tools={defaultTools} initialState="select" />, {
			waitForPatterns: false,
		})
		await screen.findByTestId('canvas')
	})

	it('Creates its own store with core shapes', async () => {
		let editor: Editor
		await renderTldrawComponent(
			<TldrawEditor
				onMount={(e) => {
					editor = e
				}}
				initialState="select"
				tools={defaultTools}
			/>,
			{ waitForPatterns: false }
		)
		checkAllShapes(editor!, ['group'])
	})

	it('Can be created with default shapes', async () => {
		let editor: Editor
		await renderTldrawComponent(
			<TldrawEditor
				shapeUtils={[]}
				tools={defaultTools}
				initialState="select"
				onMount={(e) => {
					editor = e
				}}
			/>,
			{ waitForPatterns: false }
		)
		expect(editor!).toBeTruthy()

		checkAllShapes(editor!, ['group'])
	})

	it('Renders with an external store', async () => {
		const store = createTLStore({ shapeUtils: [] })
		await renderTldrawComponent(
			<TldrawEditor
				store={store}
				tools={defaultTools}
				initialState="select"
				onMount={(editor) => {
					expect(editor.store).toBe(store)
				}}
			/>,
			{ waitForPatterns: false }
		)
	})

	it('throws if the store has different shapes to the ones passed in', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(noop)
		// expect(() =>
		// 	render(
		// 		<TldrawEditor
		// 			shapeUtils={[GroupShapeUtil]}
		// 			store={createTLStore({ shapeUtils: [] })}
		// 			components={{
		// 				ErrorFallback: ({ error }) => {
		// 					throw error
		// 				},
		// 			}}
		// 		>
		// 			<div data-testid="canvas-1" />
		// 		</TldrawEditor>
		// 	)
		// ).toThrowErrorMatchingInlineSnapshot(
		// 	`"Editor and store have different shapes: \\"draw\\" was passed into the editor but not the schema"`
		// )

		// 	expect(() =>
		// 		render(
		// 			<TldrawEditor
		// 				store={createTLStore({ shapeUtils: [GroupShapeUtil] })}
		// 				components={{
		// 					ErrorFallback: ({ error }) => {
		// 						throw error
		// 					},
		// 				}}
		// 			>
		// 				<div data-testid="canvas-1" />
		// 			</TldrawEditor>
		// 		)
		// 	).toThrowErrorMatchingInlineSnapshot(
		// 		`"Editor and store have different shapes: \\"draw\\" is present in the store schema but not provided to the editor"`
		// 	)
		spy.mockRestore()
	})

	it('Accepts fresh versions of store and calls `onMount` for each one', async () => {
		const initialStore = createTLStore({ shapeUtils: [] })
		const onMount = jest.fn()
		const rendered = render(
			<TldrawEditor
				initialState="select"
				tools={defaultTools}
				store={initialStore}
				onMount={onMount}
			/>
		)
		const initialEditor = onMount.mock.lastCall[0]
		jest.spyOn(initialEditor, 'dispose')
		expect(initialEditor.store).toBe(initialStore)
		// re-render with the same store:
		rendered.rerender(
			<TldrawEditor
				tools={defaultTools}
				initialState="select"
				store={initialStore}
				onMount={onMount}
			/>
		)
		// not called again:
		expect(onMount).toHaveBeenCalledTimes(1)
		// re-render with a new store:
		const newStore = createTLStore({ shapeUtils: [] })
		rendered.rerender(
			<TldrawEditor tools={defaultTools} initialState="select" store={newStore} onMount={onMount} />
		)
		expect(initialEditor.dispose).toHaveBeenCalledTimes(1)
		expect(onMount).toHaveBeenCalledTimes(2)
		expect(onMount.mock.lastCall[0].store).toBe(newStore)
	})

	it('Renders the canvas and shapes', async () => {
		let editor = {} as Editor
		await renderTldrawComponent(
			<TldrawEditor
				shapeUtils={[GeoShapeUtil]}
				initialState="select"
				tools={defaultTools}
				onMount={(editorApp) => {
					editor = editorApp
				}}
			/>,
			{ waitForPatterns: false }
		)

		expect(editor).toBeTruthy()
		await act(async () => {
			editor.updateInstanceState({ screenBounds: { x: 0, y: 0, w: 1080, h: 720 } })
		})

		const id = createShapeId()

		await act(async () => {
			editor.createShapes([
				{
					id,
					type: 'geo',
					props: { w: 100, h: 100 },
				},
			])
		})

		// Does the shape exist?
		expect(editor.getShape(id)).toMatchObject({
			id,
			type: 'geo',
			x: 0,
			y: 0,
			opacity: 1,
			props: { geo: 'rectangle', w: 100, h: 100 },
		})

		// Is the shape's component rendering?
		expect(document.querySelectorAll('.tl-shape')).toHaveLength(1)
		// though indicator should be display none
		expect(document.querySelectorAll('.tl-shape-indicator')).toHaveLength(1)

		// Select the shape
		await act(async () => editor.select(id))

		expect(editor.getSelectedShapeIds().length).toBe(1)
		// though indicator it should be visible
		expect(document.querySelectorAll('.tl-shape-indicator')).toHaveLength(1)

		// Select the eraser tool...
		await act(async () => editor.setCurrentTool('eraser'))

		// Is the editor's current tool correct?
		expect(editor.getCurrentToolId()).toBe('eraser')
	})
})

describe('Custom shapes', () => {
	type CardShape = TLBaseShape<
		'card',
		{
			w: number
			h: number
		}
	>

	class CardUtil extends BaseBoxShapeUtil<CardShape> {
		static override type = 'card' as const

		override isAspectRatioLocked = (_shape: CardShape) => false
		override canResize = (_shape: CardShape) => true

		override getDefaultProps(): CardShape['props'] {
			return {
				w: 300,
				h: 300,
			}
		}

		component(shape: CardShape) {
			return (
				<HTMLContainer
					id={shape.id}
					data-testid="card-shape"
					style={{
						border: '1px solid black',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						pointerEvents: 'all',
					}}
				>
					{shape.props.w.toFixed()}x{shape.props.h.toFixed()}
				</HTMLContainer>
			)
		}

		indicator(shape: CardShape) {
			return <rect data-testid="card-indicator" width={shape.props.w} height={shape.props.h} />
		}
	}

	class CardTool extends BaseBoxShapeTool {
		static override id = 'card'
		static override initial = 'idle'
		override shapeType = 'card'
	}

	const tools = [CardTool]
	const shapeUtils = [CardUtil]

	it('Uses custom shapes', async () => {
		let editor = {} as Editor
		await renderTldrawComponent(
			<TldrawEditor
				shapeUtils={shapeUtils}
				tools={[...defaultTools, ...tools]}
				initialState="select"
				onMount={(editorApp) => {
					editor = editorApp
				}}
			/>,
			{ waitForPatterns: false }
		)

		expect(editor).toBeTruthy()
		await act(async () => {
			editor.updateInstanceState({ screenBounds: { x: 0, y: 0, w: 1080, h: 720 } })
		})

		expect(editor.shapeUtils.card).toBeTruthy()
		checkAllShapes(editor, ['group', 'card'])

		const id = createShapeId()

		await act(async () => {
			editor.createShapes([
				{
					id,
					type: 'card',
					props: { w: 100, h: 100 },
				},
			])
		})

		// Does the shape exist?
		expect(editor.getShape(id)).toMatchObject({
			id,
			type: 'card',
			x: 0,
			y: 0,
			opacity: 1,
			props: { w: 100, h: 100 },
		})

		// Is the shape's component rendering?
		expect(await screen.findByTestId('card-shape')).toBeTruthy()

		// Select the shape
		await act(async () => editor.select(id))

		// Is the shape's component rendering?
		expect(await screen.findByTestId('card-indicator')).toBeTruthy()

		// Select the tool...
		await act(async () => editor.setCurrentTool('card'))

		// Is the editor's current tool correct?
		expect(editor.getCurrentToolId()).toBe('card')
	})
})
