import {
	AssetRecordType,
	BaseBoxShapeUtil,
	Geometry2d,
	PageRecordType,
	Rectangle2d,
	TLGeoShapeProps,
	TLShape,
	TldrawEditorProps,
	atom,
	createShapeId,
	debounce,
	getSnapshot,
	loadSnapshot,
	react,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	frame1: createShapeId('frame1'),
	group1: createShapeId('group1'),

	page2: PageRecordType.createId('page2'),
}

beforeEach(() => {
	editor = new TestEditor({})

	editor.createShapes([
		// on its own
		{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
		// in a frame
		{ id: ids.frame1, type: 'frame', x: 100, y: 100, props: { w: 100, h: 100 } },
		{ id: ids.box2, type: 'geo', x: 700, y: 700, props: { w: 100, h: 100 }, parentId: ids.frame1 },

		{ id: ids.group1, type: 'group', x: 100, y: 100, props: {} },
		{ id: ids.box3, type: 'geo', x: 500, y: 500, props: { w: 100, h: 100 }, parentId: ids.group1 },
	])

	const page1 = editor.getCurrentPageId()
	editor.createPage({ name: 'page 2', id: ids.page2 })
	editor.setCurrentPage(page1)
})

const moveShapesToPage2 = () => {
	// directly manipulate parentId like would happen in multiplayer situations

	editor.updateShapes([
		{ id: ids.box1, type: 'geo', parentId: ids.page2 },
		{ id: ids.box2, type: 'geo', parentId: ids.page2 },
		{ id: ids.group1, type: 'group', parentId: ids.page2 },
	])
}

describe('shapes that are moved to another page', () => {
	it("should be excluded from the previous page's focusedGroupId", () => {
		editor.setFocusedGroup(ids.group1)
		expect(editor.getFocusedGroupId()).toBe(ids.group1)
		moveShapesToPage2()
		expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
	})

	describe("should be excluded from the previous page's hintingShapeIds", () => {
		test('[boxes]', () => {
			editor.setHintingShapes([ids.box1, ids.box2, ids.box3])
			expect(editor.getHintingShapeIds()).toEqual([ids.box1, ids.box2, ids.box3])
			moveShapesToPage2()
			expect(editor.getHintingShapeIds()).toEqual([])
		})
		test('[frame that does not move]', () => {
			editor.setHintingShapes([ids.frame1])
			expect(editor.getHintingShapeIds()).toEqual([ids.frame1])
			moveShapesToPage2()
			expect(editor.getHintingShapeIds()).toEqual([ids.frame1])
		})
	})

	describe("should be excluded from the previous page's editingShapeId", () => {
		test('[root shape]', () => {
			editor.setEditingShape(ids.box1)
			expect(editor.getEditingShapeId()).toBe(ids.box1)
			moveShapesToPage2()
			expect(editor.getEditingShapeId()).toBe(null)
		})
		test('[child of frame]', () => {
			editor.setEditingShape(ids.box2)
			expect(editor.getEditingShapeId()).toBe(ids.box2)
			moveShapesToPage2()
			expect(editor.getEditingShapeId()).toBe(null)
		})
		test('[child of group]', () => {
			editor.setEditingShape(ids.box3)
			expect(editor.getEditingShapeId()).toBe(ids.box3)
			moveShapesToPage2()
			expect(editor.getEditingShapeId()).toBe(null)
		})
		test('[frame that doesnt move]', () => {
			editor.setEditingShape(ids.frame1)
			expect(editor.getEditingShapeId()).toBe(ids.frame1)
			moveShapesToPage2()
			expect(editor.getEditingShapeId()).toBe(ids.frame1)
		})
	})

	describe("should be excluded from the previous page's erasingShapeIds", () => {
		test('[boxes]', () => {
			editor.setErasingShapes([ids.box1, ids.box2, ids.box3])
			expect(editor.getErasingShapeIds()).toEqual([ids.box1, ids.box2, ids.box3])
			moveShapesToPage2()
			expect(editor.getErasingShapeIds()).toEqual([])
		})
		test('[frame that does not move]', () => {
			editor.setErasingShapes([ids.frame1])
			expect(editor.getErasingShapeIds()).toEqual([ids.frame1])
			moveShapesToPage2()
			expect(editor.getErasingShapeIds()).toEqual([ids.frame1])
		})
	})

	describe("should be excluded from the previous page's selectedShapeIds", () => {
		test('[boxes]', () => {
			editor.setSelectedShapes([ids.box1, ids.box2, ids.box3])
			expect(editor.getSelectedShapeIds()).toEqual([ids.box1, ids.box2, ids.box3])
			moveShapesToPage2()
			expect(editor.getSelectedShapeIds()).toEqual([])
		})
		test('[frame that does not move]', () => {
			editor.setSelectedShapes([ids.frame1])
			expect(editor.getSelectedShapeIds()).toEqual([ids.frame1])
			moveShapesToPage2()
			expect(editor.getSelectedShapeIds()).toEqual([ids.frame1])
		})
	})
})

it('Begins dragging from pointer move', () => {
	editor.pointerDown(0, 0)
	editor.pointerMove(2, 2)
	expect(editor.inputs.isDragging).toBe(false)
	editor.pointerMove(10, 10)
	expect(editor.inputs.isDragging).toBe(true)
})

it('Begins dragging from wheel', () => {
	editor.pointerDown(0, 0)
	editor.wheel(2, 2)
	expect(editor.inputs.isDragging).toBe(false)
	editor.wheel(10, 10)
	expect(editor.inputs.isDragging).toBe(true)
})

it('Does not create an undo stack item when first clicking on an empty canvas', () => {
	editor = new TestEditor()
	editor.pointerMove(50, 50)
	editor.click(0, 0)
	expect(editor.getCanUndo()).toBe(false)
})

describe('Editor.sharedOpacity', () => {
	it('should return the current opacity', () => {
		expect(editor.getSharedOpacity()).toStrictEqual({ type: 'shared', value: 1 })
		editor.setOpacityForSelectedShapes(0.5)
		editor.setOpacityForNextShapes(0.5)
		expect(editor.getSharedOpacity()).toStrictEqual({ type: 'shared', value: 0.5 })
	})

	it('should return opacity for a single selected shape', () => {
		const { A } = editor.createShapesFromJsx(<TL.geo ref="A" opacity={0.3} x={0} y={0} />)
		editor.setSelectedShapes([A])
		expect(editor.getSharedOpacity()).toStrictEqual({ type: 'shared', value: 0.3 })
	})

	it('should return opacity for multiple selected shapes', () => {
		const { A, B } = editor.createShapesFromJsx([
			<TL.geo ref="A" opacity={0.3} x={0} y={0} />,
			<TL.geo ref="B" opacity={0.3} x={0} y={0} />,
		])
		editor.setSelectedShapes([A, B])
		expect(editor.getSharedOpacity()).toStrictEqual({ type: 'shared', value: 0.3 })
	})

	it('should return mixed when multiple selected shapes have different opacity', () => {
		const { A, B } = editor.createShapesFromJsx([
			<TL.geo ref="A" opacity={0.3} x={0} y={0} />,
			<TL.geo ref="B" opacity={0.5} x={0} y={0} />,
		])
		editor.setSelectedShapes([A, B])
		expect(editor.getSharedOpacity()).toStrictEqual({ type: 'mixed' })
	})

	it('ignores the opacity of groups and returns the opacity of their children', () => {
		const ids = editor.createShapesFromJsx([
			<TL.group ref="group" x={0} y={0}>
				<TL.geo ref="A" opacity={0.3} x={0} y={0} />
			</TL.group>,
		])
		editor.setSelectedShapes([ids.group])
		expect(editor.getSharedOpacity()).toStrictEqual({ type: 'shared', value: 0.3 })
	})
})

describe('Editor.setOpacity', () => {
	it('should set opacity for selected shapes', () => {
		const ids = editor.createShapesFromJsx([
			<TL.geo ref="A" opacity={0.3} x={0} y={0} />,
			<TL.geo ref="B" opacity={0.4} x={0} y={0} />,
		])

		editor.setSelectedShapes([ids.A, ids.B])
		editor.setOpacityForSelectedShapes(0.5)
		editor.setOpacityForNextShapes(0.5)

		expect(editor.getShape(ids.A)!.opacity).toBe(0.5)
		expect(editor.getShape(ids.B)!.opacity).toBe(0.5)
	})

	it('should traverse into groups and set opacity in their children', () => {
		const ids = editor.createShapesFromJsx([
			<TL.geo ref="boxA" x={0} y={0} />,
			<TL.group ref="groupA" x={0} y={0}>
				<TL.geo ref="boxB" x={0} y={0} />
				<TL.group ref="groupB" x={0} y={0}>
					<TL.geo ref="boxC" x={0} y={0} />
					<TL.geo ref="boxD" x={0} y={0} />
				</TL.group>
			</TL.group>,
		])

		editor.setSelectedShapes([ids.groupA])
		editor.setOpacityForSelectedShapes(0.5)
		editor.setOpacityForNextShapes(0.5)

		// a wasn't selected...
		expect(editor.getShape(ids.boxA)!.opacity).toBe(1)

		// b, c, & d were within a selected group...
		expect(editor.getShape(ids.boxB)!.opacity).toBe(0.5)
		expect(editor.getShape(ids.boxC)!.opacity).toBe(0.5)
		expect(editor.getShape(ids.boxD)!.opacity).toBe(0.5)

		// groups get skipped
		expect(editor.getShape(ids.groupA)!.opacity).toBe(1)
		expect(editor.getShape(ids.groupB)!.opacity).toBe(1)
	})

	it('stores opacity on opacityForNextShape', () => {
		editor.setOpacityForSelectedShapes(0.5)
		editor.setOpacityForNextShapes(0.5)
		expect(editor.getInstanceState().opacityForNextShape).toBe(0.5)
		editor.setOpacityForSelectedShapes(0.6)
		editor.setOpacityForNextShapes(0.6)
		expect(editor.getInstanceState().opacityForNextShape).toBe(0.6)
	})
})

describe('Editor.TickManager', () => {
	it('Does not produce NaN values when elapsed is 0', () => {
		// a helper that calls update pointer velocity with a given elapsed time.
		// usually this is called by the app's tick manager, using the elapsed time
		// between two animation frames, but we're calling it directly here.
		const tick = (ms: number) => {
			// @ts-ignore
			editor._tickManager.updatePointerVelocity(ms)
		}

		// 1. pointer velocity should be 0 when there is no movement
		expect(editor.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0, y: 0 })

		editor.pointerMove(10, 10)

		// 2. moving is not enough, we also need to wait a frame before the velocity is updated
		expect(editor.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0, y: 0 })

		// 3. once time passes, the pointer velocity should be updated
		tick(16)
		expect(editor.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0.3125, y: 0.3125 })

		// 4. let's do it again, it should be updated again. move, tick, measure
		editor.pointerMove(20, 20)
		tick(16)
		expect(editor.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0.46875, y: 0.46875 })

		// 5. if we tick again without movement, the velocity should decay
		tick(16)

		expect(editor.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0.23437, y: 0.23437 })

		// 6. if updatePointerVelocity is (for whatever reason) called with an elapsed time of zero milliseconds, it should be ignored
		tick(0)

		expect(editor.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0.23437, y: 0.23437 })
	})
})

