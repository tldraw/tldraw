import { createAgentAction } from '@tldraw/fairy-shared'
import { createShapeId, Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { PlaceActionUtil } from '../PlaceActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('PlaceActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let placeUtil: PlaceActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		placeUtil = new PlaceActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('sanitizeAction', () => {
		it('should return action as-is if not complete', () => {
			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'test',
				complete: false,
				time: 0,
			} as any)

			const helpers = new AgentHelpers(agent)
			const sanitized = placeUtil.sanitizeAction(action as any, helpers)

			expect(sanitized).toBe(action)
		})

		it('should return null if shapeId does not exist', () => {
			const refId = createShapeId('shape2')
			editor.createShape({ id: refId, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'nonexistent',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = placeUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should return null if referenceShapeId does not exist', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'nonexistent',
				side: 'top',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = placeUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should sanitize action when both shapes exist', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0 })
			editor.createShape({ id: id2, type: 'geo', x: 100, y: 100 })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = placeUtil.sanitizeAction(action, helpers)

			expect(sanitized).not.toBeNull()
			expect(sanitized?.shapeId).toBe('shape1')
			expect(sanitized?.referenceShapeId).toBe('shape2')
		})
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'test',
				complete: false,
				time: 0,
			} as any)

			placeUtil.applyAction(action as any)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(0)
			expect(shape?.y).toBe(0)
		})

		it('should not apply if shape does not exist', () => {
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'nonexistent',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})

		it('should not apply if reference shape does not exist', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'nonexistent',
				side: 'top',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(0)
			expect(shape?.y).toBe(0)
		})

		// Top side placements
		it('should place shape at top-start of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'start',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at top-start',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(200) // reference minX
			expect(shape?.y).toBe(150) // reference minY - shape height
		})

		it('should place shape at top-center of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at top-center',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(225) // reference midX - shape width/2
			expect(shape?.y).toBe(150) // reference minY - shape height
		})

		it('should place shape at top-end of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'end',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at top-end',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(250) // reference maxX - shape width
			expect(shape?.y).toBe(150) // reference minY - shape height
		})

		// Bottom side placements
		it('should place shape at bottom-start of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'bottom',
				align: 'start',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at bottom-start',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(200) // reference minX
			expect(shape?.y).toBe(300) // reference maxY
		})

		it('should place shape at bottom-center of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'bottom',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at bottom-center',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(225) // reference midX - shape width/2
			expect(shape?.y).toBe(300) // reference maxY
		})

		it('should place shape at bottom-end of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'bottom',
				align: 'end',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at bottom-end',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(250) // reference maxX - shape width
			expect(shape?.y).toBe(300) // reference maxY
		})

		// Left side placements
		it('should place shape at left-start of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'left',
				align: 'start',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at left-start',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(150) // reference minX - shape width
			expect(shape?.y).toBe(200) // reference minY
		})

		it('should place shape at left-center of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'left',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at left-center',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(150) // reference minX - shape width
			expect(shape?.y).toBe(225) // reference midY - shape height/2
		})

		it('should place shape at left-end of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'left',
				align: 'end',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at left-end',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(150) // reference minX - shape width
			expect(shape?.y).toBe(250) // reference maxY - shape height
		})

		// Right side placements
		it('should place shape at right-start of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'right',
				align: 'start',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at right-start',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(300) // reference maxX
			expect(shape?.y).toBe(200) // reference minY
		})

		it('should place shape at right-center of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'right',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at right-center',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(300) // reference maxX
			expect(shape?.y).toBe(225) // reference midY - shape height/2
		})

		it('should place shape at right-end of reference shape', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'right',
				align: 'end',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'Place at right-end',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(300) // reference maxX
			expect(shape?.y).toBe(250) // reference maxY - shape height
		})

		// Offset tests
		it('should apply sideOffset for top placement', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'center',
				alignOffset: 0,
				sideOffset: 10,
				intent: 'Place with offset',
				complete: true,
				time: 0,
			} as any)

			placeUtil.applyAction(action as any)

			const shape = editor.getShape(id1)
			expect(shape?.y).toBe(140) // reference minY - shape height - sideOffset
		})

		it('should apply alignOffset for top-start placement', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'start',
				alignOffset: 20,
				sideOffset: 0,
				intent: 'Place with align offset',
				complete: true,
				time: 0,
			} as any)

			placeUtil.applyAction(action as any)

			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(220) // reference minX + alignOffset
		})

		it('should move fairy to placed shape position', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'top',
				align: 'center',
				alignOffset: 0,
				sideOffset: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			expect(agent.position.moveTo).toHaveBeenCalledWith({
				x: 225,
				y: 150,
			})
		})

		it('should handle invalid side/align combination gracefully', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'place',
				shapeId: 'shape1',
				referenceShapeId: 'shape2',
				side: 'invalid' as any,
				align: 'invalid' as any,
				alignOffset: 0,
				sideOffset: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			placeUtil.applyAction(action)

			// Shape should not be moved for invalid combinations
			const shape = editor.getShape(id1)
			expect(shape?.x).toBe(0)
			expect(shape?.y).toBe(0)
			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})
	})
})
