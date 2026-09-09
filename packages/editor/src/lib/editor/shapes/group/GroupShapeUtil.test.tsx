import { render } from '@testing-library/react'
import { RecordProps, TLGroupShape, TLShape, TLShapeId, createShapeId } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { vi } from 'vitest'
import { EditorProvider } from '../../../hooks/useEditor'
import { Group2d } from '../../../primitives/geometry/Group2d'
import { Rectangle2d } from '../../../primitives/geometry/Rectangle2d'
import { TestEditor } from '../../../test/TestEditor'
import { TEST_BOX_TYPE as BOX_TYPE } from '../../../test/testShapeTypes'
import { StateNode } from '../../tools/StateNode'
import { BaseBoxShapeUtil } from '../BaseBoxShapeUtil'
import { GroupShapeUtil } from './GroupShapeUtil'

type IBoxShape = TLShape<typeof BOX_TYPE>

class TestBoxShapeUtil extends BaseBoxShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = { w: T.number, h: T.number }
	getDefaultProps(): IBoxShape['props'] {
		return { w: 100, h: 50 }
	}
	getIndicatorPath() {
		return undefined
	}
	component() {
		return null
	}
}

class SelectIdle extends StateNode {
	static override id = 'idle'
}

// groupShapes only runs while a tool with the id 'select' is active
class SelectTool extends StateNode {
	static override id = 'select'
	static override initial = 'idle'
	static override children() {
		return [SelectIdle]
	}
}

// jsdom has no Path2D; record the segments so the indicator can be inspected
class RecordingPath2D {
	segments: Array<['moveTo' | 'lineTo', number, number]> = []
	moveTo(x: number, y: number) {
		this.segments.push(['moveTo', x, y])
	}
	lineTo(x: number, y: number) {
		this.segments.push(['lineTo', x, y])
	}
}

let editor: TestEditor
let util: GroupShapeUtil
const boxAId = createShapeId('boxA')
const boxBId = createShapeId('boxB')
const boxCId = createShapeId('boxC')

function roundBox(box: { x: number; y: number; w: number; h: number }) {
	const r = (n: number) => Math.round(n * 1000) / 1000
	return { x: r(box.x), y: r(box.y), w: r(box.w), h: r(box.h) }
}

function groupBoxes(ids: TLShapeId[]) {
	const groupId = createShapeId()
	editor.groupShapes(ids, { groupId })
	return editor.getShape<TLGroupShape>(groupId)!
}

beforeEach(() => {
	editor = new TestEditor({
		shapeUtils: [TestBoxShapeUtil],
		tools: [SelectTool],
		initialState: 'select',
	})
	util = editor.getShapeUtil('group') as GroupShapeUtil
	editor.createShapes([
		{ id: boxAId, type: BOX_TYPE, x: 10, y: 10 },
		{ id: boxBId, type: BOX_TYPE, x: 200, y: 100, props: { w: 50, h: 50 } },
		{ id: boxCId, type: BOX_TYPE, x: 500, y: 500 },
	])
})

afterEach(() => {
	editor.dispose()
})

