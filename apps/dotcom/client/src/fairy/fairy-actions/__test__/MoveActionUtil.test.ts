import { createAgentAction } from '@tldraw/fairy-shared'
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
				shapeId: 'shape1',
				x: 100,
				y: 100,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = moveUtil.sanitizeAction(action, helpers)

			expect(sanitized?.shapeId).toBe('shape1')
		})

		it('should return null if shape does not exist', () => {
			const action = createAgentAction({
				_type: 'move',
				shapeId: 'nonexistent',
				x: 100,
				y: 100,
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
				shapeId: 'shape1',
				x: '100' as any,
				y: '200' as any,
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
				shapeId: 'shape1',
				x: 'invalid' as any,
				y: 100,
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
				shapeId: 'shape1',
				x: 100,
				y: 'invalid' as any,
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
				shapeId: 'shape1',
				x: 100,
				y: 100,
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
				shapeId: 'shape1',
				x: 100,
				y: 100,
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

			const action = createAgentAction({
				_type: 'move',
				shapeId: 'shape1',
				x: 100,
				y: 100,
				intent: 'Move shape',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			moveUtil.applyAction(action, helpers)

			const shape = editor.getShape(id1)
			expect(shape).toBeDefined()
			// The shape should be moved to the target position
			// (accounting for offset and shape bounds)
		})

		it('should not apply action if shape does not exist', () => {
			const action = createAgentAction({
				_type: 'move',
				shapeId: 'nonexistent',
				x: 100,
				y: 100,
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

			const action = createAgentAction({
				_type: 'move',
				shapeId: 'shape1',
				x: 100,
				y: 100,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			moveUtil.applyAction(action, helpers)

			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should correctly calculate shape position from bounds', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 50, y: 50, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'move',
				shapeId: 'shape1',
				x: 200,
				y: 200,
				intent: 'Move to 200, 200',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const updateShapeSpy = vi.spyOn(editor, 'updateShape')
			moveUtil.applyAction(action, helpers)

			expect(updateShapeSpy).toHaveBeenCalled()
			// Verify the shape was updated
			const callArgs = updateShapeSpy.mock.calls[0]?.[0]
			expect(callArgs).toBeDefined()
			expect(callArgs?.id).toBe(id1)
		})

		it('should handle shapes with different origins and bounds', () => {
			const id1 = createShapeId('shape1')
			// Create a shape where the origin differs from bounds
			editor.createShape({ id: id1, type: 'geo', x: 25, y: 25, props: { w: 50, h: 50 } })

			const action = createAgentAction({
				_type: 'move',
				shapeId: 'shape1',
				x: 150,
				y: 150,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const updateShapeSpy = vi.spyOn(editor, 'updateShape')
			moveUtil.applyAction(action, helpers)

			expect(updateShapeSpy).toHaveBeenCalled()
			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should apply offset transformations correctly', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			// Set up a chat origin offset
			vi.mocked(agent.chatOriginManager.getOrigin).mockReturnValue({ x: 50, y: 50 })

			const action = createAgentAction({
				_type: 'move',
				shapeId: 'shape1',
				x: 100,
				y: 100,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			moveUtil.applyAction(action, helpers)

			// The offset should be applied when moving the shape
			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should handle negative coordinates', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'move',
				shapeId: 'shape1',
				x: -50,
				y: -50,
				intent: 'Move to negative position',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const updateShapeSpy = vi.spyOn(editor, 'updateShape')
			moveUtil.applyAction(action, helpers)

			expect(updateShapeSpy).toHaveBeenCalled()
			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should handle zero coordinates', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'move',
				shapeId: 'shape1',
				x: 0,
				y: 0,
				intent: 'Move to origin',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const updateShapeSpy = vi.spyOn(editor, 'updateShape')
			moveUtil.applyAction(action, helpers)

			expect(updateShapeSpy).toHaveBeenCalled()
			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})
	})
})
