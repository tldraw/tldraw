import { PageRecordType, TLShape, createShapeId } from '@tldraw/tlschema'
import { BaseBoxShapeUtil } from '../editor/shapes/BaseBoxShapeUtil'
import { GeoShapeUtil } from '../editor/shapes/geo/GeoShapeUtil'
import { TestEditor } from './TestEditor'
import { TL } from './jsx'

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
	editor = new TestEditor()

	editor.createShapes([
		// on it's own
		{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
		// in a frame
		{ id: ids.frame1, type: 'frame', x: 100, y: 100, props: { w: 100, h: 100 } },
		{ id: ids.box2, type: 'geo', x: 700, y: 700, props: { w: 100, h: 100 }, parentId: ids.frame1 },

		{ id: ids.group1, type: 'group', x: 100, y: 100, props: {} },
		{ id: ids.box3, type: 'geo', x: 500, y: 500, props: { w: 100, h: 100 }, parentId: ids.group1 },
	])

	const page1 = editor.currentPageId
	editor.createPage('page 2', ids.page2)
	editor.setCurrentPageId(page1)
})

const moveShapesToPage2 = () => {
	// directly maniuplate parentId like would happen in multiplayer situations

	editor.updateShapes([
		{ id: ids.box1, type: 'geo', parentId: ids.page2 },
		{ id: ids.box2, type: 'geo', parentId: ids.page2 },
		{ id: ids.group1, type: 'group', parentId: ids.page2 },
	])
}

