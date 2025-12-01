import { createAgentAction } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { MovePositionActionUtil } from '../MovePositionActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('MovePositionActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let movePositionUtil: MovePositionActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		movePositionUtil = new MovePositionActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const action = createAgentAction({
				_type: 'move-position',
				x: 100,
				y: 200,
				intent: 'test',
				complete: false,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			movePositionUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})

		it('should move agent to specified position', () => {
			const initialFairyPosition = agent.getEntity().position

			const action = createAgentAction({
				_type: 'move-position',
				x: 100,
				y: 200,
				intent: 'Moving',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			movePositionUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()

			const newFairyPosition = agent.getEntity().position
			expect(newFairyPosition.x).not.toBe(initialFairyPosition.x)
			expect(newFairyPosition.y).not.toBe(initialFairyPosition.y)
		})

		it('should apply offset removal to position', () => {
			const action = createAgentAction({
				_type: 'move-position',
				x: 100,
				y: 200,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const removeOffsetSpy = vi.spyOn(helpers, 'removeOffsetFromVec')
			movePositionUtil.applyAction(action, helpers)

			expect(removeOffsetSpy).toHaveBeenCalledWith({
				x: 100,
				y: 200,
			})
		})

		it('should handle moving to origin', () => {
			const initialFairyPosition = agent.getEntity().position

			const action = createAgentAction({
				_type: 'move-position',
				x: 0,
				y: 0,
				intent: 'Moving to origin',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			movePositionUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()
			// Verify the fairy's position changed (unless it was already at origin)
			const newFairyPosition = agent.getEntity().position
			if (initialFairyPosition.x !== 0 || initialFairyPosition.y !== 0) {
				expect(newFairyPosition.x).not.toBe(initialFairyPosition.x)
				expect(newFairyPosition.y).not.toBe(initialFairyPosition.y)
			}
		})

		it('should handle negative coordinates', () => {
			const initialFairyPosition = agent.getEntity().position

			const action = createAgentAction({
				_type: 'move-position',
				x: -500,
				y: -300,
				intent: 'Moving to negative coordinates',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			movePositionUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()

			const newFairyPosition = agent.getEntity().position
			expect(newFairyPosition.x).not.toBe(initialFairyPosition.x)
			expect(newFairyPosition.y).not.toBe(initialFairyPosition.y)
		})

		it('should handle large coordinates', () => {
			const initialFairyPosition = agent.getEntity().position

			const action = createAgentAction({
				_type: 'move-position',
				x: 10000,
				y: 10000,
				intent: 'Moving far away',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			movePositionUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()

			const newFairyPosition = agent.getEntity().position
			expect(newFairyPosition.x).not.toBe(initialFairyPosition.x)
			expect(newFairyPosition.y).not.toBe(initialFairyPosition.y)
		})

		it('should handle fractional coordinates', () => {
			const initialFairyPosition = agent.getEntity().position

			const action = createAgentAction({
				_type: 'move-position',
				x: 123.456,
				y: 789.012,
				intent: 'Moving to precise position',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			movePositionUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()

			const newFairyPosition = agent.getEntity().position
			expect(newFairyPosition.x).not.toBe(initialFairyPosition.x)
			expect(newFairyPosition.y).not.toBe(initialFairyPosition.y)
		})

		it('should not interrupt agent like fly-to-bounds does', () => {
			const action = createAgentAction({
				_type: 'move-position',
				x: 100,
				y: 200,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const interruptSpy = vi.spyOn(agent, 'interrupt')
			const helpers = new AgentHelpers(agent)
			movePositionUtil.applyAction(action, helpers)

			// MovePositionActionUtil should not interrupt, unlike FlyToBoundsActionUtil
			expect(interruptSpy).not.toHaveBeenCalled()
		})

		it('should handle moving along y-axis only', () => {
			const initialFairyPosition = agent.getEntity().position

			const action = createAgentAction({
				_type: 'move-position',
				x: 0,
				y: 500,
				intent: 'Moving vertically',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			movePositionUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()
			// Verify the fairy's y position changed (x may or may not change depending on initial position)
			const newFairyPosition = agent.getEntity().position
			if (initialFairyPosition.y !== 500) {
				expect(newFairyPosition.y).not.toBe(initialFairyPosition.y)
			}
		})

		it('should handle very small movements', () => {
			const initialFairyPosition = agent.getEntity().position

			const action = createAgentAction({
				_type: 'move-position',
				x: 0.1,
				y: 0.1,
				intent: 'Tiny adjustment',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			movePositionUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()
			// Verify the fairy's position changed (may be rounded, but should be different from initial)
			const newFairyPosition = agent.getEntity().position
			if (initialFairyPosition.x !== 0 || initialFairyPosition.y !== 0) {
				expect(newFairyPosition.x).not.toBe(initialFairyPosition.x)
				expect(newFairyPosition.y).not.toBe(initialFairyPosition.y)
			}
		})

		it('should handle rapid successive movements', () => {
			const initialFairyPosition = agent.getEntity().position

			const actions = [
				createAgentAction({
					_type: 'move-position',
					x: 100,
					y: 100,
					intent: 'Move 1',
					complete: true,
					time: 0,
				}),
				createAgentAction({
					_type: 'move-position',
					x: 200,
					y: 200,
					intent: 'Move 2',
					complete: true,
					time: 100,
				}),
				createAgentAction({
					_type: 'move-position',
					x: 300,
					y: 300,
					intent: 'Move 3',
					complete: true,
					time: 200,
				}),
			]

			const helpers = new AgentHelpers(agent)

			actions.forEach((action) => {
				movePositionUtil.applyAction(action, helpers)
			})

			expect(agent.position.moveTo).toHaveBeenCalledTimes(3)
			// Verify the fairy's final position changed from initial
			const finalFairyPosition = agent.getEntity().position
			expect(finalFairyPosition.x).not.toBe(initialFairyPosition.x)
			expect(finalFairyPosition.y).not.toBe(initialFairyPosition.y)
		})
	})
})
