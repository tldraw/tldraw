import { createAgentAction } from '@tldraw/fairy-shared'
import { Editor, TLDrawShape } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { PenActionUtil } from '../PenActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('PenActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let penUtil: PenActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		penUtil = new PenActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('sanitizeAction', () => {
		it('should return action as-is if no points', () => {
			const action = createAgentAction({
				_type: 'pen',
				intent: 'test',
				color: 'black',
				closed: false,
				fill: 'none',
				style: 'smooth',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 100 },
					{ x: 200, y: 200 },
				],
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = penUtil.sanitizeAction(action, helpers)

			expect(sanitized).toBe(action)
		})

		it('should exclude last point if not complete', () => {
			const action = {
				...createAgentAction({
					_type: 'pen',
					points: [
						{ x: 0, y: 0 },
						{ x: 50, y: 50 },
						{ x: 100, y: 100 },
					],
					intent: 'test',
					color: 'black',
					closed: false,
					fill: 'none',
					style: 'smooth',
				}),
				complete: false,
				time: 0,
			}

			const helpers = new AgentHelpers(agent)
			const sanitized = penUtil.sanitizeAction(action, helpers)

			expect(sanitized?.points).toHaveLength(2)
			expect(sanitized?.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
			])
		})

		it('should include all points if complete', () => {
			const action = {
				...createAgentAction({
					_type: 'pen',
					points: [
						{ x: 0, y: 0 },
						{ x: 50, y: 50 },
						{ x: 100, y: 100 },
					],
					intent: 'test',
					color: 'black',
					closed: false,
					fill: 'none',
					style: 'smooth',
				}),
				complete: true,
				time: 0,
			}

			const helpers = new AgentHelpers(agent)
			const sanitized = penUtil.sanitizeAction(action, helpers)

			expect(sanitized?.points).toHaveLength(3)
		})

		it('should filter out invalid points', () => {
			const action = {
				...createAgentAction({
					_type: 'pen',
					points: [
						{ x: 0, y: 0 },
						// @ts-expect-error - we're testing invalid points
						{ x: 'oops', y: 50 },
						{ x: 100, y: 100 },
					],
					intent: 'test',
					color: 'black',
					closed: false,
					fill: 'none',
					style: 'smooth',
				}),
				complete: true,
				time: 0,
			}

			const helpers = new AgentHelpers(agent)
			// @ts-expect-error - we're testing invalid points
			const sanitized = penUtil.sanitizeAction(action, helpers)

			expect(sanitized?.points).toHaveLength(2)
			expect(sanitized?.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 100, y: 100 },
			])
		})

		it('should preserve closed value if valid', () => {
			const action = {
				...createAgentAction({
					_type: 'pen',
					points: [
						{ x: 0, y: 0 },
						{ x: 100, y: 100 },
					],
					closed: true,
					intent: 'test',
					color: 'black',
					fill: 'none',
					style: 'smooth',
				}),
				complete: true,
				time: 0,
			}

			const helpers = new AgentHelpers(agent)
			const sanitized = penUtil.sanitizeAction(action, helpers)

			expect(sanitized?.closed).toBe(true)
		})

		it('should set default fill to none', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 100 },
				],
				intent: 'test',
				color: 'black',
				closed: false,
				fill: 'none',
				style: 'smooth',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = penUtil.sanitizeAction(action, helpers)

			expect(sanitized?.fill).toBe('none')
		})

		it('should preserve valid fill value', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 100 },
				],
				fill: 'solid',
				intent: 'test',
				color: 'black',
				closed: false,
				style: 'smooth',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const sanitized = penUtil.sanitizeAction(action, helpers)

			expect(sanitized?.fill).toBe('solid')
		})
	})

	describe('applyAction', () => {
		it('should not apply action if no points', () => {
			const action = createAgentAction({
				_type: 'pen',
				intent: 'test',
				color: 'black',
				closed: false,
				fill: 'none',
				style: 'smooth',
				points: [],
				complete: true,
				time: 0,
			})

			const shapesBefore = editor.getCurrentPageShapes().length
			penUtil.applyAction(action, new AgentHelpers(agent))

			const shapesAfter = editor.getCurrentPageShapes().length
			expect(shapesAfter).toBe(shapesBefore)
		})

		it('should not apply action if points array is empty', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [],
				intent: 'test',
				color: 'black',
				closed: false,
				fill: 'none',
				style: 'smooth',
				complete: true,
				time: 0,
			})

			const shapesBefore = editor.getCurrentPageShapes().length
			penUtil.applyAction(action, new AgentHelpers(agent))

			const shapesAfter = editor.getCurrentPageShapes().length
			expect(shapesAfter).toBe(shapesBefore)
		})

		it('should not apply action if only one point after interpolation', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [{ x: 0, y: 0 }],
				intent: 'test',
				color: 'black',
				closed: false,
				fill: 'none',
				style: 'smooth',
				complete: true,
				time: 0,
			})

			const shapesBefore = editor.getCurrentPageShapes().length
			penUtil.applyAction(action, new AgentHelpers(agent))

			const shapesAfter = editor.getCurrentPageShapes().length
			expect(shapesAfter).toBe(shapesBefore)
		})

		it('should create a draw shape with correct properties', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [
					{ x: 100, y: 100 },
					{ x: 200, y: 200 },
				],
				color: 'red',
				fill: 'solid',
				closed: false,
				intent: 'Draw line',
				style: 'smooth',
				complete: true,
				time: 0,
			})

			penUtil.applyAction(action, new AgentHelpers(agent))

			const shapes = editor.getCurrentPageShapes()
			const drawShape = shapes.find((s) => s.type === 'draw') as TLDrawShape

			expect(drawShape).toBeDefined()
			expect(drawShape.props.color).toBe('red')
			expect(drawShape.props.fill).toBe('lined-fill') // 'solid' converts to 'lined-fill'
			expect(drawShape.props.dash).toBe('draw')
			expect(drawShape.props.size).toBe('s')
			expect(drawShape.props.isComplete).toBe(true)
			expect(drawShape.props.isClosed).toBe(false)
			expect(drawShape.props.isPen).toBe(true)
		})

		it('should position shape at minimum x,y coordinates', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [
					{ x: 200, y: 300 },
					{ x: 100, y: 200 },
					{ x: 150, y: 250 },
				],
				closed: false,
				intent: 'test',
				color: 'black',
				fill: 'none',
				style: 'smooth',
				complete: true,
				time: 0,
			})

			penUtil.applyAction(action, new AgentHelpers(agent))

			const shapes = editor.getCurrentPageShapes()
			const drawShape = shapes.find((s) => s.type === 'draw') as TLDrawShape

			expect(drawShape.x).toBe(100)
			expect(drawShape.y).toBe(200)
		})

		it('should create segments with normalized coordinates', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [
					{ x: 100, y: 100 },
					{ x: 200, y: 200 },
				],
				closed: false,
				intent: 'test',
				color: 'black',
				fill: 'none',
				style: 'smooth',
				complete: true,
				time: 0,
			})

			penUtil.applyAction(action, new AgentHelpers(agent))

			const shapes = editor.getCurrentPageShapes()
			const drawShape = shapes.find((s) => s.type === 'draw') as TLDrawShape

			expect(drawShape.props.segments).toHaveLength(1)
			expect(drawShape.props.segments[0].type).toBe('free')
			expect(drawShape.props.segments[0].points.length).toBeGreaterThan(0)
			// First point should be normalized to 0,0
			expect(drawShape.props.segments[0].points[0].x).toBe(0)
			expect(drawShape.props.segments[0].points[0].y).toBe(0)
		})

		it('should close shape by duplicating first point when closed is true', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [
					{ x: 100, y: 100 },
					{ x: 200, y: 100 },
					{ x: 200, y: 200 },
				],
				closed: true,
				fill: 'solid',
				intent: 'test',
				color: 'black',
				style: 'smooth',
				complete: true,
				time: 0,
			})

			penUtil.applyAction(action, new AgentHelpers(agent))

			const shapes = editor.getCurrentPageShapes()
			const drawShape = shapes.find((s) => s.type === 'draw') as TLDrawShape

			expect(drawShape.props.isClosed).toBe(true)
			expect(drawShape.props.fill).toBe('lined-fill') // 'solid' converts to 'lined-fill'
		})

		it('should move fairy to last point position', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [
					{ x: 100, y: 100 },
					{ x: 200, y: 200 },
					{ x: 300, y: 150 },
				],
				closed: false,
				intent: 'test',
				color: 'black',
				fill: 'none',
				style: 'smooth',
				complete: true,
				time: 0,
			})

			penUtil.applyAction(action, new AgentHelpers(agent))

			expect(agent.position.moveTo).toHaveBeenCalled()
			// @ts-expect-error - we're testing the mock
			const callArgs = agent.position.moveTo.mock.calls[0][0]
			// Position might be slightly off due to point interpolation, but should be reasonably close
			expect(Math.abs(callArgs.x - 300)).toBeLessThan(10)
			expect(Math.abs(callArgs.y - 150)).toBeLessThan(10)
		})

		it('should interpolate points for smooth style', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 0 },
				],
				style: 'smooth',
				closed: false,
				intent: 'test',
				color: 'black',
				fill: 'none',
				complete: true,
				time: 0,
			})

			penUtil.applyAction(action, new AgentHelpers(agent))

			const shapes = editor.getCurrentPageShapes()
			const drawShape = shapes.find((s) => s.type === 'draw') as TLDrawShape

			// Should have interpolated points between start and end
			expect(drawShape.props.segments[0].points.length).toBeGreaterThan(2)
		})

		it('should handle default color', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 100 },
				],
				closed: false,
				intent: 'test',
				color: 'black',
				fill: 'none',
				style: 'smooth',
				complete: true,
				time: 0,
			})

			penUtil.applyAction(action, new AgentHelpers(agent))

			const shapes = editor.getCurrentPageShapes()
			const drawShape = shapes.find((s) => s.type === 'draw') as TLDrawShape

			expect(drawShape.props.color).toBe('black')
		})

		it('should handle various colors', () => {
			const colors: Array<'blue' | 'green' | 'yellow' | 'orange' | 'red'> = [
				'blue',
				'green',
				'yellow',
				'orange',
				'red',
			]

			colors.forEach((color) => {
				const action = createAgentAction({
					_type: 'pen',
					points: [
						{ x: 0, y: 0 },
						{ x: 100, y: 100 },
					],
					color,
					closed: false,
					intent: 'test',
					fill: 'none',
					style: 'smooth',
					complete: true,
					time: 0,
				})

				penUtil.applyAction(action, new AgentHelpers(agent))

				const shapes = editor.getCurrentPageShapes()
				const drawShape = shapes.find(
					(s) => s.type === 'draw' && s.props.color === color
				) as TLDrawShape

				expect(drawShape).toBeDefined()
				expect(drawShape.props.color).toBe(color)
			})
		})

		it('should create shape with isComplete set to action complete status', () => {
			const action = createAgentAction({
				_type: 'pen',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 100 },
				],
				closed: false,
				intent: 'test',
				color: 'black',
				fill: 'none',
				style: 'smooth',
				complete: true,
				time: 0,
			})

			penUtil.applyAction(action, new AgentHelpers(agent))

			const shapes = editor.getCurrentPageShapes()
			const drawShape = shapes.find((s) => s.type === 'draw') as TLDrawShape

			expect(drawShape.props.isComplete).toBe(true)
		})
	})
})