describe("App's default tool", () => {
	it('Is select for regular app', () => {
		editor = new TestEditor()
		expect(editor.getCurrentToolId()).toBe('select')
	})
	it('Is hand for readonly mode', () => {
		editor = new TestEditor()
		editor.updateInstanceState({ isReadonly: true })
		editor.setCurrentTool('hand')
		expect(editor.getCurrentToolId()).toBe('hand')
	})
})

describe('currentToolId', () => {
	it('is select by default', () => {
		expect(editor.getCurrentToolId()).toBe('select')
	})
	it('is set to the last used tool', () => {
		editor.setCurrentTool('draw')
		expect(editor.getCurrentToolId()).toBe('draw')

		editor.setCurrentTool('geo')
		expect(editor.getCurrentToolId()).toBe('geo')
	})
	it('stays the selected tool during shape creation interactions that technically use the select tool', () => {
		expect(editor.getCurrentToolId()).toBe('select')

		editor.setCurrentTool('geo')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 100)

		expect(editor.getCurrentToolId()).toBe('geo')
		editor.expectToBeIn('select.resizing')
	})

	it('reverts back to select if we finish the interaction', () => {
		expect(editor.getCurrentToolId()).toBe('select')

		editor.setCurrentTool('geo')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 100)

		expect(editor.getCurrentToolId()).toBe('geo')
		editor.expectToBeIn('select.resizing')

		editor.pointerUp(100, 100)

		expect(editor.getCurrentToolId()).toBe('select')
	})

	it('stays on the selected tool if we cancel the interaction', () => {
		expect(editor.getCurrentToolId()).toBe('select')

		editor.setCurrentTool('geo')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 100)

		expect(editor.getCurrentToolId()).toBe('geo')
		editor.expectToBeIn('select.resizing')

		editor.cancel()

		expect(editor.getCurrentToolId()).toBe('geo')
	})
})

