import { PersistedFairyState } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FairyApp } from '../../FairyApp'
import { FairyAppPersistenceManager } from '../FairyAppPersistenceManager'
import { createTestEditor, createTestFairyApp } from './fairy-app-managers-test-shared'

describe('FairyAppPersistenceManager', () => {
	let editor: Editor
	let fairyApp: FairyApp
	let manager: FairyAppPersistenceManager

	beforeEach(() => {
		editor = createTestEditor()
		fairyApp = createTestFairyApp(editor)
		manager = fairyApp.persistence
	})

	afterEach(() => {
		editor.dispose()
		fairyApp.dispose()
	})

	describe('getIsLoadingState', () => {
		it('should return false initially', () => {
			expect(manager.getIsLoadingState()).toBe(false)
		})

		it('should return true while loading state', () => {
			const fairyState: PersistedFairyState = {
				agents: {},
				fairyTaskList: [],
				projects: [],
			}

			// Start loading
			manager.loadState(fairyState)

			// Should be true immediately after calling loadState
			expect(manager.getIsLoadingState()).toBe(true)
		})
	})

	describe('loadState', () => {
		it('should load fairy state correctly', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			// Create an agent first
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agentId = agents[0]!.id

			const fairyState: PersistedFairyState = {
				agents: {
					[agentId]: {
						fairyEntity: {
							position: { x: 0, y: 0 },
							flipX: false,
							isSelected: false,
							pose: 'idle',
							gesture: null,
							currentPageId: editor.getCurrentPageId(),
						},
						chatHistory: [],
						chatOrigin: { x: 0, y: 0 },
						personalTodoList: [],
						waitingFor: [],
					},
				},
				fairyTaskList: [
					{
						id: 'task-1',
						title: 'Test Task',
						text: 'Test description',
						status: 'todo',
						projectId: null,
						assignedTo: null,
					},
				],
				projects: [
					{
						id: 'project-1',
						title: 'Test Project',
						description: 'Test project description',
						color: 'blue',
						members: [],
						plan: 'Test plan',
					},
				],
			}

			manager.loadState(fairyState)

			// Check that tasks and projects were loaded
			expect(fairyApp.tasks.getTasks()).toHaveLength(1)
			expect(fairyApp.projects.getProjects()).toHaveLength(1)
		})

		it('should not load fairy task list multiple times', () => {
			const fairyState: PersistedFairyState = {
				agents: {},
				fairyTaskList: [
					{
						id: 'task-1',
						title: 'Test Task',
						text: 'Test description',
						status: 'todo',
						projectId: null,
						assignedTo: null,
					},
				],
				projects: [],
			}

			manager.loadState(fairyState)
			expect(fairyApp.tasks.getTasks()).toHaveLength(1)

			// Try to load again with different tasks
			const fairyState2: PersistedFairyState = {
				agents: {},
				fairyTaskList: [
					{
						id: 'task-2',
						title: 'Another Task',
						text: 'Another description',
						status: 'todo',
						projectId: null,
						assignedTo: null,
					},
				],
				projects: [],
			}

			manager.loadState(fairyState2)

			// Should still have only the first task
			expect(fairyApp.tasks.getTasks()).toHaveLength(1)
			expect(fairyApp.tasks.getTasks()[0]!.id).toBe('task-1')
		})

		it('should handle errors during state loading', () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			// Create an agent that will throw an error
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			vi.spyOn(agents[0]!, 'loadState').mockImplementation(() => {
				throw new Error('Load error')
			})

			const fairyState: PersistedFairyState = {
				agents: {
					[agents[0]!.id]: {
						fairyEntity: {
							position: { x: 0, y: 0 },
							flipX: false,
							isSelected: false,
							pose: 'idle',
							gesture: null,
							currentPageId: editor.getCurrentPageId(),
						},
						chatHistory: [],
						chatOrigin: { x: 0, y: 0 },
						personalTodoList: [],
						waitingFor: [],
					},
				},
				fairyTaskList: [],
				projects: [],
			}

			manager.loadState(fairyState)

			expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load fairy state:', expect.any(Error))
			expect(manager.getIsLoadingState()).toBe(false)

			consoleErrorSpy.mockRestore()
		})
	})

	describe('serializeState', () => {
		it('should serialize the current fairy state', () => {
			// Add some tasks and projects
			fairyApp.tasks.createTask({
				id: 'task-1',
				title: 'Test Task',
				text: 'Test description',
				status: 'todo',
				projectId: null,
				assignedTo: null,
			})

			fairyApp.projects.addProject({
				id: 'project-1',
				title: 'Test Project',
				description: 'Test project description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
			})

			const serialized = manager.serializeState()

			expect(serialized).toMatchObject({
				agents: {},
				fairyTaskList: [
					expect.objectContaining({
						id: 'task-1',
						title: 'Test Task',
					}),
				],
				projects: [
					expect.objectContaining({
						id: 'project-1',
						title: 'Test Project',
					}),
				],
			})
		})

		it('should strip diff field from chat history', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agent = agents[0]!

			// Mock the agent's serializeState to return chat history with diff
			vi.spyOn(agent, 'serializeState').mockReturnValue({
				fairyEntity: {
					position: { x: 0, y: 0 },
					flipX: false,
					isSelected: false,
					pose: 'idle',
					gesture: null,
					currentPageId: editor.getCurrentPageId(),
				},
				chatHistory: [
					{
						id: 'item-1',
						type: 'action',
						actionType: 'think',
						agentFacingMessage: 'Thinking',
						userFacingMessage: 'Thinking',
						diff: 'some-diff-data',
					} as any,
				],
				chatOrigin: { x: 0, y: 0 },
				personalTodoList: [],
				waitingFor: [],
			})

			const serialized = manager.serializeState()

			expect(serialized.agents[agent.id]!.chatHistory[0]).not.toHaveProperty('diff')
		})
	})

	describe('startAutoSave', () => {
		it('should set up auto-save watchers', () => {
			const fileId = 'test-file-id'
			const updateSpy = vi.spyOn(fairyApp.tldrawApp, 'onFairyStateUpdate')

			manager.startAutoSave(fileId)

			// Make a change that should trigger auto-save
			fairyApp.tasks.createTask({
				id: 'task-1',
				title: 'Test Task',
				text: 'Test description',
				status: 'todo',
				projectId: null,
				assignedTo: null,
			})

			// Wait for throttled update
			setTimeout(() => {
				expect(updateSpy).toHaveBeenCalled()
			}, 2100)
		})

		it('should not save while loading state', async () => {
			const fileId = 'test-file-id'
			const updateSpy = vi.spyOn(fairyApp.tldrawApp, 'onFairyStateUpdate')

			const fairyState: PersistedFairyState = {
				agents: {},
				fairyTaskList: [],
				projects: [],
			}

			// Load state first (sets isLoadingState = true)
			manager.loadState(fairyState)

			// Start auto-save after loading begins
			manager.startAutoSave(fileId)

			// Make a change during loading
			fairyApp.tasks.createTask({
				id: 'task-1',
				title: 'Test Task',
				text: 'Test description',
				status: 'todo',
				projectId: null,
				assignedTo: null,
			})

			// Wait a bit for any potential throttled saves
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Should not save because we're loading
			expect(updateSpy).not.toHaveBeenCalled()
		})
	})

	describe('stopAutoSave', () => {
		it('should clean up auto-save watchers', () => {
			const fileId = 'test-file-id'
			const updateSpy = vi.spyOn(fairyApp.tldrawApp, 'onFairyStateUpdate')

			manager.startAutoSave(fileId)
			manager.stopAutoSave()

			// Make a change after stopping
			fairyApp.tasks.createTask({
				id: 'task-1',
				title: 'Test Task',
				text: 'Test description',
				status: 'todo',
				projectId: null,
				assignedTo: null,
			})

			// Should not save after stopping
			setTimeout(() => {
				expect(updateSpy).not.toHaveBeenCalled()
			}, 2100)
		})
	})

	describe('resetLoadingFlags', () => {
		it('should reset loading flags', () => {
			const fairyState: PersistedFairyState = {
				agents: {},
				fairyTaskList: [
					{
						id: 'task-1',
						title: 'Test Task',
						text: 'Test description',
						status: 'todo',
						projectId: null,
						assignedTo: null,
					},
				],
				projects: [],
			}

			manager.loadState(fairyState)
			expect(fairyApp.tasks.getTasks()).toHaveLength(1)

			manager.resetLoadingFlags()

			// Now should be able to load again
			manager.loadState(fairyState)
		})
	})

	describe('reset', () => {
		it('should reset the manager', () => {
			const fileId = 'test-file-id'
			manager.startAutoSave(fileId)

			const fairyState: PersistedFairyState = {
				agents: {},
				fairyTaskList: [],
				projects: [],
			}
			manager.loadState(fairyState)

			manager.reset()

			expect(manager.getIsLoadingState()).toBe(false)
		})
	})

	describe('dispose', () => {
		it('should stop auto-save when disposed', () => {
			const fileId = 'test-file-id'
			const updateSpy = vi.spyOn(fairyApp.tldrawApp, 'onFairyStateUpdate')

			manager.startAutoSave(fileId)
			manager.dispose()

			// Make a change after disposing
			fairyApp.tasks.createTask({
				id: 'task-1',
				title: 'Test Task',
				text: 'Test description',
				status: 'todo',
				projectId: null,
				assignedTo: null,
			})

			// Should not save after disposing
			setTimeout(() => {
				expect(updateSpy).not.toHaveBeenCalled()
			}, 2100)
		})
	})
})
