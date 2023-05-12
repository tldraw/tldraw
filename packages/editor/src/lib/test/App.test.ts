import { createCustomShapeId, TLPage } from '@tldraw/tlschema'
import { structuredClone } from '@tldraw/utils'
import { TestApp } from './TestApp'

let app: TestApp

const ids = {
	box1: createCustomShapeId('box1'),
	box2: createCustomShapeId('box2'),
	box3: createCustomShapeId('box3'),
	frame1: createCustomShapeId('frame1'),
	group1: createCustomShapeId('group1'),

	page2: TLPage.createCustomId('page2'),
}

beforeEach(() => {
	app = new TestApp()

	app.createShapes([
		// on it's own
		{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
		// in a frame
		{ id: ids.frame1, type: 'frame', x: 100, y: 100, props: { w: 100, h: 100 } },
		{ id: ids.box2, type: 'geo', x: 700, y: 700, props: { w: 100, h: 100 }, parentId: ids.frame1 },

		{ id: ids.group1, type: 'group', x: 100, y: 100, props: {} },
		{ id: ids.box3, type: 'geo', x: 500, y: 500, props: { w: 100, h: 100 }, parentId: ids.group1 },
	])

	const page1 = app.currentPageId
	app.createPage('page 2', ids.page2)
	app.setCurrentPageId(page1)
})

const moveShapesToPage2 = () => {
	// directly maniuplate parentId like would happen in multiplayer situations

	app.updateShapes([
		{ id: ids.box1, type: 'geo', parentId: ids.page2 },
		{ id: ids.box2, type: 'geo', parentId: ids.page2 },
		{ id: ids.group1, type: 'group', parentId: ids.page2 },
	])
}

describe('shapes that are moved to another page', () => {
	it("should be excluded from the previous page's focusLayerId", () => {
		app.setFocusLayer(ids.group1)
		expect(app.focusLayerId).toBe(ids.group1)
		moveShapesToPage2()
		expect(app.focusLayerId).toBe(app.currentPageId)
	})

	describe("should be excluded from the previous page's hintingIds", () => {
		test('[boxes]', () => {
			app.setHintingIds([ids.box1, ids.box2, ids.box3])
			expect(app.hintingIds).toEqual([ids.box1, ids.box2, ids.box3])
			moveShapesToPage2()
			expect(app.hintingIds).toEqual([])
		})
		test('[frame that does not move]', () => {
			app.setHintingIds([ids.frame1])
			expect(app.hintingIds).toEqual([ids.frame1])
			moveShapesToPage2()
			expect(app.hintingIds).toEqual([ids.frame1])
		})
	})

	describe("should be excluded from the previous page's editingId", () => {
		test('[root shape]', () => {
			app.setEditingId(ids.box1)
			expect(app.editingId).toBe(ids.box1)
			moveShapesToPage2()
			expect(app.editingId).toBe(null)
		})
		test('[child of frame]', () => {
			app.setEditingId(ids.box2)
			expect(app.editingId).toBe(ids.box2)
			moveShapesToPage2()
			expect(app.editingId).toBe(null)
		})
		test('[child of group]', () => {
			app.setEditingId(ids.box3)
			expect(app.editingId).toBe(ids.box3)
			moveShapesToPage2()
			expect(app.editingId).toBe(null)
		})
		test('[frame that doesnt move]', () => {
			app.setEditingId(ids.frame1)
			expect(app.editingId).toBe(ids.frame1)
			moveShapesToPage2()
			expect(app.editingId).toBe(ids.frame1)
		})
	})

	describe("should be excluded from the previous page's erasingIds", () => {
		test('[boxes]', () => {
			app.setErasingIds([ids.box1, ids.box2, ids.box3])
			expect(app.erasingIds).toEqual([ids.box1, ids.box2, ids.box3])
			moveShapesToPage2()
			expect(app.erasingIds).toEqual([])
		})
		test('[frame that does not move]', () => {
			app.setErasingIds([ids.frame1])
			expect(app.erasingIds).toEqual([ids.frame1])
			moveShapesToPage2()
			expect(app.erasingIds).toEqual([ids.frame1])
		})
	})

	describe("should be excluded from the previous page's selectedIds", () => {
		test('[boxes]', () => {
			app.setSelectedIds([ids.box1, ids.box2, ids.box3])
			expect(app.selectedIds).toEqual([ids.box1, ids.box2, ids.box3])
			moveShapesToPage2()
			expect(app.selectedIds).toEqual([])
		})
		test('[frame that does not move]', () => {
			app.setSelectedIds([ids.frame1])
			expect(app.selectedIds).toEqual([ids.frame1])
			moveShapesToPage2()
			expect(app.selectedIds).toEqual([ids.frame1])
		})
	})
})

it('Begins dragging from pointer move', () => {
	app.pointerDown(0, 0)
	app.pointerMove(2, 2)
	expect(app.inputs.isDragging).toBe(false)
	app.pointerMove(10, 10)
	expect(app.inputs.isDragging).toBe(true)
})

it('Begins dragging from wheel', () => {
	app.pointerDown(0, 0)
	app.wheel(2, 2)
	expect(app.inputs.isDragging).toBe(false)
	app.wheel(10, 10)
	expect(app.inputs.isDragging).toBe(true)
})

it('Does not create an undo stack item when first clicking on an empty canvas', () => {
	app = new TestApp()
	app.pointerMove(50, 50)
	app.click(0, 0)
	expect(app.canUndo).toBe(false)
})

describe('App.setProp', () => {
	it('Does not set non-style props on propsForNextShape', () => {
		const initialPropsForNextShape = structuredClone(app.instanceState.propsForNextShape)
		app.setProp('w', 100)
		app.setProp('url', 'https://example.com')
		expect(app.instanceState.propsForNextShape).toStrictEqual(initialPropsForNextShape)
	})
})

describe('App.TickManager', () => {
	it('Does not produce NaN values when elapsed is 0', () => {
		// a helper that calls update pointer velocity with a given elapsed time.
		// usually this is called by the app's tick manager, using the elapsed time
		// between two animation frames, but we're calling it directly here.
		const tick = (ms: number) => {
			// @ts-expect-error
			app._tickManager.updatePointerVelocity(ms)
		}

		// 1. pointer velocity should be 0 when there is no movement
		expect(app.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0, y: 0 })

		app.pointerMove(10, 10)

		// 2. moving is not enough, we also need to wait a frame before the velocity is updated
		expect(app.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0, y: 0 })

		// 3. once time passes, the pointer velocity should be updated
		tick(16)
		expect(app.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0.3125, y: 0.3125 })

		// 4. let's do it again, it should be updated again. move, tick, measure
		app.pointerMove(20, 20)
		tick(16)
		expect(app.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0.46875, y: 0.46875 })

		// 5. if we tick again without movement, the velocity should decay
		tick(16)

		expect(app.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0.23437, y: 0.23437 })

		// 6. if updatePointerVelocity is (for whatever reason) called with an elapsed time of zero milliseconds, it should be ignored
		tick(0)

		expect(app.inputs.pointerVelocity.toJson()).toCloselyMatchObject({ x: 0.23437, y: 0.23437 })
	})
})