describe('shapes that are moved to another page', () => {
	it("should be excluded from the previous page's focusLayerId", () => {
		editor.setFocusLayer(ids.group1)
		expect(editor.focusLayerId).toBe(ids.group1)
		moveShapesToPage2()
		expect(editor.focusLayerId).toBe(editor.currentPageId)
	})

	describe("should be excluded from the previous page's hintingIds", () => {
		test('[boxes]', () => {
			editor.setHintingIds([ids.box1, ids.box2, ids.box3])
			expect(editor.hintingIds).toEqual([ids.box1, ids.box2, ids.box3])
			moveShapesToPage2()
			expect(editor.hintingIds).toEqual([])
		})
		test('[frame that does not move]', () => {
			editor.setHintingIds([ids.frame1])
			expect(editor.hintingIds).toEqual([ids.frame1])
			moveShapesToPage2()
			expect(editor.hintingIds).toEqual([ids.frame1])
		})
	})

	describe("should be excluded from the previous page's editingId", () => {
		test('[root shape]', () => {
			editor.setEditingId(ids.box1)
			expect(editor.editingId).toBe(ids.box1)
			moveShapesToPage2()
			expect(editor.editingId).toBe(null)
		})
		test('[child of frame]', () => {
			editor.setEditingId(ids.box2)
			expect(editor.editingId).toBe(ids.box2)
			moveShapesToPage2()
			expect(editor.editingId).toBe(null)
		})
		test('[child of group]', () => {
			editor.setEditingId(ids.box3)
			expect(editor.editingId).toBe(ids.box3)
			moveShapesToPage2()
			expect(editor.editingId).toBe(null)
		})
		test('[frame that doesnt move]', () => {
			editor.setEditingId(ids.frame1)
			expect(editor.editingId).toBe(ids.frame1)
			moveShapesToPage2()
			expect(editor.editingId).toBe(ids.frame1)
		})
	})

	describe("should be excluded from the previous page's erasingIds", () => {
		test('[boxes]', () => {
			editor.setErasingIds([ids.box1, ids.box2, ids.box3])
			expect(editor.erasingIds).toEqual([ids.box1, ids.box2, ids.box3])
			moveShapesToPage2()
			expect(editor.erasingIds).toEqual([])
		})
		test('[frame that does not move]', () => {
			editor.setErasingIds([ids.frame1])
			expect(editor.erasingIds).toEqual([ids.frame1])
			moveShapesToPage2()
			expect(editor.erasingIds).toEqual([ids.frame1])
		})
	})

	describe("should be excluded from the previous page's selectedIds", () => {
		test('[boxes]', () => {
			editor.setSelectedIds([ids.box1, ids.box2, ids.box3])
			expect(editor.selectedIds).toEqual([ids.box1, ids.box2, ids.box3])
			moveShapesToPage2()
			expect(editor.selectedIds).toEqual([])
		})
		test('[frame that does not move]', () => {
			editor.setSelectedIds([ids.frame1])
			expect(editor.selectedIds).toEqual([ids.frame1])
			moveShapesToPage2()
			expect(editor.selectedIds).toEqual([ids.frame1])
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
	expect(editor.canUndo).toBe(false)
})

describe('Editor.sharedOpacity', () => {
	it('should return the current opacity', () => {
		expect(editor.sharedOpacity).toStrictEqual({ type: 'shared', value: 1 })
		editor.setOpacity(0.5)
		expect(editor.sharedOpacity).toStrictEqual({ type: 'shared', value: 0.5 })
	})

	it('should return opacity for a single selected shape', () => {
		const { A } = editor.createShapesFromJsx(<TL.geo ref="A" opacity={0.3} x={0} y={0} />)
		editor.setSelectedIds([A])
		expect(editor.sharedOpacity).toStrictEqual({ type: 'shared', value: 0.3 })
	})

	it('should return opacity for multiple selected shapes', () => {
		const { A, B } = editor.createShapesFromJsx([
			<TL.geo ref="A" opacity={0.3} x={0} y={0} />,
			<TL.geo ref="B" opacity={0.3} x={0} y={0} />,
		])
		editor.setSelectedIds([A, B])
		expect(editor.sharedOpacity).toStrictEqual({ type: 'shared', value: 0.3 })
	})

	it('should return mixed when multiple selected shapes have different opacity', () => {
		const { A, B } = editor.createShapesFromJsx([
			<TL.geo ref="A" opacity={0.3} x={0} y={0} />,
			<TL.geo ref="B" opacity={0.5} x={0} y={0} />,
		])
		editor.setSelectedIds([A, B])
		expect(editor.sharedOpacity).toStrictEqual({ type: 'mixed' })
	})

	it('ignores the opacity of groups and returns the opacity of their children', () => {
		const ids = editor.createShapesFromJsx([
			<TL.group ref="group" x={0} y={0}>
				<TL.geo ref="A" opacity={0.3} x={0} y={0} />
			</TL.group>,
		])
		editor.setSelectedIds([ids.group])
		expect(editor.sharedOpacity).toStrictEqual({ type: 'shared', value: 0.3 })
	})
})

describe('Editor.setOpacity', () => {
	it('should set opacity for selected shapes', () => {
		const ids = editor.createShapesFromJsx([
			<TL.geo ref="A" opacity={0.3} x={0} y={0} />,
			<TL.geo ref="B" opacity={0.4} x={0} y={0} />,
		])

		editor.setSelectedIds([ids.A, ids.B])
		editor.setOpacity(0.5)

		expect(editor.getShapeById(ids.A)!.opacity).toBe(0.5)
		expect(editor.getShapeById(ids.B)!.opacity).toBe(0.5)
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

		editor.setSelectedIds([ids.groupA])
		editor.setOpacity(0.5)

		// a wasn't selected...
		expect(editor.getShapeById(ids.boxA)!.opacity).toBe(1)

		// b, c, & d were within a selected group...
		expect(editor.getShapeById(ids.boxB)!.opacity).toBe(0.5)
		expect(editor.getShapeById(ids.boxC)!.opacity).toBe(0.5)
		expect(editor.getShapeById(ids.boxD)!.opacity).toBe(0.5)

		// groups get skipped
		expect(editor.getShapeById(ids.groupA)!.opacity).toBe(1)
		expect(editor.getShapeById(ids.groupB)!.opacity).toBe(1)
	})

	it('stores opacity on opacityForNextShape', () => {
		editor.setOpacity(0.5)
		expect(editor.instanceState.opacityForNextShape).toBe(0.5)
		editor.setOpacity(0.6)
		expect(editor.instanceState.opacityForNextShape).toBe(0.6)
	})
})

describe('Editor.TickManager', () => {
	it('Does not produce NaN values when elapsed is 0', () => {
		// a helper that calls update pointer velocity with a given elapsed time.
		// usually this is called by the app's tick manager, using the elapsed time
		// between two animation frames, but we're calling it directly here.
		const tick = (ms: number) => {
			// @ts-expect-error
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
		expect(editor.currentToolId).toBe('select')
	})
	it('Is hand for readonly mode', () => {
		editor = new TestEditor()
		editor.setReadOnly(true)
		expect(editor.currentToolId).toBe('hand')
	})
})

describe('currentToolId', () => {
	it('is select by default', () => {
		expect(editor.currentToolId).toBe('select')
	})
	it('is set to the last used tool', () => {
		editor.setSelectedTool('draw')
		expect(editor.currentToolId).toBe('draw')

		editor.setSelectedTool('geo')
		expect(editor.currentToolId).toBe('geo')
	})
	it('stays the selected tool during shape creation interactions that technically use the select tool', () => {
		expect(editor.currentToolId).toBe('select')

		editor.setSelectedTool('geo')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 100)

		expect(editor.currentToolId).toBe('geo')
		expect(editor.root.path.value).toBe('root.select.resizing')
	})

	it('reverts back to select if we finish the interaction', () => {
		expect(editor.currentToolId).toBe('select')

		editor.setSelectedTool('geo')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 100)

		expect(editor.currentToolId).toBe('geo')
		expect(editor.root.path.value).toBe('root.select.resizing')

		editor.pointerUp(100, 100)

		expect(editor.currentToolId).toBe('select')
	})

	it('stays on the selected tool if we cancel the interaction', () => {
		expect(editor.currentToolId).toBe('select')

		editor.setSelectedTool('geo')
		editor.pointerDown(0, 0)
		editor.pointerMove(100, 100)

		expect(editor.currentToolId).toBe('geo')
		expect(editor.root.path.value).toBe('root.select.resizing')

		editor.cancel()

		expect(editor.currentToolId).toBe('geo')
	})
})

describe('isFocused', () => {
	it('is false by default', () => {
		expect(editor.isFocused).toBe(false)
	})

	it('becomes true when you call .focus()', () => {
		editor.focus()
		expect(editor.isFocused).toBe(true)
	})

	it('becomes false when you call .blur()', () => {
		editor.focus()
		expect(editor.isFocused).toBe(true)

		editor.blur()
		expect(editor.isFocused).toBe(false)
	})

	it('remains false when you call .blur()', () => {
		expect(editor.isFocused).toBe(false)
		editor.blur()
		expect(editor.isFocused).toBe(false)
	})

	it('becomes true when the container div receives a focus event', () => {
		expect(editor.isFocused).toBe(false)

		editor.elm.focus()

		expect(editor.isFocused).toBe(true)
	})

	it('becomes false when the container div receives a blur event', () => {
		editor.focus()
		expect(editor.isFocused).toBe(true)

		editor.elm.blur()

		expect(editor.isFocused).toBe(false)
	})

	it('becomes true when a child of the app container div receives a focusin event', () => {
		editor.elm.blur()

		const child = document.createElement('div')
		editor.elm.appendChild(child)

		expect(editor.isFocused).toBe(false)

		child.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

		expect(editor.isFocused).toBe(true)

		child.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))

		expect(editor.isFocused).toBe(false)
	})

	it('becomes false when a child of the app container div receives a focusout event', () => {
		const child = document.createElement('div')
		editor.elm.appendChild(child)

		editor.focus()

		expect(editor.isFocused).toBe(true)

		child.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))

		expect(editor.isFocused).toBe(false)
	})

	it('calls .focus() and .blur() on the container div when you call .focus() and .blur() on the editor', () => {
		const focusMock = jest.spyOn(editor.elm, 'focus').mockImplementation()
		const blurMock = jest.spyOn(editor.elm, 'blur').mockImplementation()

		expect(focusMock).not.toHaveBeenCalled()
		expect(blurMock).not.toHaveBeenCalled()

		editor.focus()

		expect(focusMock).toHaveBeenCalled()
		expect(blurMock).not.toHaveBeenCalled()

		editor.blur()

		expect(blurMock).toHaveBeenCalled()
	})
})

