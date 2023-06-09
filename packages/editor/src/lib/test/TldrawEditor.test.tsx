import { act, render, screen } from '@testing-library/react'
import { TLBaseShape, createShapeId } from '@tldraw/tlschema'
import { TldrawEditor } from '../TldrawEditor'
import { Canvas } from '../components/Canvas'
import { HTMLContainer } from '../components/HTMLContainer'
import { createTLStore } from '../config/createTLStore'
import { defaultShapes } from '../config/defaultShapes'
import { defineShape } from '../config/defineShape'
import { Editor } from '../editor/Editor'
import { BaseBoxShapeUtil } from '../editor/shapeutils/BaseBoxShapeUtil'
import { BaseBoxShapeTool } from '../editor/tools/BaseBoxShapeTool/BaseBoxShapeTool'

let originalFetch: typeof window.fetch
beforeEach(() => {
	window.fetch = jest.fn().mockImplementation((...args: Parameters<typeof fetch>) => {
		if (args[0] === '/icons/icon/icon-names.json') {
			return Promise.resolve({ json: () => Promise.resolve([]) } as Response)
		}
		return originalFetch(...args)
	})
})

afterEach(() => {
	jest.restoreAllMocks()
	window.fetch = originalFetch
})

function checkAllShapes(editor: Editor, shapes: string[]) {
	expect(Object.keys(editor!.store.schema.types.shape.migrations.subTypeMigrations!)).toStrictEqual(
		shapes
	)

	expect(Object.keys(editor!.shapeUtils)).toStrictEqual(shapes)
}

