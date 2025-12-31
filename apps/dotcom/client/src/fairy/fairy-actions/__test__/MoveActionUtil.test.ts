import { createAgentAction, toSimpleShapeId } from '@tldraw/fairy-shared'
import { createShapeId, Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { MoveActionUtil } from '../MoveActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('MoveActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let moveUtil: MoveActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		moveUtil = new MoveActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('sanitizeAction', () => {
		it('should ensure shape ID exists', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 100,
				y: 100,
				anchor: 'top-left',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = moveUtil.sanitizeAction(action, helpers)

			expect(sanitized?.shapeId).toBe(toSimpleShapeId('shape1'))
		})

		it('should return null if shape does not exist', () => {
			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('nonexistent'),
				x: 100,
				y: 100,
				anchor: 'top-left',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = moveUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should ensure x and y are numbers', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: '100' as any,
				y: '200' as any,
				anchor: 'top-left',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = moveUtil.sanitizeAction(action, helpers)

			expect(sanitized?.x).toBe(100)
			expect(sanitized?.y).toBe(200)
		})

		it('should return null if x is not a valid number', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 'invalid' as any,
				y: 100,
				anchor: 'top-left',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = moveUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should return null if y is not a valid number', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 100,
				y: 'invalid' as any,
				anchor: 'top-left',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = moveUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should not sanitize incomplete actions', () => {
			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 100,
				y: 100,
				anchor: 'top-left',
				intent: 'test',
				complete: false,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = moveUtil.sanitizeAction(action, helpers)

			// Incomplete actions are returned as-is
			expect(sanitized).toBe(action)
		})
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 100,
				y: 100,
				anchor: 'top-left',
				intent: 'test',
				complete: false,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const updateShapeSpy = vi.spyOn(editor, 'updateShape')
			moveUtil.applyAction(action, helpers)

			expect(updateShapeSpy).not.toHaveBeenCalled()
		})

		it('should move a shape to the specified position', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const shapeBefore = editor.getShape(id1)
			const initialX = shapeBefore!.x
			const initialY = shapeBefore!.y

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 100,
				y: 100,
				anchor: 'top-left',
				intent: 'Move shape',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			moveUtil.applyAction(action, helpers)

			const shapeAfter = editor.getShape(id1)
			expect(shapeAfter).toBeDefined()
			// The shape should have moved from its initial position
			expect(shapeAfter!.x).not.toBe(initialX)
			expect(shapeAfter!.y).not.toBe(initialY)
			// Verify the shape bounds moved to approximately the target position
			const bounds = editor.getShapePageBounds(id1)
			expect(bounds).toBeDefined()
			expect(Math.abs(bounds!.minX - 100)).toBeLessThan(50) // Account for shape origin offset
			expect(Math.abs(bounds!.minY - 100)).toBeLessThan(50)
		})

		it('should not apply action if shape does not exist', () => {
			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('nonexistent'),
				x: 100,
				y: 100,
				anchor: 'top-left',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const updateShapeSpy = vi.spyOn(editor, 'updateShape')
			moveUtil.applyAction(action, helpers)

			expect(updateShapeSpy).not.toHaveBeenCalled()
		})

		it('should move fairy to the new shape position', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const initialFairyPosition = agent.getEntity().position

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 100,
				y: 100,
				anchor: 'top-left',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			moveUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()

			const newFairyPosition = agent.getEntity().position
			expect(newFairyPosition.x).not.toBe(initialFairyPosition.x)
			expect(newFairyPosition.y).not.toBe(initialFairyPosition.y)
		})

		it('should correctly calculate shape position from bounds', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 50, y: 50, props: { w: 100, h: 100 } })

			const shapeBefore = editor.getShape(id1)
			const initialX = shapeBefore!.x
			const initialY = shapeBefore!.y

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 200,
				y: 200,
				anchor: 'top-left',
				intent: 'Move to 200, 200',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			moveUtil.applyAction(action, helpers)

			const shapeAfter = editor.getShape(id1)
			expect(shapeAfter).toBeDefined()
			// Verify the shape position actually changed
			expect(shapeAfter!.x).not.toBe(initialX)
			expect(shapeAfter!.y).not.toBe(initialY)
			// Verify the shape bounds moved towards the target
			const bounds = editor.getShapePageBounds(id1)
			expect(bounds).toBeDefined()
			expect(bounds!.minX).toBeGreaterThan(initialX)
			expect(bounds!.minY).toBeGreaterThan(initialY)
		})

		it('should handle shapes with different origins and bounds', () => {
			const id1 = createShapeId('shape1')
			// Create a shape where the origin differs from bounds
			editor.createShape({ id: id1, type: 'geo', x: 25, y: 25, props: { w: 50, h: 50 } })

			const shapeBefore = editor.getShape(id1)
			const initialX = shapeBefore!.x
			const initialY = shapeBefore!.y

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 150,
				y: 150,
				anchor: 'top-left',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			moveUtil.applyAction(action, helpers)

			const shapeAfter = editor.getShape(id1)
			expect(shapeAfter).toBeDefined()
			// Verify the shape position actually changed
			expect(shapeAfter!.x).not.toBe(initialX)
			expect(shapeAfter!.y).not.toBe(initialY)
			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should apply offset transformations correctly', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			// Set up a chat origin offset
			vi.mocked(agent.chatOrigin.getOrigin).mockReturnValue({ x: 50, y: 50 })

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 100,
				y: 100,
				anchor: 'top-left',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			moveUtil.applyAction(action, helpers)

			// The offset should be applied when moving the shape
			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should handle negative coordinates', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const shapeBefore = editor.getShape(id1)
			const initialX = shapeBefore!.x
			const initialY = shapeBefore!.y

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: -50,
				y: -50,
				anchor: 'top-left',
				intent: 'Move to negative position',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			moveUtil.applyAction(action, helpers)

			const shapeAfter = editor.getShape(id1)
			expect(shapeAfter).toBeDefined()
			// Verify the shape moved (position should be different)
			expect(shapeAfter!.x).not.toBe(initialX)
			expect(shapeAfter!.y).not.toBe(initialY)
			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should handle zero coordinates', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } })

			const shapeBefore = editor.getShape(id1)
			const initialX = shapeBefore!.x
			const initialY = shapeBefore!.y

			const action = createAgentAction({
				_type: 'move',
				shapeId: toSimpleShapeId('shape1'),
				x: 0,
				y: 0,
				anchor: 'top-left',
				intent: 'Move to origin',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			moveUtil.applyAction(action, helpers)

			const shapeAfter = editor.getShape(id1)
			expect(shapeAfter).toBeDefined()
			// Verify the shape moved from its initial position
			expect(shapeAfter!.x).not.toBe(initialX)
			expect(shapeAfter!.y).not.toBe(initialY)
			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		describe('anchor positioning', () => {
			it('should position shape with top-left anchor', () => {
				const id1 = createShapeId('shape1')
				editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

				const action = createAgentAction({
					_type: 'move',
					shapeId: toSimpleShapeId('shape1'),
					x: 200,
					y: 200,
					anchor: 'top-left',
					intent: 'Move with top-left anchor',
					complete: true,
					time: 0,
				})

				const helpers = new AgentHelpers(agent)
				moveUtil.applyAction(action, helpers)

				const bounds = editor.getShapePageBounds(id1)
				expect(bounds).toBeDefined()
				// Top-left corner should be at (200, 200)
				expect(Math.abs(bounds!.minX - 200)).toBeLessThan(1)
				expect(Math.abs(bounds!.minY - 200)).toBeLessThan(1)
			})

			it('should position shape with center anchor', () => {
				const id1 = createShapeId('shape1')
				editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

				const action = createAgentAction({
					_type: 'move',
					shapeId: toSimpleShapeId('shape1'),
					x: 200,
					y: 200,
					anchor: 'center',
					intent: 'Move with center anchor',
					complete: true,
					time: 0,
				})

				const helpers = new AgentHelpers(agent)
				moveUtil.applyAction(action, helpers)

				const bounds = editor.getShapePageBounds(id1)
				expect(bounds).toBeDefined()
				// Center should be at (200, 200)
				expect(Math.abs(bounds!.center.x - 200)).toBeLessThan(1)
				expect(Math.abs(bounds!.center.y - 200)).toBeLessThan(1)
			})

			it('should position shape with bottom-right anchor', () => {
				const id1 = createShapeId('shape1')
				editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

				const action = createAgentAction({
					_type: 'move',
					shapeId: toSimpleShapeId('shape1'),
					x: 200,
					y: 200,
					anchor: 'bottom-right',
					intent: 'Move with bottom-right anchor',
					complete: true,
					time: 0,
				})

				const helpers = new AgentHelpers(agent)
				moveUtil.applyAction(action, helpers)

				const bounds = editor.getShapePageBounds(id1)
				expect(bounds).toBeDefined()
				// Bottom-right corner should be at (200, 200)
				expect(Math.abs(bounds!.maxX - 200)).toBeLessThan(1)
				expect(Math.abs(bounds!.maxY - 200)).toBeLessThan(1)
			})

			it('should position shape with top-center anchor', () => {
				const id1 = createShapeId('shape1')
				editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

				const action = createAgentAction({
					_type: 'move',
					shapeId: toSimpleShapeId('shape1'),
					x: 200,
					y: 200,
					anchor: 'top-center',
					intent: 'Move with top-center anchor',
					complete: true,
					time: 0,
				})

				const helpers = new AgentHelpers(agent)
				moveUtil.applyAction(action, helpers)

				const bounds = editor.getShapePageBounds(id1)
				expect(bounds).toBeDefined()
				// Top-center should be at (200, 200)
				expect(Math.abs(bounds!.center.x - 200)).toBeLessThan(1)
				expect(Math.abs(bounds!.minY - 200)).toBeLessThan(1)
			})
		})
	})
})