describe('isFocused', () => {
	beforeEach(() => {
		// lame but duplicated here since this was moved into a hook
		const container = editor.getContainer()

		const updateFocus = debounce(() => {
			const { activeElement } = document
			const { isFocused: wasFocused } = editor.getInstanceState()
			const isFocused =
				document.hasFocus() && (container === activeElement || container.contains(activeElement))

			if (wasFocused !== isFocused) {
				editor.updateInstanceState({ isFocused })

				if (!isFocused) {
					// When losing focus, run complete() to ensure that any interacts end
					editor.complete()
				}
			}
		}, 32)

		container.addEventListener('focusin', updateFocus)
		container.addEventListener('focus', updateFocus)
		container.addEventListener('focusout', updateFocus)
		container.addEventListener('blur', updateFocus)
	})

	it('is false by default', () => {
		expect(editor.getInstanceState().isFocused).toBe(false)
	})

	it('becomes true when you call .focus()', () => {
		editor.updateInstanceState({ isFocused: true })
		expect(editor.getInstanceState().isFocused).toBe(true)
	})

	it('becomes false when you call .blur()', () => {
		editor.updateInstanceState({ isFocused: true })
		expect(editor.getInstanceState().isFocused).toBe(true)

		editor.updateInstanceState({ isFocused: false })
		expect(editor.getInstanceState().isFocused).toBe(false)
	})

	it('remains false when you call .blur()', () => {
		expect(editor.getInstanceState().isFocused).toBe(false)
		editor.updateInstanceState({ isFocused: false })
		expect(editor.getInstanceState().isFocused).toBe(false)
	})

	it('becomes true when the container div receives a focus event', () => {
		vi.advanceTimersByTime(100)
		expect(editor.getInstanceState().isFocused).toBe(false)

		editor.elm.focus()

		vi.advanceTimersByTime(100)
		expect(editor.getInstanceState().isFocused).toBe(true)
	})

	it('becomes false when the container div receives a blur event', () => {
		editor.elm.focus()

		vi.advanceTimersByTime(100)
		expect(editor.getInstanceState().isFocused).toBe(true)

		editor.elm.blur()

		vi.advanceTimersByTime(100)
		expect(editor.getInstanceState().isFocused).toBe(false)
	})

	it.skip('becomes true when a child of the app container div receives a focusin event', () => {
		// We need to skip this one because it's not actually true: the focusin event will bubble
		// to the document.body, resulting in that being the active element. In reality, the editor's
		// container would also have received a focus event, and after the editor's debounce ends,
		// the container (or one of its descendants) will be the focused element.
		editor.elm.blur()
		const child = document.createElement('div')
		editor.elm.appendChild(child)
		vi.advanceTimersByTime(100)
		expect(editor.getInstanceState().isFocused).toBe(false)
		child.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
		vi.advanceTimersByTime(100)
		expect(editor.getInstanceState().isFocused).toBe(true)
		child.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
		vi.advanceTimersByTime(100)
		expect(editor.getInstanceState().isFocused).toBe(false)
	})

	it.skip('becomes false when a child of the app container div receives a focusout event', () => {
		// This used to be true, but the focusout event doesn't actually bubble up anymore
		// after we reworked to have the focus manager handle things.
		const child = document.createElement('div')
		editor.elm.appendChild(child)

		editor.updateInstanceState({ isFocused: true })

		expect(editor.getInstanceState().isFocused).toBe(true)

		child.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))

		vi.advanceTimersByTime(100)
		expect(editor.getInstanceState().isFocused).toBe(false)
	})
})

