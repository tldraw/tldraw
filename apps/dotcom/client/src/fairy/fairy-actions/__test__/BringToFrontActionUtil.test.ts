import { createAgentAction } from '@tldraw/fairy-shared'
import { createShapeId, Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { BringToFrontActionUtil } from '../BringToFrontActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('BringToFrontActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let bringToFrontUtil: BringToFrontActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		bringToFrontUtil = new BringToFrontActionUtil(agent)
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
				_type: 'bring-to-front',
				intent: 'test',
				shapeIds: ['shape1', 'shape2', 'nonexistent'],
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = bringToFrontUtil.sanitizeAction(action, helpers)

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
				_type: 'bring-to-front',
				intent: 'test',
				shapeIds: ['shape1'],
				complete: true,
				time: 0,
			})

			// Temporarily remove agent to test guard
			const originalAgent = bringToFrontUtil['agent']
			bringToFrontUtil['agent'] = undefined as any

			const bringToFrontSpy = vi.spyOn(editor, 'bringToFront')
			bringToFrontUtil.applyAction(action)

			expect(bringToFrontSpy).not.toHaveBeenCalled()

			// Restore agent
			bringToFrontUtil['agent'] = originalAgent
		})

		it('should not apply action without shape IDs', () => {
			const action = createAgentAction({
				_type: 'bring-to-front',
				intent: 'test',
				shapeIds: undefined as any,
				complete: true,
				time: 0,
			})

			const bringToFrontSpy = vi.spyOn(editor, 'bringToFront')
			bringToFrontUtil.applyAction(action)

			expect(bringToFrontSpy).not.toHaveBeenCalled()
		})

		it('should bring single shape to front', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 50, y: 50, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'bring-to-front',
				intent: 'Bring to front',
				shapeIds: ['shape1'],
				complete: true,
				time: 0,
			})

			bringToFrontUtil.applyAction(action)

			// Verify shape was actually brought to front (should be last in array)
			const shapesAfter = editor.getCurrentPageShapesSorted()
			const index1After = shapesAfter.findIndex((s) => s.id === id1)
			const index2After = shapesAfter.findIndex((s) => s.id === id2)
			// shape1 should now be after shape2 (brought to front)
			expect(index1After).toBeGreaterThan(index2After)
			// shape1 should be at the end (last shape)
			expect(index1After).toBe(shapesAfter.length - 1)
		})

		it('should bring multiple shapes to front', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			const id3 = createShapeId('shape3')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 50, y: 50, props: { w: 100, h: 100 } })
			editor.createShape({ id: id3, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'bring-to-front',
				intent: 'Bring all to front',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			bringToFrontUtil.applyAction(action)

			// Verify shapes were actually brought to front
			const shapesAfter = editor.getCurrentPageShapesSorted()
			const index1After = shapesAfter.findIndex((s) => s.id === id1)
			const index2After = shapesAfter.findIndex((s) => s.id === id2)
			const index3After = shapesAfter.findIndex((s) => s.id === id3)
			// shape1 and shape2 should now be after shape3 (brought to front)
			expect(index1After).toBeGreaterThan(index3After)
			expect(index2After).toBeGreaterThan(index3After)
			// shape1 and shape2 should be at the end
			expect(index1After).toBeGreaterThanOrEqual(shapesAfter.length - 2)
			expect(index2After).toBeGreaterThanOrEqual(shapesAfter.length - 2)
		})

		it('should move fairy to the center of shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'bring-to-front',
				intent: 'test',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			bringToFrontUtil.applyAction(action)

			// Should move to center of bounds
			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should not move fairy if shapes have no bounds', () => {
			const action = createAgentAction({
				_type: 'bring-to-front',
				intent: 'test',
				shapeIds: [],
				complete: true,
				time: 0,
			})

			bringToFrontUtil.applyAction(action)

			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})

		it('should handle bringing shapes with empty array', () => {
			const action = createAgentAction({
				_type: 'bring-to-front',
				intent: 'test',
				shapeIds: [],
				complete: true,
				time: 0,
			})

			const bringToFrontSpy = vi.spyOn(editor, 'bringToFront')
			bringToFrontUtil.applyAction(action)

			expect(bringToFrontSpy).toHaveBeenCalledWith([])
			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})
	})
})
