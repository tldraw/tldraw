import { createAgentAction } from '@tldraw/fairy-shared'
import { createShapeId, Editor, TLShapeId } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { ResizeActionUtil } from '../ResizeActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('ResizeActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let resizeUtil: ResizeActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		resizeUtil = new ResizeActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('sanitizeAction', () => {
		it('should ensure shape IDs exist', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0 })
			editor.createShape({ id: id2, type: 'geo', x: 100, y: 0 })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1', 'shape2'],
				scaleX: 2,
				scaleY: 2,
				originX: 0,
				originY: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = resizeUtil.sanitizeAction(action, helpers)

			expect(sanitized?.shapeIds).toHaveLength(2)
			expect(sanitized?.shapeIds).toContain('shape1')
			expect(sanitized?.shapeIds).toContain('shape2')
		})

		it('should filter out nonexistent shapes', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1', 'nonexistent'],
				scaleX: 2,
				scaleY: 2,
				originX: 0,
				originY: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = resizeUtil.sanitizeAction(action, helpers)

			expect(sanitized?.shapeIds).toHaveLength(1)
			expect(sanitized?.shapeIds).toContain('shape1')
			expect(sanitized?.shapeIds).not.toContain('nonexistent')
		})

		it('should return null if no valid shapes exist', () => {
			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['nonexistent1', 'nonexistent2'],
				scaleX: 2,
				scaleY: 2,
				originX: 0,
				originY: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = resizeUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should handle empty shapeIds array', () => {
			const action = createAgentAction({
				_type: 'resize',
				shapeIds: [],
				scaleX: 2,
				scaleY: 2,
				originX: 0,
				originY: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = resizeUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should handle undefined shapeIds', () => {
			const action = createAgentAction({
				_type: 'resize',
				shapeIds: undefined as any,
				scaleX: 2,
				scaleY: 2,
				originX: 0,
				originY: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = resizeUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})
	})

	describe('applyAction', () => {
		it('should not apply action with missing shapeIds', () => {
			const action = createAgentAction({
				_type: 'resize',
				shapeIds: undefined as any,
				scaleX: 2,
				scaleY: 2,
				originX: 0,
				originY: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).not.toHaveBeenCalled()
		})

		it('should not apply action with missing scaleX', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: undefined as any,
				scaleY: 2,
				originX: 0,
				originY: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).not.toHaveBeenCalled()
		})

		it('should not apply action with missing scaleY', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: 2,
				scaleY: undefined as any,
				originX: 0,
				originY: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).not.toHaveBeenCalled()
		})

		it('should not apply action with missing originX', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: 2,
				scaleY: 2,
				originX: undefined as any,
				originY: 0,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).not.toHaveBeenCalled()
		})

		it('should not apply action with missing originY', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: 2,
				scaleY: 2,
				originX: 0,
				originY: undefined as any,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).not.toHaveBeenCalled()
		})

		it('should resize a single shape', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: 2,
				scaleY: 2,
				originX: 50,
				originY: 50,
				intent: 'Double size',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).toHaveBeenCalledWith(
				id1 as TLShapeId,
				{ x: 2, y: 2 },
				{ scaleOrigin: { x: 50, y: 50 } }
			)
		})

		it('should resize multiple shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1', 'shape2'],
				scaleX: 1.5,
				scaleY: 1.5,
				originX: 100,
				originY: 50,
				intent: 'Resize both',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).toHaveBeenCalledTimes(2)
			expect(resizeShapeSpy).toHaveBeenCalledWith(
				id1 as TLShapeId,
				{ x: 1.5, y: 1.5 },
				{ scaleOrigin: { x: 100, y: 50 } }
			)
			expect(resizeShapeSpy).toHaveBeenCalledWith(
				id2 as TLShapeId,
				{ x: 1.5, y: 1.5 },
				{ scaleOrigin: { x: 100, y: 50 } }
			)
		})

		it('should move fairy to the origin point', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: 2,
				scaleY: 2,
				originX: 50,
				originY: 50,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			resizeUtil.applyAction(action, helpers)

			expect(agent.positionManager.moveTo).toHaveBeenCalledWith({ x: 50, y: 50 })
		})

		it('should handle scale down operations', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: 0.5,
				scaleY: 0.5,
				originX: 50,
				originY: 50,
				intent: 'Make smaller',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).toHaveBeenCalledWith(
				id1 as TLShapeId,
				{ x: 0.5, y: 0.5 },
				{ scaleOrigin: { x: 50, y: 50 } }
			)
		})

		it('should handle non-uniform scaling', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: 2,
				scaleY: 0.5,
				originX: 50,
				originY: 50,
				intent: 'Stretch horizontally',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).toHaveBeenCalledWith(
				id1 as TLShapeId,
				{ x: 2, y: 0.5 },
				{ scaleOrigin: { x: 50, y: 50 } }
			)
		})

		it('should apply offset transformations to origin', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			// Set up a chat origin offset
			vi.mocked(agent.chatOriginManager.getOrigin).mockReturnValue({ x: 50, y: 50 })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: 2,
				scaleY: 2,
				originX: 100,
				originY: 100,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			resizeUtil.applyAction(action, helpers)

			// The offset should be removed from the origin
			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should handle negative scale values', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: -1,
				scaleY: 1,
				originX: 50,
				originY: 50,
				intent: 'Flip horizontally',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).toHaveBeenCalledWith(
				id1 as TLShapeId,
				{ x: -1, y: 1 },
				{ scaleOrigin: { x: 50, y: 50 } }
			)
		})

		it('should handle scale of 1 (no change)', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'resize',
				shapeIds: ['shape1'],
				scaleX: 1,
				scaleY: 1,
				originX: 50,
				originY: 50,
				intent: 'No change',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const resizeShapeSpy = vi.spyOn(editor, 'resizeShape')
			resizeUtil.applyAction(action, helpers)

			expect(resizeShapeSpy).toHaveBeenCalledWith(
				id1 as TLShapeId,
				{ x: 1, y: 1 },
				{ scaleOrigin: { x: 50, y: 50 } }
			)
		})
	})
})