describe('getShapeUtil', () => {
	let myUtil: any

	beforeEach(() => {
		class _MyFakeShapeUtil extends BaseBoxShapeUtil<any> {
			static override type = 'blorg'

			getDefaultProps() {
				return {
					w: 100,
					h: 100,
				}
			}
			component() {
				throw new Error('Method not implemented.')
			}
			indicator() {
				throw new Error('Method not implemented.')
			}
		}

		myUtil = _MyFakeShapeUtil

		editor = new TestEditor({
			shapeUtils: [_MyFakeShapeUtil],
		})

		editor.createShapes([
			{ id: ids.box1, type: 'blorg', x: 100, y: 100, props: { w: 100, h: 100 } },
		])
		const page1 = editor.getCurrentPageId()
		editor.createPage({ name: 'page 2', id: ids.page2 })
		editor.setCurrentPage(page1)
	})

	it('accepts shapes', () => {
		const shape = editor.getShape(ids.box1)!
		const util = editor.getShapeUtil(shape)
		expect(util).toBeInstanceOf(myUtil)
	})

	it('accepts shape types', () => {
		const util = editor.getShapeUtil('blorg')
		expect(util).toBeInstanceOf(myUtil)
	})

	it('throws if that shape type isnt registered', () => {
		const myMissingShape = { type: 'missing' } as TLShape
		expect(() => editor.getShapeUtil(myMissingShape)).toThrowErrorMatchingInlineSnapshot(
			`[Error: No shape util found for type "missing"]`
		)
	})

	it('throws if that type isnt registered', () => {
		expect(() => editor.getShapeUtil('missing')).toThrowErrorMatchingInlineSnapshot(
			`[Error: No shape util found for type "missing"]`
		)
	})
})

