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

			expect(agent.positionManager.moveTo).not.toHaveBeenCalled()
		})

		it('should move agent to specified position', () => {
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

			expect(agent.positionManager.moveTo).toHaveBeenCalled()
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

			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should handle negative coordinates', () => {
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

			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should handle large coordinates', () => {
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

			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should handle fractional coordinates', () => {
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

			expect(agent.positionManager.moveTo).toHaveBeenCalled()
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

		it('should handle moving along x-axis only', () => {
			const action = createAgentAction({
				_type: 'move-position',
				x: 500,
				y: 0,
				intent: 'Moving horizontally',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			movePositionUtil.applyAction(action, helpers)

			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should handle moving along y-axis only', () => {
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

			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should handle very small movements', () => {
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

			expect(agent.positionManager.moveTo).toHaveBeenCalled()
		})

		it('should handle rapid successive movements', () => {
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

			expect(agent.positionManager.moveTo).toHaveBeenCalledTimes(3)
		})
	})
})
