import {
	FairyModeDefinition,
	FairyTask,
	FairyWaitCondition,
	TaskCompletedEvent,
} from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FairyApp } from '../../FairyApp'
import { FairyAppWaitManager } from '../FairyAppWaitManager'
import { createTestEditor, createTestFairyApp } from './fairy-app-managers-test-shared'

describe('FairyAppWaitManager', () => {
	let editor: Editor
	let fairyApp: FairyApp
	let manager: FairyAppWaitManager

	beforeEach(() => {
		editor = createTestEditor()
		fairyApp = createTestFairyApp(editor)
		manager = fairyApp.waits
	})

	afterEach(() => {
		editor.dispose()
		fairyApp.dispose()
	})

	describe('notifyWaitingAgents', () => {
		it('should notify agents waiting for an event', async () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agent = agents[0]!

			// Create a test task
			const testTask: FairyTask = {
				id: 'test-task-1',
				title: 'Test Task',
				text: 'Test description',
				status: 'done',
				projectId: null,
				assignedTo: null,
			}

			// Mock the agent's wait methods
			const waitCondition: FairyWaitCondition<TaskCompletedEvent> = {
				eventType: 'task-completed',
				matcher: (event) => event.task.id === 'test-task-1',
				id: 'test-wait-condition',
			}

			const getWaitingForSpy = vi
				.spyOn(agent.waits, 'getWaitingFor')
				.mockReturnValue([waitCondition])
			const waitForAllSpy = vi.spyOn(agent.waits, 'waitForAll')
			const notifySpy = vi
				.spyOn(agent.waits, 'notifyWaitConditionFulfilled')
				.mockResolvedValue(undefined)

			await manager.notifyWaitingAgents({
				event: { type: 'task-completed', task: testTask },
				getAgentFacingMessage: () => 'Test message',
				getUserFacingMessage: () => 'User message',
			})

			expect(getWaitingForSpy).toHaveBeenCalled()
			expect(waitForAllSpy).toHaveBeenCalledWith([])
			expect(notifySpy).toHaveBeenCalledWith({
				agentFacingMessage: 'Test message',
				userFacingMessage: 'User message',
			})
		})

		it('should not notify agents when event does not match', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agent = agents[0]!

			const testTask: FairyTask = {
				id: 'test-task-2',
				title: 'Test Task',
				text: 'Test description',
				status: 'done',
				projectId: null,
				assignedTo: null,
			}

			const waitCondition: FairyWaitCondition<TaskCompletedEvent> = {
				eventType: 'task-completed',
				matcher: (event) => event.task.id === 'test-task-1',
				id: 'test-wait-condition',
			}

			vi.spyOn(agent.waits, 'getWaitingFor').mockReturnValue([waitCondition])
			const notifySpy = vi.spyOn(agent.waits, 'notifyWaitConditionFulfilled')

			manager.notifyWaitingAgents({
				event: { type: 'task-completed', task: testTask },
				getAgentFacingMessage: () => 'Test message',
			})

			expect(notifySpy).not.toHaveBeenCalled()
		})

		it('should handle errors during notification gracefully', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agent = agents[0]!

			const testTask: FairyTask = {
				id: 'test-task-1',
				title: 'Test Task',
				text: 'Test description',
				status: 'done',
				projectId: null,
				assignedTo: null,
			}

			const waitCondition: FairyWaitCondition<TaskCompletedEvent> = {
				eventType: 'task-completed',
				matcher: () => true,
				id: 'test-wait-condition',
			}

			vi.spyOn(agent.waits, 'getWaitingFor').mockReturnValue([waitCondition])
			vi.spyOn(agent.waits, 'waitForAll')
			vi.spyOn(agent.waits, 'notifyWaitConditionFulfilled').mockRejectedValue(
				new Error('Notification failed')
			)

			await manager.notifyWaitingAgents({
				event: { type: 'task-completed', task: testTask },
				getAgentFacingMessage: () => 'Test message',
			})

			// Wait for async error handling
			await new Promise((resolve) => setTimeout(resolve, 10))

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error notifying wait condition fulfilled:',
				expect.any(Error)
			)

			consoleErrorSpy.mockRestore()
		})
	})

	describe('notifyTaskCompleted', () => {
		it('should notify agents waiting for task completion', () => {
			const task: FairyTask = {
				id: 'task-1',
				title: 'Test Task',
				text: 'Test description',
				status: 'done',
				projectId: null,
				assignedTo: null,
			}

			const notifySpy = vi.spyOn(manager, 'notifyWaitingAgents')

			manager.notifyTaskCompleted(task)

			expect(notifySpy).toHaveBeenCalledWith({
				event: { type: 'task-completed', task },
				getAgentFacingMessage: expect.any(Function),
			})
		})
	})

	describe('createTaskWaitCondition', () => {
		it('should create a wait condition for a specific task', () => {
			const taskId = 'task-1'
			const condition = manager.createTaskWaitCondition(taskId)

			expect(condition).toEqual({
				eventType: 'task-completed',
				matcher: expect.any(Function),
				id: `task-completed:${taskId}`,
			})

			// Test the matcher function
			const matchingTask: FairyTask = {
				id: taskId,
				title: 'Test',
				text: 'Test',
				status: 'done',
				projectId: null,
				assignedTo: null,
			}

			const nonMatchingTask: FairyTask = {
				id: 'other-task',
				title: 'Test',
				text: 'Test',
				status: 'done',
				projectId: null,
				assignedTo: null,
			}

			expect(condition.matcher({ type: 'task-completed', task: matchingTask })).toBe(true)
			expect(condition.matcher({ type: 'task-completed', task: nonMatchingTask })).toBe(false)
		})
	})

	describe('notifyAgentModeTransition', () => {
		it('should notify agents waiting for mode transition', () => {
			const agentId = 'agent-1'
			const mode: FairyModeDefinition['type'] = 'orchestrating-active'

			const notifySpy = vi.spyOn(manager, 'notifyWaitingAgents')

			manager.notifyAgentModeTransition(agentId, mode)

			expect(notifySpy).toHaveBeenCalledWith({
				event: { type: 'agent-mode-transition', agentId, mode },
				getAgentFacingMessage: expect.any(Function),
			})
		})
	})

	describe('createAgentModeTransitionWaitCondition', () => {
		it('should create a wait condition for mode transition', () => {
			const agentId = 'agent-1'
			const mode: FairyModeDefinition['type'] = 'orchestrating-active'
			const condition = manager.createAgentModeTransitionWaitCondition(agentId, mode)

			expect(condition).toEqual({
				eventType: 'agent-mode-transition',
				matcher: expect.any(Function),
				id: `agent-mode-transition:${agentId}:${mode}`,
			})

			// Test the matcher function
			expect(
				// @ts-expect-error - mock return value is not typed
				condition.matcher({ agentId: 'agent-1', mode: 'orchestrating-active' })
			).toBe(true)
			expect(
				// @ts-expect-error - mock return value is not typed
				condition.matcher({ agentId: 'agent-2', mode: 'orchestrating-active' })
			).toBe(false)
			// @ts-expect-error - mock return value is not typed
			expect(condition.matcher({ agentId: 'agent-1', mode: 'idling' })).toBe(false)
		})
	})

	describe('reset', () => {
		it('should reset without errors', () => {
			expect(() => manager.reset()).not.toThrow()
		})
	})
})
