import { createAgentAction } from '@tldraw/fairy-shared'
import { Box, createShapeId, Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { AlignActionUtil } from '../AlignActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('AlignActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let alignUtil: AlignActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		alignUtil = new AlignActionUtil(agent)
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
				_type: 'align',
				alignment: 'left',
				gap: 0,
				intent: 'test',
				shapeIds: ['shape1', 'shape2', 'nonexistent'],
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = alignUtil.sanitizeAction(action, helpers)

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
				_type: 'align',
				alignment: 'left',
				gap: 0,
				intent: 'test',
				shapeIds: [],
				complete: false,
				time: 0,
			})

			const alignShapesSpy = vi.spyOn(editor, 'alignShapes')
			alignUtil.applyAction(action)

			expect(alignShapesSpy).not.toHaveBeenCalled()
		})

		it('should align shapes to the left', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const bounds1Before = editor.getShapePageBounds(id1)
			const bounds2Before = editor.getShapePageBounds(id2)

			const action = createAgentAction({
				_type: 'align',
				alignment: 'left',
				gap: 0,
				intent: 'Align left',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			alignUtil.applyAction(action)

			// Verify shapes were actually aligned (left edges should be aligned)
			const bounds1After = editor.getShapePageBounds(id1)
			const bounds2After = editor.getShapePageBounds(id2)

			expect(bounds1After).toBeDefined()
			expect(bounds2After).toBeDefined()
			// Left edges should be aligned (minX should be the same)
			expect(bounds1After!.minX).toBe(bounds2After!.minX)
			// At least one shape should have moved
			const shapesMoved =
				bounds1After!.minX !== bounds1Before!.minX || bounds2After!.minX !== bounds2Before!.minX
			expect(shapesMoved).toBe(true)
		})

		it('should align shapes to the right', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const bounds1Before = editor.getShapePageBounds(id1)
			const bounds2Before = editor.getShapePageBounds(id2)

			const action = createAgentAction({
				_type: 'align',
				alignment: 'right',
				gap: 0,
				intent: 'Align right',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			alignUtil.applyAction(action)

			// Verify shapes were actually aligned (right edges should be aligned)
			const bounds1After = editor.getShapePageBounds(id1)
			const bounds2After = editor.getShapePageBounds(id2)

			expect(bounds1After).toBeDefined()
			expect(bounds2After).toBeDefined()
			// Right edges should be aligned (maxX should be the same)
			expect(bounds1After!.maxX).toBe(bounds2After!.maxX)
			// At least one shape should have moved
			const shapesMoved =
				bounds1After!.maxX !== bounds1Before!.maxX || bounds2After!.maxX !== bounds2Before!.maxX
			expect(shapesMoved).toBe(true)
		})

		it('should align shapes to the top', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 0, y: 200, props: { w: 100, h: 100 } })

			const bounds1Before = editor.getShapePageBounds(id1)
			const bounds2Before = editor.getShapePageBounds(id2)

			const action = createAgentAction({
				_type: 'align',
				alignment: 'top',
				gap: 0,
				intent: 'Align top',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			alignUtil.applyAction(action)

			// Verify shapes were actually aligned (top edges should be aligned)
			const bounds1After = editor.getShapePageBounds(id1)
			const bounds2After = editor.getShapePageBounds(id2)

			expect(bounds1After).toBeDefined()
			expect(bounds2After).toBeDefined()
			// Top edges should be aligned (minY should be the same)
			expect(bounds1After!.minY).toBe(bounds2After!.minY)
			// At least one shape should have moved
			const shapesMoved =
				bounds1After!.minY !== bounds1Before!.minY || bounds2After!.minY !== bounds2Before!.minY
			expect(shapesMoved).toBe(true)
		})

		it('should align shapes to the bottom', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 0, y: 200, props: { w: 100, h: 100 } })

			const bounds1Before = editor.getShapePageBounds(id1)
			const bounds2Before = editor.getShapePageBounds(id2)

			const action = createAgentAction({
				_type: 'align',
				alignment: 'bottom',
				gap: 0,
				intent: 'Align bottom',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			alignUtil.applyAction(action)

			// Verify shapes were actually aligned (bottom edges should be aligned)
			const bounds1After = editor.getShapePageBounds(id1)
			const bounds2After = editor.getShapePageBounds(id2)

			expect(bounds1After).toBeDefined()
			expect(bounds2After).toBeDefined()
			// Bottom edges should be aligned (maxY should be the same)
			expect(bounds1After!.maxY).toBe(bounds2After!.maxY)
			// At least one shape should have moved
			const shapesMoved =
				bounds1After!.maxY !== bounds1Before!.maxY || bounds2After!.maxY !== bounds2Before!.maxY
			expect(shapesMoved).toBe(true)
		})

		it('should align shapes center-horizontal', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const bounds1Before = editor.getShapePageBounds(id1)
			const bounds2Before = editor.getShapePageBounds(id2)

			const action = createAgentAction({
				_type: 'align',
				alignment: 'center-horizontal',
				gap: 0,
				intent: 'Center horizontally',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			alignUtil.applyAction(action)

			// Verify shapes were actually aligned (vertical centers should be aligned)
			const bounds1After = editor.getShapePageBounds(id1)
			const bounds2After = editor.getShapePageBounds(id2)

			expect(bounds1After).toBeDefined()
			expect(bounds2After).toBeDefined()
			// Vertical centers should be aligned (midY should be the same)
			expect(bounds1After!.midX).toBe(bounds2After!.midX)
			// At least one shape should have moved
			const shapesMoved =
				bounds1After!.midX !== bounds1Before!.midX || bounds2After!.midX !== bounds2Before!.midX
			expect(shapesMoved).toBe(true)
		})

		it('should align shapes center-vertical', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 200, props: { w: 100, h: 100 } })

			const bounds1Before = editor.getShapePageBounds(id1)!
			const bounds2Before = editor.getShapePageBounds(id2)!
			const combinedBoundsBefore = Box.Common([bounds1Before, bounds2Before])

			const action = createAgentAction({
				_type: 'align',
				alignment: 'center-vertical',
				gap: 0,
				intent: 'Center vertically',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			alignUtil.applyAction(action)

			// Verify shapes were actually aligned (horizontal centers should be aligned)
			const bounds1After = editor.getShapePageBounds(id1)!
			const bounds2After = editor.getShapePageBounds(id2)!
			const combinedBoundsAfter = Box.Common([bounds1After, bounds2After])

			expect(bounds1After).toBeDefined()
			expect(bounds2After).toBeDefined()
			// Horizontal centers should be aligned (midX should be the same)
			expect(combinedBoundsAfter.midY).toBe(combinedBoundsBefore.midY)
			// At least one shape should have moved
			const shapesMoved =
				bounds1After!.midY !== bounds1Before!.midY || bounds2After!.midY !== bounds2Before!.midY
			expect(shapesMoved).toBe(true)
		})

		it('should move fairy to the center of aligned shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'align',
				alignment: 'left',
				gap: 0,
				intent: 'test',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			alignUtil.applyAction(action)

			// Should move to center of bounds
			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should not move fairy if shapes have no bounds', () => {
			const action = createAgentAction({
				_type: 'align',
				alignment: 'left',
				gap: 0,
				intent: 'test',
				shapeIds: [],
				complete: true,
				time: 0,
			})

			alignUtil.applyAction(action)

			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})
	})
})
