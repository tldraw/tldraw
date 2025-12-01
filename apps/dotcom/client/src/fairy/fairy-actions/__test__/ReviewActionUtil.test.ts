import { createAgentAction } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { ReviewActionUtil } from '../ReviewActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('ReviewActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let reviewUtil: ReviewActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		reviewUtil = new ReviewActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const action = createAgentAction({
				_type: 'review',
				intent: 'test',
				x: 100,
				y: 100,
				w: 200,
				h: 200,
				complete: false,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const scheduleSpy = vi.spyOn(agent, 'schedule')

			reviewUtil.applyAction(action, helpers)

			expect(scheduleSpy).not.toHaveBeenCalled()
		})

		it('should schedule review with correct bounds and message', () => {
			const action = createAgentAction({
				_type: 'review',
				intent: 'Check alignment results',
				x: 100,
				y: 100,
				w: 200,
				h: 200,
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const scheduleSpy = vi.spyOn(agent, 'schedule')
			const removeOffsetSpy = vi.spyOn(helpers, 'removeOffsetFromBox')

			reviewUtil.applyAction(action, helpers)

			expect(removeOffsetSpy).toHaveBeenCalledWith({
				x: 100,
				y: 100,
				w: 200,
				h: 200,
			})
			expect(scheduleSpy).toHaveBeenCalled()

			const scheduleCall = scheduleSpy.mock.calls[0][0]
			expect(
				typeof scheduleCall === 'object' && scheduleCall !== null && !Array.isArray(scheduleCall)
			).toBe(true)
			if (
				typeof scheduleCall === 'object' &&
				scheduleCall !== null &&
				!Array.isArray(scheduleCall) &&
				'agentMessages' in scheduleCall &&
				Array.isArray(scheduleCall.agentMessages)
			) {
				expect(scheduleCall.agentMessages).toHaveLength(1)
				expect(scheduleCall.agentMessages[0]).toContain('Check alignment results')
				expect(scheduleCall.agentMessages[0]).toContain('Is there still more work to do?')
				expect(scheduleCall.agentMessages[0]).toContain('Is the task supposed to be complete?')
			}
		})

		it('should not do anything for incomplete actions', () => {
			const action = createAgentAction({
				_type: 'review',
				intent: 'test',
				x: 100,
				y: 100,
				w: 200,
				h: 200,
				complete: false,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const setSpy = vi.spyOn(agent, 'updateEntity')

			reviewUtil.applyAction(action, helpers)

			// Should not schedule for incomplete action
			expect(agent.schedule).not.toHaveBeenCalled()

			// Should not update pose for incomplete action
			expect(setSpy).not.toHaveBeenCalled()
		})

		it('should set fairy pose to idle for complete actions', () => {
			const action = createAgentAction({
				_type: 'review',
				intent: 'test',
				x: 100,
				y: 100,
				w: 200,
				h: 200,
				complete: true,
				time: 0,
			})

			// set the pose to something other than idle
			agent.updateEntity((f) => (f ? { ...f, pose: 'thinking' } : f))

			const helpers = new AgentHelpers(agent)
			const initialPose = agent.getEntity().pose

			reviewUtil.applyAction(action, helpers)

			// Verify the fairy's pose actually changed to idle
			const newPose = agent.getEntity().pose
			expect(newPose).toBe('idle')
			expect(newPose).not.toBe(initialPose)
		})

		it('should include intent in review message', () => {
			const action = createAgentAction({
				_type: 'review',
				intent: 'Verify the shapes are aligned correctly',
				x: 100,
				y: 100,
				w: 200,
				h: 200,
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const scheduleSpy = vi.spyOn(agent, 'schedule')

			reviewUtil.applyAction(action, helpers)

			const scheduleCall = scheduleSpy.mock.calls[0][0]
			if (
				typeof scheduleCall === 'object' &&
				scheduleCall !== null &&
				!Array.isArray(scheduleCall) &&
				'agentMessages' in scheduleCall &&
				Array.isArray(scheduleCall.agentMessages)
			) {
				expect(scheduleCall.agentMessages[0]).toContain('Verify the shapes are aligned correctly')
			}
		})

		it('should pass bounds through removeOffsetFromBox helper', () => {
			const action = createAgentAction({
				_type: 'review',
				intent: 'test',
				x: 500,
				y: 600,
				w: 300,
				h: 400,
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const removeOffsetSpy = vi.spyOn(helpers, 'removeOffsetFromBox').mockReturnValue({
				x: 450,
				y: 550,
				w: 300,
				h: 400,
			})
			const scheduleSpy = vi.spyOn(agent, 'schedule')

			reviewUtil.applyAction(action, helpers)

			expect(removeOffsetSpy).toHaveBeenCalledWith({
				x: 500,
				y: 600,
				w: 300,
				h: 400,
			})

			const scheduleCall = scheduleSpy.mock.calls[0][0]
			if (
				typeof scheduleCall === 'object' &&
				scheduleCall !== null &&
				!Array.isArray(scheduleCall) &&
				'bounds' in scheduleCall &&
				scheduleCall.bounds
			) {
				expect(scheduleCall.bounds).toEqual({
					x: 450,
					y: 550,
					w: 300,
					h: 400,
				})
			}
		})

		it('should handle zero-sized bounds', () => {
			const action = createAgentAction({
				_type: 'review',
				intent: 'test',
				x: 100,
				y: 100,
				w: 0,
				h: 0,
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const scheduleSpy = vi.spyOn(agent, 'schedule')

			reviewUtil.applyAction(action, helpers)

			expect(scheduleSpy).toHaveBeenCalled()
			const scheduleCall = scheduleSpy.mock.calls[0][0]
			if (
				typeof scheduleCall === 'object' &&
				scheduleCall !== null &&
				!Array.isArray(scheduleCall) &&
				'bounds' in scheduleCall &&
				scheduleCall.bounds
			) {
				expect(scheduleCall.bounds.w).toBe(0)
				expect(scheduleCall.bounds.h).toBe(0)
			}
		})

		it('should handle negative coordinates', () => {
			const action = createAgentAction({
				_type: 'review',
				intent: 'test',
				x: -100,
				y: -200,
				w: 150,
				h: 250,
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const removeOffsetSpy = vi.spyOn(helpers, 'removeOffsetFromBox')

			reviewUtil.applyAction(action, helpers)

			expect(removeOffsetSpy).toHaveBeenCalledWith({
				x: -100,
				y: -200,
				w: 150,
				h: 250,
			})
		})

		it('should include all review instructions in message', () => {
			const action = createAgentAction({
				_type: 'review',
				intent: 'test intent',
				x: 100,
				y: 100,
				w: 200,
				h: 200,
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const scheduleSpy = vi.spyOn(agent, 'schedule')

			reviewUtil.applyAction(action, helpers)

			const scheduleCall = scheduleSpy.mock.calls[0][0]
			if (
				typeof scheduleCall === 'object' &&
				scheduleCall !== null &&
				!Array.isArray(scheduleCall) &&
				'agentMessages' in scheduleCall &&
				Array.isArray(scheduleCall.agentMessages)
			) {
				const message = scheduleCall.agentMessages[0]
				expect(message).toContain('test intent')
				expect(message).toContain('Is there still more work to do?')
				expect(message).toContain('Is the task supposed to be complete?')
				expect(message).toContain('Did you do what the user asked for?')
				expect(message).toContain('Did the plan work?')
				expect(message).toContain('pay close attention to the image')
				expect(message).toContain('Make sure to reference your previous actions')
			}
		})
	})
})
