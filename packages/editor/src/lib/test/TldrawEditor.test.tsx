import { act, render, screen } from '@testing-library/react'
import { TLBaseShape, TLOpacityType, createShapeId } from '@tldraw/tlschema'
import { TldrawEditor } from '../TldrawEditor'
import { Canvas } from '../components/Canvas'
import { HTMLContainer } from '../components/HTMLContainer'
import { createTLStore } from '../config/createTLStore'
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

describe('<TldrawEditor />', () => {
	it('Renders without crashing', async () => {
		await act(async () => (
			<TldrawEditor autoFocus>
				<div data-testid="canvas-1" />
			</TldrawEditor>
		))
	})

	it('Creates its own store', async () => {
		let store: any
		render(
			await act(async () => (
				<TldrawEditor onMount={(editor) => (store = editor.store)} autoFocus>
					<div data-testid="canvas-1" />
				</TldrawEditor>
			))
		)
		await screen.findByTestId('canvas-1')
		expect(store).toBeTruthy()
	})

	it('Renders with an external store', async () => {
		const store = createTLStore()
		render(
			await act(async () => (
				<TldrawEditor
					store={store}
					onMount={(editor) => {
						expect(editor.store).toBe(store)
					}}
					autoFocus
				>
					<div data-testid="canvas-1" />
				</TldrawEditor>
			))
		)
		await screen.findByTestId('canvas-1')
	})

	it('Accepts fresh versions of store and calls `onMount` for each one', async () => {
		const initialStore = createTLStore({})
		const onMount = jest.fn()
		const rendered = render(
			<TldrawEditor store={initialStore} onMount={onMount} autoFocus>
				<div data-testid="canvas-1" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-1')
		const initialEditor = onMount.mock.lastCall[0]
		jest.spyOn(initialEditor, 'dispose')
		expect(initialEditor.store).toBe(initialStore)
		// re-render with the same store:
		rendered.rerender(
			<TldrawEditor store={initialStore} onMount={onMount} autoFocus>
				<div data-testid="canvas-2" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-2')
		// not called again:
		expect(onMount).toHaveBeenCalledTimes(1)
		// re-render with a new store:
		const newStore = createTLStore({})
		rendered.rerender(
			<TldrawEditor store={newStore} onMount={onMount} autoFocus>
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
			await act(async () => (
				<TldrawEditor
					autoFocus
					onMount={(editorApp) => {
						editor = editorApp
					}}
				>
					<Canvas />
					<div data-testid="canvas-1" />
				</TldrawEditor>
			))
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
			props: { geo: 'rectangle', w: 100, h: 100, opacity: '1' },
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
			opacity: TLOpacityType
		}
	>

	class CardUtil extends BaseBoxShapeUtil<CardShape> {
		static override type = 'card' as const

		override isAspectRatioLocked = (_shape: CardShape) => false
		override canResize = (_shape: CardShape) => true
		override canBind = (_shape: CardShape) => true

		override defaultProps(): CardShape['props'] {
			return {
				opacity: '1',
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
	const shapes = { card: { util: CardUtil } }

	it('Uses custom shapes', async () => {
		let editor = {} as Editor
		render(
			await act(async () => (
				<TldrawEditor
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
			))
		)
		await screen.findByTestId('canvas-1')

		expect(editor).toBeTruthy()
		await act(async () => {
			editor.updateInstanceState({ screenBounds: { x: 0, y: 0, w: 1080, h: 720 } }, true, true)
		})

		expect(editor.shapeUtils.card).toBeTruthy()

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
			props: { w: 100, h: 100, opacity: '1' },
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
