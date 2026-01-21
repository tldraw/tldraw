import {
	FairyModeDefinition,
	FairyTask,
	FairyWaitCondition,
	TaskCompletedEvent,
	toAgentId,
	toTaskId,
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
		it('should notify agents waiting for an event', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agent = agents[0]!

			// Create a test task
			const testTask: FairyTask = {
				id: toTaskId('test-task-1'),
				title: 'Test Task',
				text: 'Test description',
				status: 'done',
				projectId: null,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			}

			// Mock the agent's wait methods
			const waitCondition: FairyWaitCondition<TaskCompletedEvent> = {
				eventType: 'task-completed',
				matcher: (event) => event.task.id === toTaskId('test-task-1'),
				id: 'test-wait-condition',
			}

			const getWaitingForSpy = vi
				.spyOn(agent.waits, 'getWaitingFor')
				.mockReturnValue([waitCondition])
			const setWaitingForSpy = vi.spyOn(agent.waits, 'setWaitingFor')
			const notifySpy = vi
				.spyOn(agent.waits, 'notifyWaitConditionFulfilled')
				.mockResolvedValue(undefined)

			manager.notifyWaitingAgents({
				event: { type: 'task-completed', task: testTask },
				getAgentFacingMessage: () => 'Test message',
				getUserFacingMessage: () => 'User message',
			})

			expect(getWaitingForSpy).toHaveBeenCalled()
			expect(setWaitingForSpy).toHaveBeenCalledWith([])
			expect(notifySpy).toHaveBeenCalledWith({
				agentMessages: ['Test message'],
				userMessages: ['User message'],
				bounds: undefined,
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
				id: toTaskId('test-task-2'),
				title: 'Test Task',
				text: 'Test description',
				status: 'done',
				projectId: null,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			}

			const waitCondition: FairyWaitCondition<TaskCompletedEvent> = {
				eventType: 'task-completed',
				matcher: (event) => event.task.id === toTaskId('test-task-1'),
				id: 'test-wait-condition',
			}

			vi.spyOn(agent.waits, 'getWaitingFor').mockReturnValue([waitCondition])
			const setWaitingForSpy = vi.spyOn(agent.waits, 'setWaitingFor')
			const notifySpy = vi.spyOn(agent.waits, 'notifyWaitConditionFulfilled')

			manager.notifyWaitingAgents({
				event: { type: 'task-completed', task: testTask },
				getAgentFacingMessage: () => 'Test message',
			})

			expect(setWaitingForSpy).not.toHaveBeenCalled()
			expect(notifySpy).not.toHaveBeenCalled()
		})

		it('should pass bounds when getBounds is provided', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agent = agents[0]!

			const testTask: FairyTask = {
				id: toTaskId('test-task-1'),
				title: 'Test Task',
				text: 'Test description',
				status: 'done',
				projectId: null,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			}

			const waitCondition: FairyWaitCondition<TaskCompletedEvent> = {
				eventType: 'task-completed',
				matcher: (event) => event.task.id === toTaskId('test-task-1'),
				id: 'test-wait-condition',
			}

			const testBounds = { x: 10, y: 20, w: 100, h: 50 }

			vi.spyOn(agent.waits, 'getWaitingFor').mockReturnValue([waitCondition])
			const notifySpy = vi
				.spyOn(agent.waits, 'notifyWaitConditionFulfilled')
				.mockResolvedValue(undefined)

			manager.notifyWaitingAgents({
				event: { type: 'task-completed', task: testTask },
				getAgentFacingMessage: () => 'Test message',
				getBounds: () => testBounds,
			})

			expect(notifySpy).toHaveBeenCalledWith({
				agentMessages: ['Test message'],
				userMessages: undefined,
				bounds: testBounds,
			})
		})
	})

	describe('notifyTaskCompleted', () => {
		it('should notify agents waiting for task completion', () => {
			const task: FairyTask = {
				id: toTaskId('task-1'),
				title: 'Test Task',
				text: 'Test description',
				status: 'done',
				projectId: null,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			}

			const notifySpy = vi.spyOn(manager, 'notifyWaitingAgents')

			manager.notifyTaskCompleted(task)

			expect(notifySpy).toHaveBeenCalledWith(
				expect.objectContaining({
					event: { type: 'task-completed', task },
					getAgentFacingMessage: expect.any(Function),
				})
			)
		})

		it('should include bounds when task has bounds', () => {
			const task: FairyTask = {
				id: toTaskId('task-1'),
				title: 'Test Task',
				text: 'Test description',
				status: 'done',
				projectId: null,
				assignedTo: null,
				x: 10,
				y: 20,
				w: 100,
				h: 50,
			}

			const notifySpy = vi.spyOn(manager, 'notifyWaitingAgents')

			manager.notifyTaskCompleted(task)

			expect(notifySpy).toHaveBeenCalledWith(
				expect.objectContaining({
					event: { type: 'task-completed', task },
					getAgentFacingMessage: expect.any(Function),
					getBounds: expect.any(Function),
				})
			)

			// Verify bounds are correct - getBounds function returns the bounds
			const callArgs = notifySpy.mock.calls[0]![0]
			const bounds = callArgs.getBounds?.(toAgentId('test-agent'), {
				eventType: 'task-completed',
				matcher: () => true,
				id: 'test',
			})
			expect(bounds).toEqual({ x: 10, y: 20, w: 100, h: 50 })
		})
	})

	describe('createTaskWaitCondition', () => {
		it('should create a wait condition for a specific task', () => {
			const testTaskId = toTaskId('task-1')
			const condition = manager.createTaskWaitCondition(testTaskId)

			expect(condition).toEqual({
				eventType: 'task-completed',
				matcher: expect.any(Function),
				id: `task-completed:${testTaskId}`,
			})

			// Test the matcher function
			const matchingTask: FairyTask = {
				id: testTaskId,
				title: 'Test',
				text: 'Test',
				status: 'done',
				projectId: null,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			}

			const nonMatchingTask: FairyTask = {
				id: toTaskId('other-task'),
				title: 'Test',
				text: 'Test',
				status: 'done',
				projectId: null,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			}

			expect(condition.matcher({ type: 'task-completed', task: matchingTask })).toBe(true)
			expect(condition.matcher({ type: 'task-completed', task: nonMatchingTask })).toBe(false)
		})
	})

	describe('notifyAgentModeTransition', () => {
		it('should notify agents waiting for mode transition', () => {
			const testAgentId = toAgentId('agent-1')
			const mode: FairyModeDefinition['type'] = 'orchestrating-active'

			const notifySpy = vi.spyOn(manager, 'notifyWaitingAgents')

			manager.notifyAgentModeTransition(testAgentId, mode)

			expect(notifySpy).toHaveBeenCalledWith({
				event: { type: 'agent-mode-transition', agentId: testAgentId, mode },
				getAgentFacingMessage: expect.any(Function),
			})
		})
	})

	describe('createAgentModeTransitionWaitCondition', () => {
		it('should create a wait condition for mode transition', () => {
			const testAgentId = toAgentId('agent-1')
			const mode: FairyModeDefinition['type'] = 'orchestrating-active'
			const condition = manager.createAgentModeTransitionWaitCondition(testAgentId, mode)

			expect(condition).toEqual({
				eventType: 'agent-mode-transition',
				matcher: expect.any(Function),
				id: `agent-mode-transition:${testAgentId}:${mode}`,
			})

			// Test the matcher function
			expect(
				// @ts-expect-error - mock return value is not typed
				condition.matcher({ agentId: toAgentId('agent-1'), mode: 'orchestrating-active' })
			).toBe(true)
			expect(
				// @ts-expect-error - mock return value is not typed
				condition.matcher({ agentId: toAgentId('agent-2'), mode: 'orchestrating-active' })
			).toBe(false)
			// @ts-expect-error - mock return value is not typed
			expect(condition.matcher({ agentId: toAgentId('agent-1'), mode: 'idling' })).toBe(false)
		})
	})

	describe('reset', () => {
		it('should reset without errors', () => {
			expect(() => manager.reset()).not.toThrow()
		})
	})
})