describe('GroupShapeUtil', () => {
	it('is registered as a core shape util', () => {
		expect(util).toBeInstanceOf(GroupShapeUtil)
		expect(GroupShapeUtil.type).toBe('group')
		expect(util.getDefaultProps()).toEqual({})
	})

	it('hides the selection foreground but not the background, and refuses bindings', () => {
		const group = groupBoxes([boxAId, boxBId])
		expect(util.hideSelectionBoundsFg(group)).toBe(true)
		expect(util.hideSelectionBoundsBg(group)).toBe(false)
		expect(util.canBind()).toBe(false)
		expect(util.canResize()).toBe(true)
		expect(util.canResizeChildren()).toBe(true)
	})

	describe('getGeometry', () => {
		it('is a 1x1 unfilled rectangle for a group without children', () => {
			const groupId = createShapeId('empty')
			editor.createShape({ id: groupId, type: 'group', x: 0, y: 0 })
			const geometry = editor.getShapeGeometry(groupId)
			expect(geometry).toBeInstanceOf(Rectangle2d)
			expect(geometry.isFilled).toBe(false)
			expect(geometry.bounds.toJson()).toEqual({ x: 0, y: 0, w: 1, h: 1 })
		})

		it('is a Group2d of the child geometries in group space', () => {
			const group = groupBoxes([boxAId, boxBId])
			expect(group).toMatchObject({ x: 10, y: 10 })

			const geometry = editor.getShapeGeometry(group)
			expect(geometry).toBeInstanceOf(Group2d)
			expect((geometry as Group2d).children).toHaveLength(2)
			expect(geometry.bounds.toJson()).toEqual({ x: 0, y: 0, w: 240, h: 140 })
			expect(editor.getShapePageBounds(group)!.toJson()).toEqual({ x: 10, y: 10, w: 240, h: 140 })
		})

		it('accounts for rotated children', () => {
			editor.updateShape({ id: boxBId, type: BOX_TYPE, rotation: Math.PI / 2 })
			const group = groupBoxes([boxAId, boxBId])
			// box B pivots around its top-left (200, 100) to occupy x 150..200, y 100..150
			expect(roundBox(editor.getShapePageBounds(group)!)).toEqual({ x: 10, y: 10, w: 190, h: 140 })
			expect(roundBox(editor.getShapeGeometry(group).bounds)).toEqual({
				x: 0,
				y: 0,
				w: 190,
				h: 140,
			})
		})

		it('updates when a child moves', () => {
			const group = groupBoxes([boxAId, boxBId])
			// child coordinates are in group space
			editor.updateShape({ id: boxBId, type: BOX_TYPE, x: 400 })
			expect(editor.getShapeGeometry(group).bounds.toJson()).toEqual({ x: 0, y: 0, w: 450, h: 140 })
		})
	})

	describe('onChildrenChange', () => {
		it('keeps the group when at least two children remain', () => {
			const group = groupBoxes([boxAId, boxBId, boxCId])
			editor.deleteShape(boxCId)
			expect(editor.getShape(group.id)).toBeDefined()
			expect(editor.getSortedChildIdsForParent(group.id)).toEqual([boxAId, boxBId])
		})

		it('dissolves the group into its last child at the group position in the stack', () => {
			const group = groupBoxes([boxAId, boxBId])
			editor.sendToBack([group.id])
			editor.deleteShape(boxAId)

			expect(editor.getShape(group.id)).toBeUndefined()
			expect(editor.getShape(boxBId)).toMatchObject({
				parentId: editor.getCurrentPageId(),
				x: 200,
				y: 100,
			})
			expect(editor.getSortedChildIdsForParent(editor.getCurrentPageId())).toEqual([boxBId, boxCId])
		})

		it('deletes a group whose children have all been removed', () => {
			const group = groupBoxes([boxAId, boxBId])
			editor.deleteShapes([boxAId, boxBId])
			expect(editor.getShape(group.id)).toBeUndefined()
			expect(editor.getCurrentPageShapeIds()).toEqual(new Set([boxCId]))
		})

		it('reparents the last child into the enclosing group', () => {
			const inner = groupBoxes([boxAId, boxBId])
			const outer = groupBoxes([inner.id, boxCId])
			editor.deleteShape(boxAId)

			expect(editor.getShape(inner.id)).toBeUndefined()
			expect(editor.getShape(boxBId)!.parentId).toBe(outer.id)
			expect(editor.getShapePageBounds(boxBId)!.toJson()).toEqual({ x: 200, y: 100, w: 50, h: 50 })
		})

		it('pops the focused group when it dissolves', () => {
			const group = groupBoxes([boxAId, boxBId])
			editor.setFocusedGroup(group.id)
			expect(editor.getFocusedGroupId()).toBe(group.id)

			editor.deleteShape(boxAId)

			expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
		})

		it('pops the focused group when it empties', () => {
			const group = groupBoxes([boxAId, boxBId])
			editor.setFocusedGroup(group.id)

			editor.deleteShapes([boxAId, boxBId])

			expect(editor.getShape(group.id)).toBeUndefined()
			expect(editor.getFocusedGroupId()).toBe(editor.getCurrentPageId())
		})
	})

	describe('component', () => {
		function renderGroup(group: TLGroupShape) {
			return render(<EditorProvider editor={editor}>{util.component(group)}</EditorProvider>)
		}

		it('renders nothing while the group is not focused', () => {
			const group = groupBoxes([boxAId, boxBId])
			expect(util.component(group)).toBeNull()
		})

		it('renders a dashed outline around the group bounds while focused', () => {
			const group = groupBoxes([boxAId, boxBId])
			editor.setFocusedGroup(group.id)

			const { container } = renderGroup(group)
			const lines = Array.from(container.querySelectorAll('g.tl-group line'))
			expect(lines).toHaveLength(4)
			expect(
				lines.map((line) => [
					Number(line.getAttribute('x1')),
					Number(line.getAttribute('y1')),
					Number(line.getAttribute('x2')),
					Number(line.getAttribute('y2')),
				])
			).toEqual([
				[0, 0, 240, 0],
				[240, 0, 240, 140],
				[240, 140, 0, 140],
				[0, 140, 0, 0],
			])
			// 240px at zoom 1: 30 dashes of 244 / 60 with gaps of (244 - 122) / 29
			expect(lines[0].getAttribute('stroke-dasharray')).toBe('4.066666666666666 4.206896551724138')
			expect(lines[0].getAttribute('stroke-dashoffset')).toBe('2')
			// 140px: 18 dashes of 4 with gaps of (144 - 72) / 17
			expect(lines[1].getAttribute('stroke-dasharray')).toBe('4 4.235294117647059')
		})

		it('renders the outline while the group is being erased even if not focused', () => {
			const group = groupBoxes([boxAId, boxBId])
			editor.setErasingShapes([group.id])

			const { container } = renderGroup(group)
			expect(container.querySelectorAll('g.tl-group line')).toHaveLength(4)
		})

		it('hides the outline of a focused group while another group is hinted', () => {
			const group = groupBoxes([boxAId, boxBId])
			const other = groupBoxes([boxCId, group.id])
			editor.setFocusedGroup(group.id)
			expect(util.component(group)).not.toBeNull()

			editor.setHintingShapes([other.id])
			expect(util.component(group)).toBeNull()

			// hinting a non-group shape does not hide it
			editor.setHintingShapes([boxCId])
			expect(util.component(group)).not.toBeNull()
		})
	})

	describe('getIndicatorPath', () => {
		beforeEach(() => {
			vi.stubGlobal('Path2D', RecordingPath2D)
		})

		afterEach(() => {
			vi.unstubAllGlobals()
		})

		it('draws dashes along each side of the group bounds', () => {
			editor.updateShape({ id: boxBId, type: BOX_TYPE, x: 110, y: 10, props: { w: 100, h: 50 } })
			const group = groupBoxes([boxAId, boxBId])
			expect(editor.getShapeGeometry(group).bounds.toJson()).toEqual({ x: 0, y: 0, w: 200, h: 50 })

			const path = util.getIndicatorPath(group) as unknown as RecordingPath2D
			const segments = path.segments

			// at zoom 1 a 200px side gets 25 dashes of 4.08 with gaps of 4.25, starting at -2
			expect(segments[0]).toEqual(['moveTo', 0, 0])
			expect(segments[1][0]).toBe('lineTo')
			expect(segments[1][1]).toBeCloseTo(2.08)
			expect(segments[2][0]).toBe('moveTo')
			expect(segments[2][1]).toBeCloseTo(6.33)
			expect(segments[3][0]).toBe('lineTo')
			expect(segments[3][1]).toBeCloseTo(10.41)
			// every dash is a moveTo followed by a lineTo
			expect(segments.filter(([op]) => op === 'moveTo')).toHaveLength(segments.length / 2)
			// the last dash on the 50px right side is clipped to end at the bottom-right corner
			expect(segments).toContainEqual(['moveTo', 200, 47.5])
			expect(segments).toContainEqual(['lineTo', 200, 50])
			// and dashes never extend past a side
			for (const [, x, y] of segments) {
				expect(x).toBeGreaterThanOrEqual(0)
				expect(x).toBeLessThanOrEqual(200)
				expect(y).toBeGreaterThanOrEqual(0)
				expect(y).toBeLessThanOrEqual(50)
			}
		})

		it('scales the dash size with the zoom level', () => {
			const group = groupBoxes([boxAId, boxBId])
			editor.setCamera({ x: 0, y: 0, z: 2 })

			const path = util.getIndicatorPath(group) as unknown as RecordingPath2D
			// stroke width is 1 / zoom, so a 240px side gets 60 dashes of 242 / 120 starting at -1
			expect(path.segments[0]).toEqual(['moveTo', 0, 0])
			expect(path.segments[1][0]).toBe('lineTo')
			expect(path.segments[1][1]).toBeCloseTo(242 / 120 - 1)
		})
	})
})