describe('snapshots', () => {
	it('creates and loads a snapshot', () => {
		const ids = {
			imageA: createShapeId('imageA'),
			boxA: createShapeId('boxA'),
			imageAssetA: AssetRecordType.createId('imageAssetA'),
		}

		editor.createAssets([
			{
				type: 'image',
				id: ids.imageAssetA,
				typeName: 'asset',
				props: {
					w: 1200,
					h: 800,
					name: '',
					isAnimated: false,
					mimeType: 'png',
					src: '',
				},
				meta: {},
			},
		])

		editor.createShapes([
			{ type: 'geo', x: 0, y: 0 },
			{ type: 'geo', x: 100, y: 0 },
			{
				id: ids.imageA,
				type: 'image',
				props: {
					playing: false,
					url: '',
					w: 1200,
					h: 800,
					assetId: ids.imageAssetA,
				},
				x: 0,
				y: 1200,
			},
		])

		const page2Id = PageRecordType.createId('page2')

		editor.createPage({
			id: page2Id,
		})

		editor.setCurrentPage(page2Id)

		editor.createShapes([
			{ type: 'geo', x: 0, y: 0 },
			{ type: 'geo', x: 100, y: 0 },
		])

		editor.selectAll()

		// now serialize

		const snapshot = getSnapshot(editor.store)

		const newEditor = new TestEditor()

		loadSnapshot(newEditor.store, snapshot)

		expect(editor.store.serialize()).toEqual(newEditor.store.serialize())
	})
})

describe('when the user prefers dark UI', () => {
	beforeEach(() => {
		window.matchMedia = vi.fn().mockImplementation((query) => {
			return {
				matches: query === '(prefers-color-scheme: dark)',
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}
		})
	})
	it('isDarkMode should be false by default', () => {
		editor = new TestEditor({})
		expect(editor.user.getIsDarkMode()).toBe(false)
	})
	it('isDarkMode should be false when inferDarkMode is false', () => {
		editor = new TestEditor({ inferDarkMode: false })
		expect(editor.user.getIsDarkMode()).toBe(false)
	})
	it('should be true if the editor was instantiated with inferDarkMode', () => {
		editor = new TestEditor({ inferDarkMode: true })
		expect(editor.user.getIsDarkMode()).toBe(true)
	})
})

