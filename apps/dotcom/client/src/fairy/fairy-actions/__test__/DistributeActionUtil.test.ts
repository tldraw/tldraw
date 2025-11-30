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
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } })

			const shape1Before = editor.getShape(id1)
			const shape2Before = editor.getShape(id2)
			const shape3Before = editor.getShape(id3)
			const initialX1 = shape1Before!.x
			const initialX2 = shape2Before!.x
			const initialX3 = shape3Before!.x

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
			const shape1After = editor.getShape(id1)
			const shape2After = editor.getShape(id2)
			const shape3After = editor.getShape(id3)

			// At least one shape should have moved
			const shapesMoved =
				shape1After!.x !== initialX1 || shape2After!.x !== initialX2 || shape3After!.x !== initialX3
			expect(shapesMoved).toBe(true)

			// Verify spacing is more even (distances between shapes should be closer to equal)
			const dist1 = Math.abs(shape2After!.x - shape1After!.x)
			const dist2 = Math.abs(shape3After!.x - shape2After!.x)
			// The difference between distances should be smaller than the original uneven spacing
			const originalDist1 = Math.abs(initialX2 - initialX1)
			const originalDist2 = Math.abs(initialX3 - initialX2)
			const originalUnevenness = Math.abs(originalDist1 - originalDist2)
			const newUnevenness = Math.abs(dist1 - dist2)
			expect(newUnevenness).toBeLessThanOrEqual(originalUnevenness)
		})

		it('should distribute shapes vertically', () => {
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
				_type: 'distribute',
				direction: 'vertical',
				intent: 'Distribute vertically',
				shapeIds: ['shape1', 'shape2', 'shape3'],
				complete: true,
				time: 0,
			})

			distributeUtil.applyAction(action)

			// Verify shapes were actually distributed (spacing should be more even)
			const shape1After = editor.getShape(id1)
			const shape2After = editor.getShape(id2)
			const shape3After = editor.getShape(id3)

			// At least one shape should have moved
			const shapesMoved =
				shape1After!.y !== initialY1 || shape2After!.y !== initialY2 || shape3After!.y !== initialY3
			expect(shapesMoved).toBe(true)

			// Verify spacing is more even (distances between shapes should be closer to equal)
			const dist1 = Math.abs(shape2After!.y - shape1After!.y)
			const dist2 = Math.abs(shape3After!.y - shape2After!.y)
			// The difference between distances should be smaller than the original uneven spacing
			const originalDist1 = Math.abs(initialY2 - initialY1)
			const originalDist2 = Math.abs(initialY3 - initialY2)
			const originalUnevenness = Math.abs(originalDist1 - originalDist2)
			const newUnevenness = Math.abs(dist1 - dist2)
			expect(newUnevenness).toBeLessThanOrEqual(originalUnevenness)
		})

		it('should move fairy to the center of distributed shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			const id3 = createShapeId('shape3')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } })

			const initialFairyPosition = agent.$fairyEntity.get().position

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
			expect(agent.positionManager.moveTo).toHaveBeenCalled()
			// Verify the fairy's position actually changed
			const newFairyPosition = agent.$fairyEntity.get().position
			expect(newFairyPosition.x).not.toBe(initialFairyPosition.x)
			expect(newFairyPosition.y).not.toBe(initialFairyPosition.y)
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

			expect(agent.positionManager.moveTo).not.toHaveBeenCalled()
		})

		it('should handle distribution with two shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 500, y: 0, props: { w: 100, h: 100 } })

			const shape1Before = editor.getShape(id1)
			const shape2Before = editor.getShape(id2)
			const initialX1 = shape1Before!.x
			const initialX2 = shape2Before!.x

			const action = createAgentAction({
				_type: 'distribute',
				direction: 'horizontal',
				intent: 'Distribute two shapes',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			distributeUtil.applyAction(action)

			// Verify shapes were actually distributed
			const shape1After = editor.getShape(id1)
			const shape2After = editor.getShape(id2)

			// At least one shape should have moved
			const shapesMoved = shape1After!.x !== initialX1 || shape2After!.x !== initialX2
			expect(shapesMoved).toBe(true)
			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})
	})
})
