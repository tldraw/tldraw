import { createAgentAction } from '@tldraw/fairy-shared'
import { createShapeId, Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { DeleteActionUtil } from '../DeleteActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('DeleteActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let deleteUtil: DeleteActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		deleteUtil = new DeleteActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('sanitizeAction', () => {
		it('should return action as-is if incomplete', () => {
			const action = createAgentAction({
				_type: 'delete',
				shapeId: 'shape1',
				intent: 'test',
				complete: false,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = deleteUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBe(action)
		})

		it('should verify shape exists and return action', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'delete',
				shapeId: 'shape1',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = deleteUtil.sanitizeAction(action, helpers)

			expect(sanitized).not.toBeNull()
			expect(sanitized?.shapeId).toBe('shape1')
		})

		it('should return null if shape does not exist', () => {
			const action = createAgentAction({
				_type: 'delete',
				shapeId: 'nonexistent',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = deleteUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const action = createAgentAction({
				_type: 'delete',
				shapeId: 'shape1',
				intent: 'test',
				complete: false,
				time: 0,
			})

			const deleteShapeSpy = vi.spyOn(editor, 'deleteShape')
			deleteUtil.applyAction(action)

			expect(deleteShapeSpy).not.toHaveBeenCalled()
		})

		it('should delete a shape that exists', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'geo', x: 100, y: 200, props: { w: 100, h: 100 } })

			// Verify shape exists before deletion
			expect(editor.getShape(id)).toBeDefined()

			const action = createAgentAction({
				_type: 'delete',
				shapeId: 'shape1',
				intent: 'Delete shape',
				complete: true,
				time: 0,
			})

			deleteUtil.applyAction(action)

			// Verify shape was actually deleted
			expect(editor.getShape(id)).toBeUndefined()
		})

		it('should move fairy to the deleted shape position', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'geo', x: 150, y: 250, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'delete',
				shapeId: 'shape1',
				intent: 'Delete shape',
				complete: true,
				time: 0,
			})

			deleteUtil.applyAction(action)

			expect(agent.position.moveTo).toHaveBeenCalledWith({ x: 150, y: 250 })
		})

		it('should not delete if shape does not exist', () => {
			const action = createAgentAction({
				_type: 'delete',
				shapeId: 'nonexistent',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const deleteShapeSpy = vi.spyOn(editor, 'deleteShape')
			deleteUtil.applyAction(action)

			expect(deleteShapeSpy).not.toHaveBeenCalled()
			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})

		it('should handle deletion of text shape', () => {
			const id = createShapeId('text1')
			editor.createShape({ id, type: 'text', x: 300, y: 400 })

			// Verify shape exists before deletion
			expect(editor.getShape(id)).toBeDefined()

			const action = createAgentAction({
				_type: 'delete',
				shapeId: 'text1',
				intent: 'Delete text',
				complete: true,
				time: 0,
			})

			deleteUtil.applyAction(action)

			// Verify shape was actually deleted
			expect(editor.getShape(id)).toBeUndefined()
			expect(agent.position.moveTo).toHaveBeenCalledWith({ x: 300, y: 400 })
		})

		it('should handle deletion of arrow shape', () => {
			const arrowId = createShapeId('arrow1')
			editor.createShape({ id: arrowId, type: 'arrow', x: 50, y: 75 })

			// Verify shape exists before deletion
			expect(editor.getShape(arrowId)).toBeDefined()

			const action = createAgentAction({
				_type: 'delete',
				shapeId: 'arrow1',
				intent: 'Delete arrow',
				complete: true,
				time: 0,
			})

			deleteUtil.applyAction(action)

			// Verify shape was actually deleted
			expect(editor.getShape(arrowId)).toBeUndefined()
			expect(agent.position.moveTo).toHaveBeenCalledWith({ x: 50, y: 75 })
		})
	})
})
