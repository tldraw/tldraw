import { act, screen } from '@testing-library/react'
import {
	BaseBoxShapeTool,
	BaseBoxShapeUtil,
	Editor,
	HTMLContainer,
	IndexKey,
	TLAssetStore,
	TLShape,
	TLShapeId,
	TldrawEditor,
	createShapeId,
	createTLStore,
	noop,
	toRichText,
} from '@tldraw/editor'
import { StrictMode } from 'react'
import { vi } from 'vitest'
import { defaultShapeUtils } from '../lib/defaultShapeUtils'
import { defaultTools } from '../lib/defaultTools'
import { defaultAddFontsFromNode, tipTapDefaultExtensions } from '../lib/utils/text/richText'
import { createDrawSegments } from './test-jsx'
import {
	renderTldrawComponent,
	renderTldrawComponentWithEditor,
} from './testutils/renderTldrawComponent'

function checkAllShapes(editor: Editor, shapes: string[]) {
	expect(Object.keys(editor!.shapeUtils)).toStrictEqual(shapes)
}

const textOptions = {
	addFontsFromNode: defaultAddFontsFromNode,
	tipTapConfig: {
		extensions: tipTapDefaultExtensions,
	},
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
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
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
		const spy = vi.spyOn(console, 'error').mockImplementation(noop)
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
		const initialStore = createTLStore({ shapeUtils: [], bindingUtils: [] })
		const onMount = vi.fn()
		const rendered = await renderTldrawComponent(
			<TldrawEditor
				initialState="select"
				tools={defaultTools}
				store={initialStore}
				onMount={onMount}
			/>,
			{ waitForPatterns: false }
		)
		const initialEditor = onMount.mock.lastCall![0]
		vi.spyOn(initialEditor, 'dispose')
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
		const newStore = createTLStore({ shapeUtils: [], bindingUtils: [] })
		rendered.rerender(
			<TldrawEditor tools={defaultTools} initialState="select" store={newStore} onMount={onMount} />
		)
		await rendered.findAllByTestId('canvas')
		expect(initialEditor.dispose).toHaveBeenCalledTimes(1)
		expect(onMount).toHaveBeenCalledTimes(2)
		expect(onMount.mock.lastCall![0].store).toBe(newStore)
	})

	it('Renders the canvas and shapes', async () => {
		let editor = {} as Editor
		await renderTldrawComponent(
			<TldrawEditor
				shapeUtils={defaultShapeUtils}
				initialState="select"
				tools={defaultTools}
				onMount={(editorApp) => {
					editor = editorApp
				}}
				textOptions={textOptions}
			/>,
			{ waitForPatterns: false }
		)

		expect(editor).toBeTruthy()
		await act(async () => {
			editor.updateInstanceState({ screenBounds: { x: 0, y: 0, w: 1080, h: 720 } })
		})

		// Test all shape types except group
		const shapeTypesToTest = [
			{ type: 'arrow' as const, props: { start: { x: 0, y: 0 }, end: { x: 100, y: 100 } } },
			{ type: 'bookmark' as const, props: { w: 100, h: 100, url: 'https://example.com' } },
			{
				type: 'draw' as const,
				props: { segments: createDrawSegments([[{ x: 0, y: 0, z: 0.5 }]]) },
			},
			{ type: 'embed' as const, props: { w: 100, h: 100, url: 'https://example.com' } },
			{ type: 'frame' as const, props: { w: 100, h: 100 } },
			{ type: 'geo' as const, props: { w: 100, h: 100, geo: 'rectangle' as const } },
			{
				type: 'highlight' as const,
				props: { segments: createDrawSegments([[{ x: 0, y: 0, z: 0.5 }]]) },
			},
			{ type: 'image' as const, props: { w: 100, h: 100 } },
			{
				type: 'line' as const,
				props: {
					points: {
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 100, y: 100 },
					},
				},
			},
			{ type: 'note' as const, props: { richText: toRichText('test') } },
			{ type: 'text' as const, props: { w: 100, richText: toRichText('test') } },
			{ type: 'video' as const, props: { w: 100, h: 100 } },
		]

		const shapeIds: TLShapeId[] = []

		for (let i = 0; i < shapeTypesToTest.length; i++) {
			const shapeConfig = shapeTypesToTest[i]
			const id = createShapeId()
			shapeIds.push(id)

			await act(async () => {
				editor.createShapes([
					{
						id,
						...shapeConfig,
						x: i * 150, // Space them out horizontally
						y: 0,
					},
				])
			})

			// Does the shape exist?
			const shape = editor.getShape(id)
			expect(shape).toBeTruthy()
			expect(shape?.type).toBe(shapeConfig.type)

			// Check that all shapes rendered without error boundaries
			expect(
				document.querySelectorAll('.tl-shape-error-boundary'),
				`${shapeConfig.type} had an error while rendering`
			).toHaveLength(0)
		}

		// Check that all shape components are rendering
		expect(document.querySelectorAll('.tl-shape').length).toBeGreaterThanOrEqual(
			shapeTypesToTest.length
		)

		// Check that all shape indicators are present
		expect(document.querySelectorAll('.tl-shape-indicator').length).toBeGreaterThanOrEqual(
			shapeTypesToTest.length
		)

		// Select one of the shapes (the note shape)
		const noteShapeId = shapeIds[9] // note is at index 9
		await act(async () => editor.select(noteShapeId))

		expect(editor.getSelectedShapeIds().length).toBe(1)
		expect(editor.getSelectedShapeIds()[0]).toBe(noteShapeId)

		// Select the eraser tool...
		await act(async () => editor.setCurrentTool('eraser'))

		// Is the editor's current tool correct?
		expect(editor.getCurrentToolId()).toBe('eraser')
	})

	it('renders correctly in strict mode', async () => {
		const editorInstances = new Set<Editor>()
		const onMount = vi.fn((editor: Editor) => {
			editorInstances.add(editor)
		})
		await renderTldrawComponent(
			<StrictMode>
				<TldrawEditor tools={defaultTools} initialState="select" onMount={onMount} />
			</StrictMode>,
			{ waitForPatterns: false }
		)

		// we should only get one editor instance
		expect(editorInstances.size).toBe(1)
		// strict mode may cause onMount to be called twice, but the important
		// thing is that we always get the same editor instance
		expect(onMount).toHaveBeenCalled()
	})

	it('allows updating camera options without re-creating the editor', async () => {
		const editors: Editor[] = []
		const onMount = vi.fn((editor: Editor) => {
			if (!editors.includes(editor)) editors.push(editor)
		})

		const renderer = await renderTldrawComponent(<TldrawEditor onMount={onMount} />, {
			waitForPatterns: false,
		})

		expect(editors.length).toBe(1)
		expect(editors[0].getCameraOptions().isLocked).toBe(false)

		renderer.rerender(<TldrawEditor onMount={onMount} cameraOptions={{ isLocked: true }} />)
		expect(editors.length).toBe(1)
		expect(editors[0].getCameraOptions().isLocked).toBe(true)
	})

	it('will populate the store from the snapshot prop', async () => {
		const snapshot = {
			schema: {
				schemaVersion: 2,
				sequences: {
					'com.tldraw.store': 4,
					'com.tldraw.asset': 1,
					'com.tldraw.camera': 1,
					'com.tldraw.document': 2,
					'com.tldraw.instance': 25,
					'com.tldraw.instance_page_state': 5,
					'com.tldraw.page': 1,
					'com.tldraw.instance_presence': 5,
					'com.tldraw.pointer': 1,
					'com.tldraw.shape': 4,
					'com.tldraw.asset.bookmark': 2,
					'com.tldraw.asset.image': 5,
					'com.tldraw.asset.video': 5,
					'com.tldraw.shape.arrow': 5,
					'com.tldraw.shape.bookmark': 2,
					'com.tldraw.shape.draw': 2,
					'com.tldraw.shape.embed': 4,
					'com.tldraw.shape.frame': 0,
					'com.tldraw.shape.geo': 9,
					'com.tldraw.shape.group': 0,
					'com.tldraw.shape.highlight': 1,
					'com.tldraw.shape.image': 4,
					'com.tldraw.shape.line': 5,
					'com.tldraw.shape.note': 7,
					'com.tldraw.shape.text': 2,
					'com.tldraw.shape.video': 2,
					'com.tldraw.binding.arrow': 0,
				},
			},
			store: {
				'document:document': {
					gridSize: 10,
					name: '',
					meta: {},
					id: 'document:document',
					typeName: 'document',
				},
				'page:page': { meta: {}, id: 'page:page', name: 'Page 1', index: 'a1', typeName: 'page' },
				'shape:SxHfVyCVdM4Ryl27eJNRD': {
					x: 608.718221918489,
					y: 298.97020222415506,
					rotation: 0,
					isLocked: false,
					opacity: 1,
					meta: {},
					id: 'shape:SxHfVyCVdM4Ryl27eJNRD',
					type: 'geo',
					props: {
						w: 152.74967383200806,
						h: 134.57489438369782,
						geo: 'rectangle',
						color: 'black',
						labelColor: 'black',
						fill: 'none',
						dash: 'draw',
						size: 'm',
						font: 'draw',
						text: '',
						align: 'middle',
						verticalAlign: 'middle',
						growY: 0,
						url: '',
						scale: 1,
					},
					parentId: 'page:page',
					index: 'a1',
					typeName: 'shape',
				},
			},
		} as any

		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<TldrawEditor
					onMount={onMount}
					shapeUtils={defaultShapeUtils}
					snapshot={snapshot}
					textOptions={textOptions}
				/>
			),
			{ waitForPatterns: true }
		)

		act(() => editor.selectAll())

		expect(editor.getSelectedShapes()).toMatchObject([
			{
				id: 'shape:SxHfVyCVdM4Ryl27eJNRD',
				type: 'geo',
				props: { w: 152.74967383200806, h: 134.57489438369782 },
			},
		])
	})

	it('passes through the `assets` prop when creating its own in-memory store', async () => {
		const myUploadFn = vi.fn()
		const assetStore: TLAssetStore = { upload: myUploadFn }

		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<TldrawEditor onMount={onMount} shapeUtils={defaultShapeUtils} assets={assetStore} />
			),
			{ waitForPatterns: true }
		)

		expect(editor.store.props.assets.upload).toBe(myUploadFn)
	})

	it('passes through the `assets` prop when using `persistenceKey`', async () => {
		const myUploadFn = vi.fn()
		const assetStore: TLAssetStore = { upload: myUploadFn }

		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<TldrawEditor
					onMount={onMount}
					shapeUtils={defaultShapeUtils}
					assets={assetStore}
					persistenceKey="hello-world"
				/>
			),
			{ waitForPatterns: true }
		)

		expect(editor.store.props.assets.upload).toBe(myUploadFn)
	})

	it('will not re-create the editor if re-rendered with identical options', async () => {
		const onMount = vi.fn()

		const renderer = await renderTldrawComponent(
			<TldrawEditor onMount={onMount} options={{ maxPages: 1 }} />,
			{
				waitForPatterns: false,
			}
		)

		expect(onMount).toHaveBeenCalledTimes(1)

		renderer.rerender(<TldrawEditor onMount={onMount} options={{ maxPages: 1 }} />)
		expect(onMount).toHaveBeenCalledTimes(1)
	})
})

const CARD_TYPE = 'card'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[CARD_TYPE]: { w: number; h: number }
	}
}

type CardShape = TLShape<typeof CARD_TYPE>

describe('Custom shapes', () => {
	class CardUtil extends BaseBoxShapeUtil<CardShape> {
		static override type = CARD_TYPE

		override isAspectRatioLocked(_shape: CardShape) {
			return false
		}
		override canResize(_shape: CardShape) {
			return true
		}

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
		override shapeType = 'card' as const
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