describe('when the user prefers light UI', () => {
	beforeEach(() => {
		window.matchMedia = vi.fn().mockImplementation((query) => {
			return {
				matches: false,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}
		})
	})
	it('isDarkMode should be false by default', () => {
		editor = new TestEditor({})
		expect(editor.user.getIsDarkMode()).toBe(false)
	})
	it('isDarkMode should be false when inferDarkMode is false', () => {
		editor = new TestEditor({ inferDarkMode: false })
		expect(editor.user.getIsDarkMode()).toBe(false)
	})
	it('should be false if the editor was instantiated with inferDarkMode', () => {
		editor = new TestEditor({ inferDarkMode: true })
		expect(editor.user.getIsDarkMode()).toBe(false)
	})
})

describe('middle-click panning', () => {
	it('clears the isPanning state on mouse up', () => {
		editor.pointerDown(0, 0, {
			// middle mouse button
			button: 1,
		})
		editor.pointerMove(100, 100)
		expect(editor.inputs.isPanning).toBe(true)
		editor.pointerUp(100, 100)
		expect(editor.inputs.isPanning).toBe(false)
	})

	it('does not clear thee isPanning state if the space bar is down', () => {
		editor.pointerDown(0, 0, {
			// middle mouse button
			button: 1,
		})
		editor.pointerMove(100, 100)
		expect(editor.inputs.isPanning).toBe(true)
		editor.keyDown(' ')
		editor.pointerUp(100, 100, {
			button: 1,
		})
		expect(editor.inputs.isPanning).toBe(true)

		editor.keyUp(' ')
		expect(editor.inputs.isPanning).toBe(false)
	})
})

describe('dragging', () => {
	it('drags correctly at 100% zoom', () => {
		expect(editor.inputs.isDragging).toBe(false)
		editor.pointerMove(0, 0).pointerDown()
		expect(editor.inputs.isDragging).toBe(false)
		editor.pointerMove(0, 1)
		expect(editor.inputs.isDragging).toBe(false)
		editor.pointerMove(0, 5)
		expect(editor.inputs.isDragging).toBe(true)
	})

	it('drags correctly at 150% zoom', () => {
		editor.setCamera({ x: 0, y: 0, z: 8 }).forceTick()

		expect(editor.inputs.isDragging).toBe(false)
		editor.pointerMove(0, 0).pointerDown()
		expect(editor.inputs.isDragging).toBe(false)
		editor.pointerMove(0, 2)
		expect(editor.inputs.isDragging).toBe(false)
		editor.pointerMove(0, 5)
		expect(editor.inputs.isDragging).toBe(true)
	})

	it('drags correctly at 50% zoom', () => {
		editor.setCamera({ x: 0, y: 0, z: 0.1 }).forceTick()

		expect(editor.inputs.isDragging).toBe(false)
		editor.pointerMove(0, 0).pointerDown()
		expect(editor.inputs.isDragging).toBe(false)
		editor.pointerMove(0, 2)
		expect(editor.inputs.isDragging).toBe(false)
		editor.pointerMove(0, 5)
		expect(editor.inputs.isDragging).toBe(true)
	})
})