describe('<TldrawEditor />', () => {
	it('Renders without crashing', async () => {
		render(
			<TldrawEditor autoFocus components={{ ErrorFallback: null }}>
				<div data-testid="canvas-1" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-1')
	})

	it('Creates its own store with default shapes', async () => {
		let editor: Editor
		render(
			<TldrawEditor
				components={{ ErrorFallback: null }}
				onMount={(e) => {
					editor = e
				}}
				autoFocus
			>
				<div data-testid="canvas-1" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-1')
		checkAllShapes(editor!, [
			'group',
			'embed',
			'bookmark',
			'image',
			'text',
			'draw',
			'geo',
			'line',
			'note',
			'frame',
			'arrow',
			'highlight',
			'video',
		])
	})

	it('Can be created with only core shapes', async () => {
		let editor: Editor
		render(
			<TldrawEditor
				components={{ ErrorFallback: null }}
				shapes={[]}
				tools={[]}
				onMount={(e) => {
					editor = e
				}}
				autoFocus
			>
				<div data-testid="canvas-1" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-1')
		expect(editor!).toBeTruthy()

		checkAllShapes(editor!, ['group', 'embed', 'bookmark', 'image', 'text'])
	})

	it('Renders with an external store', async () => {
		const store = createTLStore({ shapes: defaultShapes })
		render(
			<TldrawEditor
				components={{ ErrorFallback: null }}
				store={store}
				onMount={(editor) => {
					expect(editor.store).toBe(store)
				}}
				autoFocus
			>
				<div data-testid="canvas-1" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-1')
	})

	it('throws if the store has different shapes to the ones passed in', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		expect(() =>
			render(
				<TldrawEditor
					components={{ ErrorFallback: null }}
					store={createTLStore({ shapes: [] })}
					autoFocus
				>
					<div data-testid="canvas-1" />
				</TldrawEditor>
			)
		).toThrowErrorMatchingInlineSnapshot(
			`"Editor and store have different shapes: \\"draw\\" was passed into the editor but not the schema"`
		)

		expect(() =>
			render(
				<TldrawEditor
					components={{ ErrorFallback: null }}
					store={createTLStore({ shapes: defaultShapes })}
					shapes={[]}
					autoFocus
				>
					<div data-testid="canvas-1" />
				</TldrawEditor>
			)
		).toThrowErrorMatchingInlineSnapshot(
			`"Editor and store have different shapes: \\"draw\\" is present in the store schema but not provided to the editor"`
		)
		spy.mockRestore()
	})

	it('Accepts fresh versions of store and calls `onMount` for each one', async () => {
		const initialStore = createTLStore({ shapes: defaultShapes })
		const onMount = jest.fn()
		const rendered = render(
			<TldrawEditor
				components={{ ErrorFallback: null }}
				store={initialStore}
				onMount={onMount}
				autoFocus
			>
				<div data-testid="canvas-1" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-1')
		const initialEditor = onMount.mock.lastCall[0]
		jest.spyOn(initialEditor, 'dispose')
		expect(initialEditor.store).toBe(initialStore)
		// re-render with the same store:
		rendered.rerender(
			<TldrawEditor
				components={{ ErrorFallback: null }}
				store={initialStore}
				onMount={onMount}
				autoFocus
			>
				<div data-testid="canvas-2" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-2')
		// not called again:
		expect(onMount).toHaveBeenCalledTimes(1)
		// re-render with a new store:
		const newStore = createTLStore({ shapes: defaultShapes })
		rendered.rerender(
			<TldrawEditor
				components={{ ErrorFallback: null }}
				store={newStore}
				onMount={onMount}
				autoFocus
			>
				<div data-testid="canvas-3" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-3')
		expect(initialEditor.dispose).toHaveBeenCalledTimes(1)
		expect(onMount).toHaveBeenCalledTimes(2)
		expect(onMount.mock.lastCall[0].store).toBe(newStore)
	})

	it('Renders the canvas and shapes', async () => {
		let editor = {} as Editor
		render(
			<TldrawEditor
				components={{ ErrorFallback: null }}
				autoFocus
				onMount={(editorApp) => {
					editor = editorApp
				}}
			>
				<Canvas />
				<div data-testid="canvas-1" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-1')

		expect(editor).toBeTruthy()
		await act(async () => {
			editor.updateInstanceState({ screenBounds: { x: 0, y: 0, w: 1080, h: 720 } }, true, true)
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
		expect(editor.getShapeById(id)).toMatchObject({
			id,
			type: 'geo',
			x: 0,
			y: 0,
			opacity: 1,
			props: { geo: 'rectangle', w: 100, h: 100 },
		})

		// Is the shape's component rendering?
		expect(document.querySelectorAll('.tl-shape')).toHaveLength(1)

		expect(document.querySelectorAll('.tl-shape-indicator')).toHaveLength(0)

		// Select the shape
		await act(async () => editor.select(id))

		// Is the shape's component rendering?
		expect(document.querySelectorAll('.tl-shape-indicator')).toHaveLength(1)

		// Select the eraser tool...
		await act(async () => editor.setSelectedTool('eraser'))

		// Is the editor's current tool correct?
		expect(editor.currentToolId).toBe('eraser')
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
		override canBind = (_shape: CardShape) => true

		override defaultProps(): CardShape['props'] {
			return {
				w: 300,
				h: 300,
			}
		}

		render(shape: CardShape) {
			const bounds = this.bounds(shape)

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
					{bounds.w.toFixed()}x{bounds.h.toFixed()}
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
	const shapes = [defineShape('card', { util: CardUtil })]

	it('Uses custom shapes', async () => {
		let editor = {} as Editor
		render(
			<TldrawEditor
				components={{ ErrorFallback: null }}
				shapes={shapes}
				tools={tools}
				autoFocus
				onMount={(editorApp) => {
					editor = editorApp
				}}
			>
				<Canvas />
				<div data-testid="canvas-1" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-1')

		expect(editor).toBeTruthy()
		await act(async () => {
			editor.updateInstanceState({ screenBounds: { x: 0, y: 0, w: 1080, h: 720 } }, true, true)
		})

		expect(editor.shapeUtils.card).toBeTruthy()
		checkAllShapes(editor, ['group', 'embed', 'bookmark', 'image', 'text', 'card'])

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
		expect(editor.getShapeById(id)).toMatchObject({
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
		await act(async () => editor.setSelectedTool('card'))

		// Is the editor's current tool correct?
		expect(editor.currentToolId).toBe('card')
	})
})