describe("App's default tool", () => {
	it('Is select for regular app', () => {
		app = new TestApp()
		expect(app.currentToolId).toBe('select')
	})
	it('Is hand for readonly mode', () => {
		app = new TestApp()
		app.setReadOnly(true)
		expect(app.currentToolId).toBe('hand')
	})
})

describe('currentToolId', () => {
	it('is select by default', () => {
		expect(app.currentToolId).toBe('select')
	})
	it('is set to the last used tool', () => {
		app.setSelectedTool('draw')
		expect(app.currentToolId).toBe('draw')

		app.setSelectedTool('geo')
		expect(app.currentToolId).toBe('geo')
	})
	it('stays the selected tool during shape creation interactions that technically use the select tool', () => {
		expect(app.currentToolId).toBe('select')

		app.setSelectedTool('geo')
		app.pointerDown(0, 0)
		app.pointerMove(100, 100)

		expect(app.currentToolId).toBe('geo')
		expect(app.root.path.value).toBe('root.select.resizing')
	})

	it('reverts back to select if we finish the interaction', () => {
		expect(app.currentToolId).toBe('select')

		app.setSelectedTool('geo')
		app.pointerDown(0, 0)
		app.pointerMove(100, 100)

		expect(app.currentToolId).toBe('geo')
		expect(app.root.path.value).toBe('root.select.resizing')

		app.pointerUp(100, 100)

		expect(app.currentToolId).toBe('select')
	})

	it('stays on the selected tool if we cancel the interaction', () => {
		expect(app.currentToolId).toBe('select')

		app.setSelectedTool('geo')
		app.pointerDown(0, 0)
		app.pointerMove(100, 100)

		expect(app.currentToolId).toBe('geo')
		expect(app.root.path.value).toBe('root.select.resizing')

		app.cancel()

		expect(app.currentToolId).toBe('geo')
	})
})

describe('isFocused', () => {
	it('is false by default', () => {
		expect(app.isFocused).toBe(false)
	})

	it('becomes true when you call .focus()', () => {
		app.focus()
		expect(app.isFocused).toBe(true)
	})

	it('becomes false when you call .blur()', () => {
		app.focus()
		expect(app.isFocused).toBe(true)

		app.blur()
		expect(app.isFocused).toBe(false)
	})

	it('remains false when you call .blur()', () => {
		expect(app.isFocused).toBe(false)
		app.blur()
		expect(app.isFocused).toBe(false)
	})

	it('becomes true when the container div receives a focus event', () => {
		expect(app.isFocused).toBe(false)

		app.elm.focus()

		expect(app.isFocused).toBe(true)
	})

	it('becomes false when the container div receives a blur event', () => {
		app.focus()
		expect(app.isFocused).toBe(true)

		app.elm.blur()

		expect(app.isFocused).toBe(false)
	})

	it('becomes true when a child of the app container div receives a focusin event', () => {
		app.elm.blur()

		const child = document.createElement('div')
		app.elm.appendChild(child)

		expect(app.isFocused).toBe(false)

		child.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

		expect(app.isFocused).toBe(true)

		child.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))

		expect(app.isFocused).toBe(false)
	})

	it('becomes false when a child of the app container div receives a focusout event', () => {
		const child = document.createElement('div')
		app.elm.appendChild(child)

		app.focus()

		expect(app.isFocused).toBe(true)

		child.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))

		expect(app.isFocused).toBe(false)
	})

	it('calls .focus() and .blur() on the container div when you call .focus() and .blur() on the editor', () => {
		const focusMock = jest.spyOn(app.elm, 'focus').mockImplementation()
		const blurMock = jest.spyOn(app.elm, 'blur').mockImplementation()

		expect(focusMock).not.toHaveBeenCalled()
		expect(blurMock).not.toHaveBeenCalled()

		app.focus()

		expect(focusMock).toHaveBeenCalled()
		expect(blurMock).not.toHaveBeenCalled()

		app.blur()

		expect(blurMock).toHaveBeenCalled()
	})
})