describe('getShapeVisibility', () => {
	const getShapeVisibility = vi.fn(((shape: TLShape) => {
		return shape.meta.visibility as any
	}) satisfies TldrawEditorProps['getShapeVisibility'])

	beforeEach(() => {
		getShapeVisibility.mockClear()
		editor = new TestEditor({ getShapeVisibility })

		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 100,
				y: 100,
				props: { w: 100, h: 100, fill: 'solid' } satisfies Partial<TLGeoShapeProps>,
			},
			{
				id: ids.box2,
				type: 'geo',
				x: 200,
				y: 200,
				props: { w: 100, h: 100, fill: 'solid' } satisfies Partial<TLGeoShapeProps>,
			},
			{
				id: ids.box3,
				type: 'geo',
				x: 300,
				y: 300,
				props: { w: 100, h: 100, fill: 'solid' } satisfies Partial<TLGeoShapeProps>,
			},
		])
	})

	it('can be directly used via editor.isShapeHidden', () => {
		expect(editor.isShapeHidden(editor.getShape(ids.box1)!)).toBe(false)
		editor.updateShape({ id: ids.box1, type: 'geo', meta: { visibility: 'hidden' } })
		expect(editor.isShapeHidden(editor.getShape(ids.box1)!)).toBe(true)
	})

	it('excludes hidden shapes from the rendering shapes array', () => {
		expect(editor.getRenderingShapes().length).toBe(3)
		editor.updateShape({ id: ids.box1, type: 'geo', meta: { visibility: 'hidden' } })
		expect(editor.getRenderingShapes().length).toBe(2)
		editor.updateShape({ id: ids.box2, type: 'geo', meta: { visibility: 'hidden' } })
		expect(editor.getRenderingShapes().length).toBe(1)
	})

	it('excludes hidden shapes from hit testing', () => {
		expect(editor.getShapeAtPoint({ x: 150, y: 150 })).toBeDefined()
		expect(editor.getShapesAtPoint({ x: 150, y: 150 }).length).toBe(1)
		editor.updateShape({ id: ids.box1, type: 'geo', meta: { visibility: 'hidden' } })
		expect(editor.getShapeAtPoint({ x: 150, y: 150 })).not.toBeDefined()
		expect(editor.getShapesAtPoint({ x: 150, y: 150 }).length).toBe(0)
	})

	it('uses the callback reactively', () => {
		const isFilteringEnabled = atom('', true)
		getShapeVisibility.mockImplementation((shape: TLShape) => {
			if (!isFilteringEnabled.get()) return 'inherit'
			return shape.meta.visibility
		})
		let renderingShapes = editor.getRenderingShapes()
		react('setRenderingShapes', () => {
			renderingShapes = editor.getRenderingShapes()
		})
		expect(renderingShapes.length).toBe(3)
		editor.updateShape({ id: ids.box1, type: 'geo', meta: { visibility: 'hidden' } })
		expect(renderingShapes.length).toBe(2)
		isFilteringEnabled.set(false)
		expect(renderingShapes.length).toBe(3)
		isFilteringEnabled.set(true)
		expect(renderingShapes.length).toBe(2)
		editor.updateShape({ id: ids.box1, type: 'geo', meta: { visibility: 'inherit' } })
		expect(renderingShapes.length).toBe(3)
	})

	it('applies recursively to children', () => {
		const groupId = createShapeId('group')
		editor.groupShapes([ids.box1, ids.box2], { groupId })

		expect(editor.isShapeHidden(editor.getShape(groupId)!)).toBe(false)
		expect(editor.isShapeHidden(editor.getShape(ids.box1)!)).toBe(false)
		editor.updateShape({ id: groupId, type: 'group', meta: { visibility: 'hidden' } })
		expect(editor.isShapeHidden(editor.getShape(groupId)!)).toBe(true)
		expect(editor.isShapeHidden(editor.getShape(ids.box1)!)).toBe(true)
	})

	it('still allows hidden shapes to be selected', () => {
		editor.updateShape({ id: ids.box1, type: 'geo', meta: { visibility: 'hidden' } })
		editor.select(ids.box1)
		expect(editor.getSelectedShapeIds()).toEqual([ids.box1])
		expect(editor.isShapeHidden(editor.getShape(ids.box1)!)).toBe(true)
	})

	it('applies to getCurrentPageRenderingShapesSorted', () => {
		expect(editor.getCurrentPageRenderingShapesSorted().length).toBe(3)
		editor.updateShape({ id: ids.box1, type: 'geo', meta: { visibility: 'hidden' } })
		expect(editor.getCurrentPageRenderingShapesSorted().length).toBe(2)
	})

	it('does not apply to getCurrentPageShapesSorted', () => {
		expect(editor.getCurrentPageShapesSorted().length).toBe(3)
		editor.updateShape({ id: ids.box1, type: 'geo', meta: { visibility: 'hidden' } })
		expect(editor.getCurrentPageShapesSorted().length).toBe(3)
	})

	it('allows overriding hidden parents with "visible" value', () => {
		const groupId = createShapeId('group')
		editor.groupShapes([ids.box1, ids.box2], { groupId })

		expect(editor.isShapeHidden(editor.getShape(groupId)!)).toBe(false)
		expect(editor.isShapeHidden(editor.getShape(ids.box1)!)).toBe(false)
		editor.updateShape({ id: groupId, type: 'group', meta: { visibility: 'hidden' } })
		expect(editor.isShapeHidden(editor.getShape(groupId)!)).toBe(true)
		expect(editor.isShapeHidden(editor.getShape(ids.box1)!)).toBe(true)
		editor.updateShape({ id: ids.box1, type: 'geo', meta: { visibility: 'visible' } })
		expect(editor.isShapeHidden(editor.getShape(groupId)!)).toBe(true)
		expect(editor.isShapeHidden(editor.getShape(ids.box1)!)).toBe(false)
	})
})

