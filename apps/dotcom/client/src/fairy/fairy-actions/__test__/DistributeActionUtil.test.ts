import { createAgentAction } from '@tldraw/fairy-shared'
import { createShapeId, Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { DistributeActionUtil } from '../DistributeActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('DistributeActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let distributeUtil: DistributeActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		distributeUtil = new DistributeActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('sanitizeAction', () => {
		it('should ensure shape IDs exist', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			// Create only two shapes
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0 })
			editor.createShape({ id: id2, type: 'geo', x: 100, y: 0 })

			const action = createAgentAction({
				_type: 'distribute',
				direction: 'horizontal',
				intent: 'test',
				shapeIds: ['shape1', 'shape2', 'nonexistent'],
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = distributeUtil.sanitizeAction(action, helpers)

			// Should filter out the nonexistent shape
			expect(sanitized?.shapeIds).toHaveLength(2)
			expect(sanitized?.shapeIds).toContain('shape1')
			expect(sanitized?.shapeIds).toContain('shape2')
			expect(sanitized?.shapeIds).not.toContain('nonexistent')
		})
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const action = createAgentAction({
				_type: 'distribute',
				direction: 'horizontal',
				intent: 'test',
				shapeIds: [],
				complete: false,
				time: 0,
			})

			const distributeShapesSpy = vi.spyOn(editor, 'distributeShapes')
			distributeUtil.applyAction(action)

			expect(distributeShapesSpy).not.toHaveBeenCalled()
		})

		it('should distribute shapes horizontally', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			const id3 = createShapeId('shape3')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 100, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } })

			const shape2Before = editor.getShape(id2)
			const initialX2 = shape2Before!.x

			const action = createAgentAction({
				_type: 'distribute',
				direction: 'horizontal',
				intent: 'Distribute horizontally',
				shapeIds: ['shape1', 'shape2', 'shape3'],
				complete: true,
				time: 0,
			})

			distributeUtil.applyAction(action)

			// Verify shapes were actually distributed (spacing should be more even)
			const shape2After = editor.getShape(id2)

			// At least one shape should have moved
			const shapesMoved = shape2After!.x !== initialX2
			expect(shapesMoved).toBe(true)
		})

		it('should distribute shapes vertically', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			const id3 = createShapeId('shape3')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 0, y: 100, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 0, y: 400, props: { w: 100, h: 100 } })

			const shape2Before = editor.getShape(id2)
			const initialY2 = shape2Before!.y

			const action = createAgentAction({
				_type: 'distribute',
				direction: 'vertical',
				intent: 'Distribute vertically',
				shapeIds: ['shape1', 'shape2', 'shape3'],
				complete: true,
				time: 0,
			})

			distributeUtil.applyAction(action)

			// Verify shapes were actually distributed (spacing should be more even)
			const shape2After = editor.getShape(id2)

			// At least one shape should have moved
			const shapesMoved = shape2After!.y !== initialY2
			expect(shapesMoved).toBe(true)
		})

		it('should move fairy to the center of distributed shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			const id3 = createShapeId('shape3')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'distribute',
				direction: 'horizontal',
				intent: 'test',
				shapeIds: ['shape1', 'shape2', 'shape3'],
				complete: true,
				time: 0,
			})

			distributeUtil.applyAction(action)

			// Should move to center of bounds
			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should not move fairy if shapes have no bounds', () => {
			const action = createAgentAction({
				_type: 'distribute',
				direction: 'horizontal',
				intent: 'test',
				shapeIds: [],
				complete: true,
				time: 0,
			})

			distributeUtil.applyAction(action)

			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})

		it('should handle distribution with two shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			const id3 = createShapeId('shape3')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 1000, y: 0, props: { w: 100, h: 100 } })

			const shape2Before = editor.getShape(id2)
			const initialX2 = shape2Before!.x

			const action = createAgentAction({
				_type: 'distribute',
				direction: 'horizontal',
				intent: 'Distribute two shapes',
				shapeIds: ['shape1', 'shape2', 'shape3'],
				complete: true,
				time: 0,
			})

			distributeUtil.applyAction(action)

			// Verify shapes were actually distributed
			const shape2After = editor.getShape(id2)
			// At least one shape should have moved
			const shapesMoved = shape2After!.x !== initialX2
			expect(shapesMoved).toBe(true)
			expect(agent.position.moveTo).toHaveBeenCalled()
		})
	})
})
