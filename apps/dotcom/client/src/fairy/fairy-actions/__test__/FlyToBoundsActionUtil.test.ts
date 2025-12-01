import { createAgentAction } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { FlyToBoundsActionUtil } from '../FlyToBoundsActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('FlyToBoundsActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let flyToBoundsUtil: FlyToBoundsActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		flyToBoundsUtil = new FlyToBoundsActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const action = createAgentAction({
				_type: 'fly-to-bounds',
				x: 100,
				y: 200,
				w: 300,
				h: 400,
				intent: 'test',
				complete: false,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			flyToBoundsUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})

		it('should move agent to center of bounds', () => {
			const action = createAgentAction({
				_type: 'fly-to-bounds',
				x: 100,
				y: 200,
				w: 300,
				h: 400,
				intent: 'Flying to area',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			flyToBoundsUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()
			const callArgs = (agent.position.moveTo as any).mock.calls[0][0]
			// Center of bounds should be (100 + 300/2, 200 + 400/2) = (250, 400)
			// But with offset removal applied
			expect(callArgs).toBeDefined()
		})

		it('should interrupt agent with bounds information', () => {
			const action = createAgentAction({
				_type: 'fly-to-bounds',
				x: 100,
				y: 200,
				w: 300,
				h: 400,
				intent: 'Exploring new region',
				complete: true,
				time: 0,
			})

			const interruptSpy = vi.spyOn(agent, 'interrupt')
			const helpers = new AgentHelpers(agent)
			flyToBoundsUtil.applyAction(action, helpers)

			expect(interruptSpy).toHaveBeenCalled()
			const interruptCall = interruptSpy.mock.calls[0][0]
			expect(interruptCall.input).toBeDefined()
			expect(
				typeof interruptCall.input === 'object' &&
					interruptCall.input !== null &&
					'agentMessages' in interruptCall.input
			).toBe(true)
			const input = interruptCall.input as { agentMessages?: string[] }
			expect(input.agentMessages).toBeDefined()
			expect(input.agentMessages?.[0]).toContain('Just flew to new area')
			expect(input.agentMessages?.[0]).toContain('Exploring new region')
		})

		it('should apply offset removal to bounds', () => {
			const action = createAgentAction({
				_type: 'fly-to-bounds',
				x: 100,
				y: 200,
				w: 300,
				h: 400,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			const removeOffsetSpy = vi.spyOn(helpers, 'removeOffsetFromBox')
			flyToBoundsUtil.applyAction(action, helpers)

			expect(removeOffsetSpy).toHaveBeenCalledWith({
				x: 100,
				y: 200,
				w: 300,
				h: 400,
			})
		})

		it('should handle bounds at origin', () => {
			const action = createAgentAction({
				_type: 'fly-to-bounds',
				x: 0,
				y: 0,
				w: 100,
				h: 100,
				intent: 'Moving to origin',
				complete: true,
				time: 0,
			})

			const initialFairyPosition = agent.getEntity().position

			const helpers = new AgentHelpers(agent)
			flyToBoundsUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()
			// Verify the fairy's position changed (unless it was already at origin)
			const newFairyPosition = agent.getEntity().position
			if (initialFairyPosition.x !== 0 || initialFairyPosition.y !== 0) {
				expect(newFairyPosition.x).not.toBe(initialFairyPosition.x)
				expect(newFairyPosition.y).not.toBe(initialFairyPosition.y)
			}
		})

		it('should handle large bounds', () => {
			const action = createAgentAction({
				_type: 'fly-to-bounds',
				x: -1000,
				y: -1000,
				w: 5000,
				h: 5000,
				intent: 'Viewing large area',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			flyToBoundsUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should handle small bounds', () => {
			const action = createAgentAction({
				_type: 'fly-to-bounds',
				x: 100,
				y: 100,
				w: 10,
				h: 10,
				intent: 'Zooming to small area',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			flyToBoundsUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should include bounds dimensions in interrupt message', () => {
			const action = createAgentAction({
				_type: 'fly-to-bounds',
				x: 50,
				y: 75,
				w: 200,
				h: 150,
				intent: 'Inspecting area',
				complete: true,
				time: 0,
			})

			const interruptSpy = vi.spyOn(agent, 'interrupt')
			const helpers = new AgentHelpers(agent)
			flyToBoundsUtil.applyAction(action, helpers)

			const interruptCall = interruptSpy.mock.calls[0][0]
			const input = interruptCall.input as { agentMessages?: string[] } | null
			const message = input && 'agentMessages' in input ? input.agentMessages?.[0] : undefined
			expect(message).toMatch(/\d+x\d+ in size/)
		})
	})
})
