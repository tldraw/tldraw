import { createAgentAction, toSimpleShapeId } from '@tldraw/fairy-shared'
import { createShapeId, Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { CreateActionUtil } from '../CreateActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('CreateActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let createUtil: CreateActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		createUtil = new CreateActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('sanitizeAction', () => {
		it('should return action as-is if incomplete', () => {
			const action = createAgentAction({
				_type: 'create',
				shape: {
					_type: 'rectangle',
					shapeId: toSimpleShapeId('shape1'),
					x: 0,
					y: 0,
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
			const sanitized = createUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBe(action)
		})

		it('should return null if shape is missing', () => {
			const action = createAgentAction({
				_type: 'create',
				shape: null as any,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = createUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should ensure shape ID is unique', () => {
			const existingId = createShapeId('shape1')
			editor.createShape({ id: existingId, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'create',
				shape: {
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
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = createUtil.sanitizeAction(action, helpers)

			expect(sanitized).not.toBeNull()
			// Should have modified the ID to make it unique
			if (sanitized?.shape) {
				expect(sanitized.shape.shapeId).not.toBe('shape1')
			}
		})

		it('should validate arrow fromId exists', () => {
			const fromId = createShapeId('from1')
			editor.createShape({ id: fromId, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'create',
				shape: {
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
			const sanitized = createUtil.sanitizeAction(action, helpers)

			expect(sanitized).not.toBeNull()
			if (sanitized?.shape) {
				expect(sanitized.shape._type).toBe('arrow')
				if (sanitized.shape._type === 'arrow') {
					expect(sanitized.shape.fromId).toBe('from1')
					expect(sanitized.shape.toId).toBeNull()
				}
			}
		})

		it('should validate arrow toId exists', () => {
			const toId = createShapeId('to1')
			editor.createShape({ id: toId, type: 'geo', x: 100, y: 100 })

			const action = createAgentAction({
				_type: 'create',
				shape: {
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
			const sanitized = createUtil.sanitizeAction(action, helpers)

			expect(sanitized).not.toBeNull()
			if (sanitized?.shape) {
				expect(sanitized.shape._type).toBe('arrow')
				if (sanitized.shape._type === 'arrow') {
					expect(sanitized.shape.fromId).toBeNull()
					expect(sanitized.shape.toId).toBe('to1')
				}
			}
		})
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const action = createAgentAction({
				_type: 'create',
				shape: {
					_type: 'rectangle',
					shapeId: toSimpleShapeId('shape1'),
					x: 0,
					y: 0,
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

			const createShapeSpy = vi.spyOn(editor, 'createShape')
			const helpers = new AgentHelpers(agent)
			createUtil.applyAction(action, helpers)

			expect(createShapeSpy).not.toHaveBeenCalled()
		})

		it('should handle arrow shapes with bindings', () => {
			const fromId = createShapeId('from1')
			const toId = createShapeId('to1')
			editor.createShape({ id: fromId, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: toId, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const shapesBefore = editor.getCurrentPageShapes().length

			const action = createAgentAction({
				_type: 'create',
				shape: {
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
				intent: 'Connect shapes',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			createUtil.applyAction(action, helpers)

			// Verify a shape was actually created (shape count should increase)
			const shapesAfter = editor.getCurrentPageShapes().length
			expect(shapesAfter).toBeGreaterThan(shapesBefore)
			// Verify we can find the arrow shape (it may have a modified ID)
			const arrowShapes = editor.getCurrentPageShapes().filter((s) => s.type === 'arrow')
			expect(arrowShapes.length).toBeGreaterThan(0)
		})
	})
})
