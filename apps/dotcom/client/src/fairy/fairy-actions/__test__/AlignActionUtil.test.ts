import { createAgentAction } from '@tldraw/fairy-shared'
import { createShapeId, Editor, TLShapeId } from 'tldraw'
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

			const action = createAgentAction({
				_type: 'align',
				alignment: 'left',
				gap: 0,
				intent: 'Align left',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			const alignShapesSpy = vi.spyOn(editor, 'alignShapes')
			alignUtil.applyAction(action)

			expect(alignShapesSpy).toHaveBeenCalledWith([id1 as TLShapeId, id2 as TLShapeId], 'left')
		})

		it('should align shapes to the right', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'align',
				alignment: 'right',
				gap: 0,
				intent: 'Align right',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			const alignShapesSpy = vi.spyOn(editor, 'alignShapes')
			alignUtil.applyAction(action)

			expect(alignShapesSpy).toHaveBeenCalledWith([id1 as TLShapeId, id2 as TLShapeId], 'right')
		})

		it('should align shapes to the top', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 0, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'align',
				alignment: 'top',
				gap: 0,
				intent: 'Align top',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			const alignShapesSpy = vi.spyOn(editor, 'alignShapes')
			alignUtil.applyAction(action)

			expect(alignShapesSpy).toHaveBeenCalledWith([id1 as TLShapeId, id2 as TLShapeId], 'top')
		})

		it('should align shapes to the bottom', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 0, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'align',
				alignment: 'bottom',
				gap: 0,
				intent: 'Align bottom',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			const alignShapesSpy = vi.spyOn(editor, 'alignShapes')
			alignUtil.applyAction(action)

			expect(alignShapesSpy).toHaveBeenCalledWith([id1 as TLShapeId, id2 as TLShapeId], 'bottom')
		})

		it('should align shapes center-horizontal', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'align',
				alignment: 'center-horizontal',
				gap: 0,
				intent: 'Center horizontally',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			const alignShapesSpy = vi.spyOn(editor, 'alignShapes')
			alignUtil.applyAction(action)

			expect(alignShapesSpy).toHaveBeenCalledWith(
				[id1 as TLShapeId, id2 as TLShapeId],
				'center-horizontal'
			)
		})

		it('should align shapes center-vertical', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')

			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 0, y: 200, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'align',
				alignment: 'center-vertical',
				gap: 0,
				intent: 'Center vertically',
				shapeIds: ['shape1', 'shape2'],
				complete: true,
				time: 0,
			})

			const alignShapesSpy = vi.spyOn(editor, 'alignShapes')
			alignUtil.applyAction(action)

			expect(alignShapesSpy).toHaveBeenCalledWith(
				[id1 as TLShapeId, id2 as TLShapeId],
				'center-vertical'
			)
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
			expect(agent.positionManager.moveTo).toHaveBeenCalled()
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

			expect(agent.positionManager.moveTo).not.toHaveBeenCalled()
		})
	})
})