describe('getShapeUtil', () => {
	it('accepts shapes', () => {
		const geoShape = editor.getShapeById(ids.box1)!
		const geoUtil = editor.getShapeUtil(geoShape)
		expect(geoUtil).toBeInstanceOf(GeoShapeUtil)
	})

	it('accepts shape utils', () => {
		const geoUtil = editor.getShapeUtil(GeoShapeUtil)
		expect(geoUtil).toBeInstanceOf(GeoShapeUtil)
	})

	it('throws if that shape type isnt registered', () => {
		const myFakeShape = { type: 'fake' } as TLShape
		expect(() => editor.getShapeUtil(myFakeShape)).toThrowErrorMatchingInlineSnapshot(
			`"No shape util found for type \\"fake\\""`
		)

		class MyFakeShapeUtil extends BaseBoxShapeUtil<any> {
			static type = 'fake'

			getDefaultProps() {
				throw new Error('Method not implemented.')
			}
			component() {
				throw new Error('Method not implemented.')
			}
			indicator() {
				throw new Error('Method not implemented.')
			}
		}

		expect(() => editor.getShapeUtil(MyFakeShapeUtil)).toThrowErrorMatchingInlineSnapshot(
			`"No shape util found for type \\"fake\\""`
		)
	})

	it("throws if a shape util that isn't the one registered is passed in", () => {
		class MyFakeGeoShapeUtil extends BaseBoxShapeUtil<any> {
			static type = 'geo'

			getDefaultProps() {
				throw new Error('Method not implemented.')
			}
			component() {
				throw new Error('Method not implemented.')
			}
			indicator() {
				throw new Error('Method not implemented.')
			}
		}
		expect(() => editor.getShapeUtil(MyFakeGeoShapeUtil)).toThrowErrorMatchingInlineSnapshot(
			`"Shape util found for type \\"geo\\" is not an instance of the provided constructor"`
		)
	})
})
