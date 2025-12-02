import { createAgentAction } from '@tldraw/fairy-shared'
import { createShapeId, Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { SendToBackActionUtil } from '../SendToBackActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('SendToBackActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let sendToBackUtil: SendToBackActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		sendToBackUtil = new SendToBackActionUtil(agent)
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
				_type: 'send-to-back',
				intent: 'test',
				shapeIds: ['shape1', 'shape2', 'nonexistent'],
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = sendToBackUtil.sanitizeAction(action, helpers)

			// Should filter out the nonexistent shape
			expect(sanitized?.shapeIds).toHaveLength(2)
			expect(sanitized?.shapeIds).toContain('shape1')
			expect(sanitized?.shapeIds).toContain('shape2')
			expect(sanitized?.shapeIds).not.toContain('nonexistent')
		})
	})

	describe('applyAction', () => {
		it('should not apply action without agent', () => {
			const action = createAgentAction({
				_type: 'send-to-back',
				intent: 'test',
				shapeIds: ['shape1'],
				complete: true,
				time: 0,
			})

			// Temporarily remove agent to test guard
			const originalAgent = sendToBackUtil['agent']
			sendToBackUtil['agent'] = undefined as any

			const sendToBackSpy = vi.spyOn(editor, 'sendToBack')
			sendToBackUtil.applyAction(action)

			expect(sendToBackSpy).not.toHaveBeenCalled()

			// Restore agent
			sendToBackUtil['agent'] = originalAgent
		})

		it('should not apply action without shape IDs', () => {
			const action = createAgentAction({
				_type: 'send-to-back',
				intent: 'test',
				shapeIds: undefined as any,
				complete: true,
				time: 0,
			})

			const sendToBackSpy = vi.spyOn(editor, 'sendToBack')
			sendToBackUtil.applyAction(action)

			expect(sendToBackSpy).not.toHaveBeenCalled()
		})

		it('should send single shape to back', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 50, y: 50, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'send-to-back',
				intent: 'Send to back',
				shapeIds: ['shape2'],
				complete: true,
				time: 0,
			})

			sendToBackUtil.applyAction(action)

			// Verify shape was actually sent to back (should be first in array)
			const shapesAfter = editor.getCurrentPageShapesSorted()
			const index1After = shapesAfter.findIndex((s) => s.id === id1)
			const index2After = shapesAfter.findIndex((s) => s.id === id2)
			// shape2 should now be before shape1 (sent to back)
			expect(index2After).toBeLessThan(index1After)
			// shape2 should be at the beginning (first shape)
			expect(index2After).toBe(0)
		})

		it('should send multiple shapes to back', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			const id3 = createShapeId('shape3')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 50, y: 50, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'send-to-back',
				intent: 'Send all to back',
				shapeIds: ['shape2', 'shape3'],
				complete: true,
				time: 0,
			})

			sendToBackUtil.applyAction(action)

			// Verify shapes were actually sent to back
			const shapesAfter = editor.getCurrentPageShapesSorted()
			const index1After = shapesAfter.findIndex((s) => s.id === id1)
			const index2After = shapesAfter.findIndex((s) => s.id === id2)
			const index3After = shapesAfter.findIndex((s) => s.id === id3)
			// shape2 and shape3 should now be before shape1 (sent to back)
			expect(index2After).toBeLessThan(index1After)
			expect(index3After).toBeLessThan(index1After)
			// shape2 and shape3 should be at the beginning
			expect(index2After).toBeLessThanOrEqual(1)
			expect(index3After).toBeLessThanOrEqual(1)
		})

		it('should move fairy to the center of shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'send-to-back',
				intent: 'test',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			sendToBackUtil.applyAction(action)

			// Should move to center of bounds
			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should not move fairy if shapes have no bounds', () => {
			const action = createAgentAction({
				_type: 'send-to-back',
				intent: 'test',
				shapeIds: [],
				complete: true,
				time: 0,
			})

			sendToBackUtil.applyAction(action)

			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})

		it('should handle sending shapes with empty array', () => {
			const action = createAgentAction({
				_type: 'send-to-back',
				intent: 'test',
				shapeIds: [],
				complete: true,
				time: 0,
			})

			const sendToBackSpy = vi.spyOn(editor, 'sendToBack')
			sendToBackUtil.applyAction(action)

			expect(sendToBackSpy).toHaveBeenCalledWith([])
			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})
	})
})
