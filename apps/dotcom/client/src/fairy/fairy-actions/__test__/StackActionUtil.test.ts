import { createAgentAction } from '@tldraw/fairy-shared'
import { createShapeId, Editor, TLShapeId } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { StackActionUtil } from '../StackActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('StackActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let stackUtil: StackActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		stackUtil = new StackActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('sanitizeAction', () => {
		it('should ensure shape IDs exist for complete actions', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			// Create only two shapes
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0 })
			editor.createShape({ id: id2, type: 'geo', x: 100, y: 0 })

			const action = createAgentAction({
				_type: 'stack',
				direction: 'horizontal',
				gap: 10,
				intent: 'test',
				shapeIds: ['shape1', 'shape2', 'nonexistent'],
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = stackUtil.sanitizeAction(action, helpers)

			// Should filter out the nonexistent shape
			expect(sanitized?.shapeIds).toHaveLength(2)
			expect(sanitized?.shapeIds).toContain('shape1')
			expect(sanitized?.shapeIds).toContain('shape2')
			expect(sanitized?.shapeIds).not.toContain('nonexistent')
		})

		it('should not sanitize incomplete actions', () => {
			const action = createAgentAction({
				_type: 'stack',
				direction: 'horizontal',
				gap: 10,
				intent: 'test',
				shapeIds: ['shape1', 'shape2', 'nonexistent'],
				complete: false,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = stackUtil.sanitizeAction(action, helpers)

			// Should not filter when incomplete
			expect(sanitized?.shapeIds).toHaveLength(3)
			expect(sanitized?.shapeIds).toContain('nonexistent')
		})
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const action = createAgentAction({
				_type: 'stack',
				direction: 'horizontal',
				gap: 10,
				intent: 'test',
				shapeIds: [],
				complete: false,
				time: 0,
			})

			const stackShapesSpy = vi.spyOn(editor, 'stackShapes')
			stackUtil.applyAction(action)

			expect(stackShapesSpy).not.toHaveBeenCalled()
		})

		it('should stack shapes horizontally', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			const id3 = createShapeId('shape3')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } })

			const shape1Before = editor.getShape(id1)
			const shape2Before = editor.getShape(id2)
			const shape3Before = editor.getShape(id3)
			const initialX1 = shape1Before!.x
			const initialX2 = shape2Before!.x
			const initialX3 = shape3Before!.x

			const action = createAgentAction({
				_type: 'stack',
				direction: 'horizontal',
				gap: 10,
				intent: 'Stack horizontally',
				shapeIds: ['shape1', 'shape2', 'shape3'],
				complete: true,
				time: 0,
			})

			stackUtil.applyAction(action)

			// Verify shapes were actually stacked (positions should be more evenly spaced)
			const shape1After = editor.getShape(id1)
			const shape2After = editor.getShape(id2)
			const shape3After = editor.getShape(id3)
			// At least one shape should have moved
			const shapesMoved =
				shape1After!.x !== initialX1 || shape2After!.x !== initialX2 || shape3After!.x !== initialX3
			expect(shapesMoved).toBe(true)
			// Shapes should be in order (x coordinates should be increasing)
			expect(shape1After!.x).toBeLessThan(shape2After!.x)
			expect(shape2After!.x).toBeLessThan(shape3After!.x)
		})

		it('should stack shapes vertically', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			const id3 = createShapeId('shape3')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 0, y: 200, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 0, y: 400, props: { w: 100, h: 100 } })

			const shape1Before = editor.getShape(id1)
			const shape2Before = editor.getShape(id2)
			const shape3Before = editor.getShape(id3)
			const initialY1 = shape1Before!.y
			const initialY2 = shape2Before!.y
			const initialY3 = shape3Before!.y

			const action = createAgentAction({
				_type: 'stack',
				direction: 'vertical',
				gap: 20,
				intent: 'Stack vertically',
				shapeIds: ['shape1', 'shape2', 'shape3'],
				complete: true,
				time: 0,
			})

			stackUtil.applyAction(action)

			// Verify shapes were actually stacked (positions should be more evenly spaced)
			const shape1After = editor.getShape(id1)
			const shape2After = editor.getShape(id2)
			const shape3After = editor.getShape(id3)
			// At least one shape should have moved
			const shapesMoved =
				shape1After!.y !== initialY1 || shape2After!.y !== initialY2 || shape3After!.y !== initialY3
			expect(shapesMoved).toBe(true)
			// Shapes should be in order (y coordinates should be increasing)
			expect(shape1After!.y).toBeLessThan(shape2After!.y)
			expect(shape2After!.y).toBeLessThan(shape3After!.y)
		})

		it('should limit gap to maximum of 1', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'stack',
				direction: 'horizontal',
				gap: 5,
				intent: 'Stack with large gap',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			const stackShapesSpy = vi.spyOn(editor, 'stackShapes')
			stackUtil.applyAction(action)

			// Gap should be capped at 1
			expect(stackShapesSpy).toHaveBeenCalledWith(
				[id1 as TLShapeId, id2 as TLShapeId],
				'horizontal',
				1
			)
		})

		it('should handle zero gap', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'stack',
				direction: 'horizontal',
				gap: 0,
				intent: 'Stack with no gap',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			const stackShapesSpy = vi.spyOn(editor, 'stackShapes')
			stackUtil.applyAction(action)

			expect(stackShapesSpy).toHaveBeenCalledWith(
				[id1 as TLShapeId, id2 as TLShapeId],
				'horizontal',
				0
			)
		})

		it('should move fairy to the center of stacked shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			const id3 = createShapeId('shape3')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'stack',
				direction: 'vertical',
				gap: 15,
				intent: 'test',
				shapeIds: ['shape1', 'shape2', 'shape3'],
				complete: true,
				time: 0,
			})

			stackUtil.applyAction(action)

			// Should move to center of bounds
			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should not move fairy if shapes have no bounds', () => {
			const action = createAgentAction({
				_type: 'stack',
				direction: 'horizontal',
				gap: 10,
				intent: 'test',
				shapeIds: [],
				complete: true,
				time: 0,
			})

			stackUtil.applyAction(action)

			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})

		it('should handle stacking with two shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 500, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'stack',
				direction: 'horizontal',
				gap: 5,
				intent: 'Stack two shapes',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			const stackShapesSpy = vi.spyOn(editor, 'stackShapes')
			stackUtil.applyAction(action)

			expect(stackShapesSpy).toHaveBeenCalledWith(
				[id1 as TLShapeId, id2 as TLShapeId],
				'horizontal',
				1
			)
			expect(agent.position.moveTo).toHaveBeenCalled()
		})
	})
})
