import { createAgentAction, toSimpleShapeId } from '@tldraw/fairy-shared'
import { createShapeId, Editor, TLNoteShape, TLTextShape, toRichText } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { UpdateActionUtil } from '../UpdateActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('UpdateActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let updateUtil: UpdateActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		updateUtil = new UpdateActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('sanitizeAction', () => {
		it('should return action as-is if incomplete', () => {
			const action = createAgentAction({
				_type: 'update',
				update: {
					_type: 'rectangle',
					shapeId: toSimpleShapeId('shape1'),
					x: 100,
					y: 100,
					w: 100,
					h: 100,
					color: 'black',
					fill: 'none',
					note: '',
				},
				intent: 'test',
				complete: false,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = updateUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBe(action)
		})

		it('should return null if update is missing', () => {
			const action = createAgentAction({
				_type: 'update',
				update: null as any,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = updateUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should return null if shape does not exist', () => {
			const action = createAgentAction({
				_type: 'update',
				update: {
					_type: 'rectangle',
					shapeId: toSimpleShapeId('nonexistent'),
					x: 100,
					y: 100,
					w: 100,
					h: 100,
					color: 'black',
					fill: 'none',
					note: '',
				},
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = updateUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should validate shape exists and return action', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'update',
				update: {
					_type: 'rectangle',
					shapeId: toSimpleShapeId('shape1'),
					x: 200,
					y: 200,
					w: 100,
					h: 100,
					color: 'black',
					fill: 'none',
					note: '',
				},
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = updateUtil.sanitizeAction(action, helpers)

			expect(sanitized).not.toBeNull()
			expect(sanitized?.update?.shapeId).toBe(toSimpleShapeId('shape1'))
		})

		it('should validate arrow fromId exists', () => {
			const arrowId = createShapeId('arrow1')
			const fromId = createShapeId('from1')
			editor.createShape({ id: arrowId, type: 'arrow', x: 0, y: 0 })
			editor.createShape({ id: fromId, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'update',
				update: {
					_type: 'arrow',
					shapeId: toSimpleShapeId('arrow1'),
					fromId: toSimpleShapeId('from1'),
					toId: toSimpleShapeId('nonexistent'),
					color: 'black',
					note: '',
					x1: 0,
					x2: 100,
					y1: 0,
					y2: 100,
				},
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = updateUtil.sanitizeAction(action, helpers)

			expect(sanitized).not.toBeNull()
			if (sanitized?.update && sanitized.update._type === 'arrow') {
				expect(sanitized.update.fromId).toBe('from1')
				expect(sanitized.update.toId).toBeNull()
			}
		})

		it('should validate arrow toId exists', () => {
			const arrowId = createShapeId('arrow1')
			const toId = createShapeId('to1')
			editor.createShape({ id: arrowId, type: 'arrow', x: 0, y: 0 })
			editor.createShape({ id: toId, type: 'geo', x: 100, y: 100 })

			const action = createAgentAction({
				_type: 'update',
				update: {
					_type: 'arrow',
					shapeId: toSimpleShapeId('arrow1'),
					fromId: toSimpleShapeId('nonexistent'),
					toId: toSimpleShapeId('to1'),
					color: 'black',
					note: '',
					x1: 0,
					x2: 100,
					y1: 0,
					y2: 100,
				},
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = updateUtil.sanitizeAction(action, helpers)

			expect(sanitized).not.toBeNull()
			if (sanitized?.update && sanitized.update._type === 'arrow') {
				expect(sanitized.update.fromId).toBeNull()
				expect(sanitized.update.toId).toBe('to1')
			}
		})
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const action = createAgentAction({
				_type: 'update',
				update: {
					_type: 'rectangle',
					shapeId: toSimpleShapeId('shape1'),
					x: 100,
					y: 100,
					w: 100,
					h: 100,
					color: 'black',
					fill: 'none',
					note: '',
				},
				intent: 'test',
				complete: false,
				time: 0,
			})

			const updateShapeSpy = vi.spyOn(editor, 'updateShape')
			const helpers = new AgentHelpers(agent)
			updateUtil.applyAction(action, helpers)

			expect(updateShapeSpy).not.toHaveBeenCalled()
		})

		it('should update text content', () => {
			const id = createShapeId('text1')
			editor.createShape({ id, type: 'text', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'update',
				update: {
					_type: 'text',
					shapeId: toSimpleShapeId('text1'),
					text: 'Updated text',
					anchor: 'center',
					color: 'black',
					maxWidth: null,
					note: '',
					x: 0,
					y: 0,
				},
				intent: 'Update text',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			updateUtil.applyAction(action, helpers)

			// Verify the text shape was actually updated on the canvas
			const textShape = editor.getShape(id) as TLTextShape | null
			expect(textShape).toBeDefined()
			expect(textShape?.props.richText).toEqual(toRichText('Updated text'))
		})

		it('should handle updating arrow bindings', () => {
			const arrowId = createShapeId('arrow1')
			const fromId = createShapeId('from1')
			const toId = createShapeId('to1')
			editor.createShape({ id: arrowId, type: 'arrow', x: 0, y: 0 })
			editor.createShape({ id: fromId, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: toId, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const arrowBefore = editor.getShape(arrowId)

			const action = createAgentAction({
				_type: 'update',
				update: {
					_type: 'arrow',
					shapeId: toSimpleShapeId('arrow1'),
					fromId: toSimpleShapeId('from1'),
					toId: toSimpleShapeId('to1'),
					color: 'black',
					note: '',
					x1: 0,
					x2: 200,
					y1: 0,
					y2: 0,
				},
				intent: 'Connect arrow',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			updateUtil.applyAction(action, helpers)

			// Verify the arrow shape was actually updated
			const arrowAfter = editor.getShape(arrowId)
			expect(arrowAfter).toBeDefined()
			expect(arrowAfter).not.toBe(arrowBefore)
			// Verify bindings were created
			const newBindings = editor.getBindingsFromShape(arrowId, 'arrow')
			expect(newBindings.length).toBeGreaterThan(0)
		})

		it('should handle shape not found error', () => {
			const action = createAgentAction({
				_type: 'update',
				update: {
					_type: 'rectangle',
					shapeId: toSimpleShapeId('nonexistent'),
					x: 100,
					y: 100,
					w: 100,
					h: 100,
					color: 'black',
					fill: 'none',
					note: '',
				},
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)

			expect(() => {
				updateUtil.applyAction(action, helpers)
			}).toThrow('Shape shape:nonexistent not found in canvas')
		})

		it('should update note shape content and color', () => {
			const id = createShapeId('note1')
			editor.createShape({ id, type: 'note', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'update',
				update: {
					_type: 'note',
					shapeId: toSimpleShapeId('note1'),
					text: 'Updated note content',
					color: 'yellow',
					note: '',
					x: 0,
					y: 0,
				},
				intent: 'Update note',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			updateUtil.applyAction(action, helpers)

			// Verify the note shape was actually updated on the canvas
			const noteShape = editor.getShape(id) as TLNoteShape | null
			expect(noteShape).toBeDefined()
			expect(noteShape?.props.richText).toEqual(toRichText('Updated note content'))
			expect(noteShape?.props.color).toBe('yellow')
		})
	})
})