describe('instance.isReadonly', () => {
	it('updates in accordance with collaboration.mode', () => {
		const mode = atom<'readonly' | 'readwrite'>('', 'readonly')
		const editor = new TestEditor(
			{},
			{
				collaboration: {
					mode,
					status: atom('', 'online'),
				},
			}
		)

		expect(editor.getIsReadonly()).toBe(true)

		mode.set('readwrite')
		expect(editor.getIsReadonly()).toBe(false)
		mode.set('readonly')
		expect(editor.getIsReadonly()).toBe(true)
	})
})

describe('the geometry cache', () => {
	class CustomShapeUtil extends BaseBoxShapeUtil<any> {
		static override type = 'custom'

		getDefaultProps() {
			return {
				w: 100,
				h: 100,
			}
		}
		override getGeometry(shape: any): Geometry2d {
			return new Rectangle2d({
				width: shape.meta.double ? shape.props.w * 2 : shape.props.w,
				height: shape.meta.double ? shape.props.h * 2 : shape.props.h,
				isFilled: true,
			})
		}
		component() {
			throw new Error('Method not implemented.')
		}
		indicator() {
			throw new Error('Method not implemented.')
		}
	}
	it('should be busted when meta changes', () => {
		editor = new TestEditor({
			shapeUtils: [CustomShapeUtil],
		})
		const { A } = editor.createShapesFromJsx([<TL.custom ref="A" x={0} y={0} w={100} h={100} />])
		expect(editor.getShapePageBounds(A)!.width).toBe(100)
		editor.updateShape({ id: A, type: 'custom', meta: { double: true } })
		expect(editor.getShapePageBounds(A)!.width).toBe(200)
	})
})
describe('editor.getShapePageBounds', () => {
	it('calculates axis aligned bounds correctly', () => {
		editor.createShape({
			type: 'geo',
			x: 99,
			y: 88,
			props: {
				w: 199,
				h: 188,
			},
		})
		const shape = editor.getLastCreatedShape()
		expect(editor.getShapePageBounds(shape)!).toMatchInlineSnapshot(`
	Box {
	  "h": 188,
	  "w": 199,
	  "x": 99,
	  "y": 88,
	}
`)
	})

	it('calculates rotated bounds correctly', () => {
		editor.createShape({
			type: 'geo',
			x: 99,
			y: 88,
			rotation: Math.PI / 4,
			props: {
				w: 199,
				h: 188,
			},
		})
		const shape = editor.getLastCreatedShape()
		expect(editor.getShapePageBounds(shape)!).toMatchInlineSnapshot(`
	Box {
	  "h": 273.65032431919394,
	  "w": 273.6503243191939,
	  "x": -33.93607486307093,
	  "y": 88,
	}
`)
	})

	it('calculates bounds based on vertices, not corners', () => {
		editor.createShape({
			type: 'geo',
			x: 99,
			y: 88,
			rotation: Math.PI / 4,
			props: {
				geo: 'ellipse',
				w: 199,
				h: 188,
			},
		})
		const shape = editor.getLastCreatedShape()
		expect(editor.getShapePageBounds(shape)!).toMatchInlineSnapshot(`
	Box {
	  "h": 193.49999999999997,
	  "w": 193.50000000000003,
	  "x": 6.139087296526014,
	  "y": 128.07516215959694,
	}
`)
	})
})
