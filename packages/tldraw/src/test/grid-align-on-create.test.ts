import {
	TLArrowShape,
	TLFrameShape,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLTextShape,
} from '@tldraw/editor'
import { NOTE_SIZE } from '../lib/shapes/note/noteHelpers'
import { TestEditor } from './TestEditor'

let editor: TestEditor
let gridSize: number
let gridNudge: number

beforeEach(() => {
	editor = new TestEditor()
	editor.updateInstanceState({ isGridMode: true })
	gridSize = editor.getDocumentSettings().gridSize
	gridNudge = gridSize / 5
})
const expectedPoints = {
	a1: {
		id: 'a1',
		index: 'a1',
		x: 0,
		y: 0,
	},
	a2: {
		id: 'a2',
		index: 'a2',
		x: 30,
		y: 30,
	},
	a3: {
		id: 'a3',
		index: 'a3',
		x: -30,
		y: -30,
	},
}
describe('when creating a shape...', () => {
	it('aligns arrow points with the grid', () => {
		editor
			.setCurrentTool('arrow')
			.pointerDown(0 + gridNudge, 0 + gridNudge)
			.pointerMove(30 + gridNudge, 30 + gridNudge)
			.pointerUp()
		const shape = editor.selectAll().getOnlySelectedShape() as TLArrowShape
		expect({ x: shape.x, y: shape.y }).toMatchObject({ x: 0, y: 0 })
		expect(shape.props.end).toMatchObject({ x: 30, y: 30 })
	})
	it('aligns base box shapes with the grid', () => {
		editor
			.setCurrentTool('frame')
			.pointerDown(0 + gridNudge, 0 + gridNudge)
			.pointerUp()
		const shape = editor.getLastCreatedShape() as TLFrameShape
		const defaultProps = editor.getShapeUtil(shape).getDefaultProps()
		expect({ x: shape.x, y: shape.y }).toMatchObject({
			x: -defaultProps.w / 2,
			y: -defaultProps.h / 2,
		})
	})
	it('aligns geo shapes with the grid', () => {
		editor
			.setCurrentTool('geo')
			.pointerDown(0 + gridNudge, 0 + gridNudge)
			.pointerUp()
		const shape = editor.getLastCreatedShape() as TLGeoShape
		const defaultProps = editor.getShapeUtil(shape).getDefaultProps()
		expect({ x: shape.x, y: shape.y }).toMatchObject({ x: -defaultProps.w, y: -defaultProps.h })
	})
	it('aligns line points with the grid', () => {
		editor.keyDown('Shift')
		editor
			.setCurrentTool('line')
			.pointerDown(0 + gridNudge, 0 + gridNudge)
			.pointerUp()
			.pointerMove(30 + gridNudge, 30 + gridNudge)
			.pointerDown()
			.pointerUp()
			.pointerMove(-30 + gridNudge, -30 + gridNudge)
			.pointerDown()
			.pointerUp()
		const shape = editor.getLastCreatedShape() as TLLineShape
		expect({ x: shape.x, y: shape.y, points: shape.props.points }).toMatchObject({
			x: 0,
			y: 0,
			points: expectedPoints,
		})
	})
	it('aligns notes with the grid', () => {
		editor
			.setCurrentTool('note')
			.pointerDown(0 + gridNudge, 0 + gridNudge)
			.pointerUp()
		const shape = editor.getLastCreatedShape() as TLNoteShape
		expect({ x: shape.x, y: shape.y }).toMatchObject({ x: -NOTE_SIZE / 2, y: -NOTE_SIZE / 2 })
	})
	it('aligns text shapes with the grid', () => {
		editor.setCurrentTool('text').pointerDown(gridNudge, gridNudge).pointerUp()
		const shape = editor.getLastCreatedShape()! as TLTextShape
		const bounds = editor.getShapePageBounds(shape)!
		expect(Math.abs(bounds.minX % gridSize)).toBe(0)
		expect(Math.abs(bounds.minY % gridSize)).toBe(0)
	})
})
