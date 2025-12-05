import { createAgentAction } from '@tldraw/fairy-shared'
import { createShapeId, Editor, TLGeoShape, TLNoteShape, toRichText } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { LabelActionUtil } from '../LabelActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('LabelActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let labelUtil: LabelActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		labelUtil = new LabelActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('sanitizeAction', () => {
		it('should return action as-is if not complete', () => {
			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: 'Hello',
				intent: 'test',
				complete: false,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = labelUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBe(action)
		})

		it('should return null if shape does not exist', () => {
			const action = createAgentAction({
				_type: 'label',
				shapeId: 'nonexistent',
				text: 'Hello',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = labelUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should return null if shape does not support richText', () => {
			const id = createShapeId('shape1')
			// Draw shapes don't support richText labels
			editor.createShape({ id, type: 'draw', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: 'Hello',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = labelUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBeNull()
		})

		it('should sanitize action for valid shape with richText', () => {
			const id = createShapeId('shape1')
			// Geo shapes support richText
			editor.createShape({ id, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: 'Hello',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = labelUtil.sanitizeAction(action, helpers)

			expect(sanitized).not.toBeNull()
			expect(sanitized?.shapeId).toBe('shape1')
		})

		it('should sanitize action for note shape with richText', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'note', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: 'Hello',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = labelUtil.sanitizeAction(action, helpers)

			expect(sanitized).not.toBeNull()
			expect(sanitized?.shapeId).toBe('shape1')
		})
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'geo', x: 100, y: 200 })

			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: 'Hello',
				intent: 'test',
				complete: false,
				time: 0,
			})

			labelUtil.applyAction(action)

			const shape = editor.getShape(id) as TLGeoShape | null
			expect(shape?.props.richText).not.toEqual(toRichText('Hello'))
		})

		it('should update shape with text label', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'geo', x: 100, y: 200 })

			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: 'Hello World',
				intent: 'Add label',
				complete: true,
				time: 0,
			})

			labelUtil.applyAction(action)

			const shape = editor.getShape(id) as TLGeoShape | null
			expect(shape?.props.richText).toEqual(toRichText('Hello World'))
		})

		it('should handle empty text', () => {
			const id = createShapeId('shape1')
			editor.createShape({
				id,
				type: 'geo',
				x: 100,
				y: 200,
				props: { richText: toRichText('Old text') },
			})

			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: '',
				intent: 'Clear label',
				complete: true,
				time: 0,
			})

			labelUtil.applyAction(action)

			const shape = editor.getShape(id) as TLGeoShape | null
			expect(shape?.props.richText).toEqual(toRichText(''))
		})

		it('should handle undefined text', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'geo', x: 100, y: 200 })

			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: '',
				intent: 'test',
				complete: true,
				time: 0,
			})

			labelUtil.applyAction(action)

			const shape = editor.getShape(id) as TLGeoShape | null
			expect(shape?.props.richText).toEqual(toRichText(''))
		})

		it('should move fairy to shape position', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'geo', x: 150, y: 250 })

			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: 'Test',
				intent: 'test',
				complete: true,
				time: 0,
			})

			labelUtil.applyAction(action)

			expect(agent.position.moveTo).toHaveBeenCalledWith({
				x: 150,
				y: 250,
			})
		})

		it('should update note shape with text', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'note', x: 100, y: 200 })

			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: 'Note content',
				intent: 'Add note',
				complete: true,
				time: 0,
			})

			labelUtil.applyAction(action)

			const shape = editor.getShape(id) as TLNoteShape | null
			expect(shape?.props.richText).toEqual(toRichText('Note content'))
		})

		it('should replace existing text', () => {
			const id = createShapeId('shape1')
			editor.createShape({
				id,
				type: 'geo',
				x: 100,
				y: 200,
				props: { richText: toRichText('Old text') },
			})

			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: 'New text',
				intent: 'Update label',
				complete: true,
				time: 0,
			})

			labelUtil.applyAction(action)

			const shape = editor.getShape(id) as TLGeoShape | null
			expect(shape?.props.richText).toEqual(toRichText('New text'))
		})

		it('should handle multiline text', () => {
			const id = createShapeId('shape1')
			editor.createShape({ id, type: 'geo', x: 100, y: 200 })

			const multilineText = 'Line 1\nLine 2\nLine 3'
			const action = createAgentAction({
				_type: 'label',
				shapeId: 'shape1',
				text: multilineText,
				intent: 'Add multiline label',
				complete: true,
				time: 0,
			})

			labelUtil.applyAction(action)

			const shape = editor.getShape(id) as TLGeoShape | null
			expect(shape?.props.richText).toEqual(toRichText(multilineText))
		})
	})
})
