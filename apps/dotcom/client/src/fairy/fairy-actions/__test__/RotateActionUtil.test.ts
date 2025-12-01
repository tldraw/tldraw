import { createAgentAction } from '@tldraw/fairy-shared'
import { createShapeId, Editor, TLShapeId } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { RotateActionUtil } from '../RotateActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('RotateActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let rotateUtil: RotateActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		rotateUtil = new RotateActionUtil(agent)
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
				_type: 'rotate',
				shapeIds: ['shape1', 'shape2'],
				degrees: 90,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = rotateUtil.sanitizeAction(action, helpers)

			expect(sanitized?.shapeIds).toHaveLength(2)
			expect(sanitized?.shapeIds).toContain('shape1')
			expect(sanitized?.shapeIds).toContain('shape2')
		})

		it('should filter out nonexistent shapes', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0 })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1', 'nonexistent'],
				degrees: 90,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = rotateUtil.sanitizeAction(action, helpers)

			expect(sanitized?.shapeIds).toHaveLength(1)
			expect(sanitized?.shapeIds).toContain('shape1')
			expect(sanitized?.shapeIds).not.toContain('nonexistent')
		})

		it('should handle empty shapeIds array', () => {
			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: [],
				degrees: 90,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = rotateUtil.sanitizeAction(action, helpers)

			expect(sanitized?.shapeIds).toHaveLength(0)
		})

		it('should handle undefined shapeIds', () => {
			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: undefined as any,
				degrees: 90,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = rotateUtil.sanitizeAction(action, helpers)

			expect(sanitized?.shapeIds).toHaveLength(0)
		})
	})

	describe('applyAction', () => {
		it('should not apply action with missing shapeIds', () => {
			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: undefined as any,
				degrees: 90,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')
			rotateUtil.applyAction(action, helpers)

			expect(rotateShapesBySpy).not.toHaveBeenCalled()
		})

		it('should not apply action with missing degrees', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: undefined as any,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')
			rotateUtil.applyAction(action, helpers)

			expect(rotateShapesBySpy).not.toHaveBeenCalled()
		})

		it('should not apply action with missing originX', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: 90,
				originX: undefined as any,
				originY: 50,
				centerY: 50,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')
			rotateUtil.applyAction(action, helpers)

			expect(rotateShapesBySpy).not.toHaveBeenCalled()
		})

		it('should not apply action with missing originY', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: 90,
				originX: 50,
				originY: undefined as any,
				centerY: 50,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')
			rotateUtil.applyAction(action, helpers)

			expect(rotateShapesBySpy).not.toHaveBeenCalled()
		})

		it('should rotate a single shape by 90 degrees', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const shapeBefore = editor.getShape(id1)
			const initialRotation = shapeBefore!.rotation

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: 90,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'Rotate 90 degrees',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			rotateUtil.applyAction(action, helpers)

			const shapeAfter = editor.getShape(id1)
			expect(shapeAfter).toBeDefined()
			// Verify the shape was actually rotated
			const expectedRotation = initialRotation + (90 * Math.PI) / 180
			// Rotation is normalized, so check it's approximately correct
			expect(Math.abs(shapeAfter!.rotation - expectedRotation)).toBeLessThan(0.01)
		})

		it('should rotate multiple shapes', () => {
			const id1 = createShapeId('shape1')
			const id2 = createShapeId('shape2')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
			editor.createShape({ id: id2, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } })

			const shape1Before = editor.getShape(id1)
			const shape2Before = editor.getShape(id2)
			const initialRotation1 = shape1Before!.rotation
			const initialRotation2 = shape2Before!.rotation

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1', 'shape2'],
				degrees: 45,
				originX: 150,
				originY: 50,
				centerY: 50,
				intent: 'Rotate both',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			rotateUtil.applyAction(action, helpers)

			const shape1After = editor.getShape(id1)
			const shape2After = editor.getShape(id2)
			expect(shape1After).toBeDefined()
			expect(shape2After).toBeDefined()
			// Verify both shapes were actually rotated
			const expectedRotation = (45 * Math.PI) / 180
			expect(Math.abs(shape1After!.rotation - (initialRotation1 + expectedRotation))).toBeLessThan(
				0.01
			)
			expect(Math.abs(shape2After!.rotation - (initialRotation2 + expectedRotation))).toBeLessThan(
				0.01
			)
		})

		it('should move fairy to the origin point', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: 90,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			rotateUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalledWith({ x: 50, y: 50 })
		})

		it('should handle rotation by 180 degrees', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: 180,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'Flip',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')
			rotateUtil.applyAction(action, helpers)

			const expectedRadians = (180 * Math.PI) / 180
			expect(rotateShapesBySpy).toHaveBeenCalledWith([id1 as TLShapeId], expectedRadians, {
				center: { x: 50, y: 50 },
			})
		})

		it('should handle rotation by 360 degrees', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: 360,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'Full rotation',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')
			rotateUtil.applyAction(action, helpers)

			const expectedRadians = (360 * Math.PI) / 180
			expect(rotateShapesBySpy).toHaveBeenCalledWith([id1 as TLShapeId], expectedRadians, {
				center: { x: 50, y: 50 },
			})
		})

		it('should handle negative rotation', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: -45,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'Rotate counterclockwise',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')
			rotateUtil.applyAction(action, helpers)

			const expectedRadians = (-45 * Math.PI) / 180
			expect(rotateShapesBySpy).toHaveBeenCalledWith([id1 as TLShapeId], expectedRadians, {
				center: { x: 50, y: 50 },
			})
		})

		it('should handle small rotation angles', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: 5,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'Small rotation',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')
			rotateUtil.applyAction(action, helpers)

			const expectedRadians = (5 * Math.PI) / 180
			expect(rotateShapesBySpy).toHaveBeenCalledWith([id1 as TLShapeId], expectedRadians, {
				center: { x: 50, y: 50 },
			})
		})

		it('should not apply action with zero degrees', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: 0,
				originX: 50,
				originY: 50,
				centerY: 50,
				intent: 'No rotation',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')
			rotateUtil.applyAction(action, helpers)

			// Zero degrees fails the falsy check, so action is not applied
			expect(rotateShapesBySpy).not.toHaveBeenCalled()
		})

		it('should apply offset transformations to origin', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			// Set up a chat origin offset
			vi.mocked(agent.chatOrigin.getOrigin).mockReturnValue({ x: 50, y: 50 })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: 90,
				originX: 100,
				originY: 100,
				centerY: 100,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			rotateUtil.applyAction(action, helpers)

			// The offset should be removed from the origin
			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should correctly convert degrees to radians', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const testCases = [
				{ degrees: 30, expectedRadians: (30 * Math.PI) / 180 },
				{ degrees: 60, expectedRadians: (60 * Math.PI) / 180 },
				{ degrees: 120, expectedRadians: (120 * Math.PI) / 180 },
				{ degrees: 270, expectedRadians: (270 * Math.PI) / 180 },
			]

			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')

			for (const { degrees, expectedRadians } of testCases) {
				rotateShapesBySpy.mockClear()

				const action = createAgentAction({
					_type: 'rotate',
					shapeIds: ['shape1'],
					degrees,
					originX: 50,
					originY: 50,
					centerY: 50,
					intent: 'test',
					complete: true,
					time: 0,
				})

				const helpers = new AgentHelpers(agent)
				rotateUtil.applyAction(action, helpers)

				expect(rotateShapesBySpy).toHaveBeenCalledWith([id1 as TLShapeId], expectedRadians, {
					center: { x: 50, y: 50 },
				})
			}
		})

		it('should handle rotation with negative origin coordinates', () => {
			const id1 = createShapeId('shape1')
			editor.createShape({ id: id1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

			const action = createAgentAction({
				_type: 'rotate',
				shapeIds: ['shape1'],
				degrees: 90,
				originX: -50,
				originY: -50,
				centerY: -50,
				intent: 'Rotate from negative origin',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const rotateShapesBySpy = vi.spyOn(editor, 'rotateShapesBy')
			rotateUtil.applyAction(action, helpers)

			const expectedRadians = (90 * Math.PI) / 180
			expect(rotateShapesBySpy).toHaveBeenCalledWith([id1 as TLShapeId], expectedRadians, {
				center: { x: -50, y: -50 },
			})
		})
	})
})
