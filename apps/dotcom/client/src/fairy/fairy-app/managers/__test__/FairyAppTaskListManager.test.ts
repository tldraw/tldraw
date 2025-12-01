import { FairyTask } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FairyApp } from '../../FairyApp'
import { FairyAppTaskListManager } from '../FairyAppTaskListManager'
import { createTestEditor, createTestFairyApp } from './fairy-app-managers-test-shared'

describe('FairyAppTaskListManager', () => {
	let editor: Editor
	let fairyApp: FairyApp
	let manager: FairyAppTaskListManager

	beforeEach(() => {
		editor = createTestEditor()
		fairyApp = createTestFairyApp(editor)
		manager = fairyApp.tasks
	})

	afterEach(() => {
		editor.dispose()
		fairyApp.dispose()
	})

	describe('getTasks', () => {
		it('should return an empty array initially', () => {
			expect(manager.getTasks()).toEqual([])
		})
	})

	describe('setTasks', () => {
		it('should set tasks', () => {
			const tasks: FairyTask[] = [
				{
					id: 'task-1',
					title: 'Test Task',
					text: 'Test description',
					status: 'todo',
					projectId: null,
					assignedTo: null,
				},
			]

			manager.setTasks(tasks)

			expect(manager.getTasks()).toEqual(tasks)
		})
	})

	describe('createTask', () => {
		it('should create a new task with defaults', () => {
			manager.createTask({ id: 'task-1' })

			const tasks = manager.getTasks()
			expect(tasks).toHaveLength(1)
			expect(tasks[0]).toMatchObject({
				id: 'task-1',
				title: '',
				text: '',
				status: 'todo',
				projectId: null,
				assignedTo: null,
			})
		})

		it('should create a task with custom properties', () => {
			manager.createTask({
				id: 'task-1',
				title: 'Test Task',
				text: 'Test description',
				status: 'in-progress',
				projectId: 'project-1',
				assignedTo: 'agent-1',
			})

			const task = manager.getTaskById('task-1')
			expect(task).toMatchObject({
				id: 'task-1',
				title: 'Test Task',
				text: 'Test description',
				status: 'in-progress',
				projectId: 'project-1',
				assignedTo: 'agent-1',
			})
		})
	})

	describe('deleteTask', () => {
		it('should delete a task by ID', () => {
			manager.createTask({ id: 'task-1', title: 'Task 1' })
			expect(manager.getTasks()).toHaveLength(1)

			manager.deleteTask('task-1')

			expect(manager.getTasks()).toHaveLength(0)
		})
	})

	describe('getTaskById', () => {
		it('should return a task by ID', () => {
			manager.createTask({ id: 'task-1', title: 'Test Task' })

			const task = manager.getTaskById('task-1')

			expect(task).toBeDefined()
			expect(task!.id).toBe('task-1')
			expect(task!.title).toBe('Test Task')
		})

		it('should return undefined when task not found', () => {
			expect(manager.getTaskById('non-existent')).toBeUndefined()
		})
	})

	describe('setTaskStatus', () => {
		it('should set a task status', () => {
			manager.createTask({ id: 'task-1', title: 'Test Task' })

			manager.setTaskStatus('task-1', 'in-progress')

			expect(manager.getTaskById('task-1')!.status).toBe('in-progress')
		})

		it('should not affect other tasks', () => {
			manager.createTask({ id: 'task-1', title: 'Task 1' })
			manager.createTask({ id: 'task-2', title: 'Task 2' })

			manager.setTaskStatus('task-1', 'done')

			expect(manager.getTaskById('task-1')!.status).toBe('done')
			expect(manager.getTaskById('task-2')!.status).toBe('todo')
		})
	})

	describe('setTaskStatusAndNotify', () => {
		it('should set task status and notify waiting agents when done', () => {
			manager.createTask({ id: 'task-1', title: 'Test Task' })

			const notifyTaskCompletedSpy = vi.spyOn(fairyApp.waits, 'notifyTaskCompleted')

			manager.setTaskStatusAndNotify('task-1', 'done')

			expect(manager.getTaskById('task-1')!.status).toBe('done')
			expect(notifyTaskCompletedSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }))
		})

		it('should not notify when status is not done', () => {
			manager.createTask({ id: 'task-1', title: 'Test Task' })

			const notifyTaskCompletedSpy = vi.spyOn(fairyApp.waits, 'notifyTaskCompleted')

			manager.setTaskStatusAndNotify('task-1', 'in-progress')

			expect(notifyTaskCompletedSpy).not.toHaveBeenCalled()
		})
	})

	describe('getTasksByProjectId', () => {
		it('should return tasks for a specific project', () => {
			manager.createTask({ id: 'task-1', title: 'Task 1', projectId: 'project-1' })
			manager.createTask({ id: 'task-2', title: 'Task 2', projectId: 'project-1' })
			manager.createTask({ id: 'task-3', title: 'Task 3', projectId: 'project-2' })

			const projectTasks = manager.getTasksByProjectId('project-1')

			expect(projectTasks).toHaveLength(2)
			expect(projectTasks.map((t) => t.id)).toEqual(['task-1', 'task-2'])
		})

		it('should return empty array when no tasks for project', () => {
			expect(manager.getTasksByProjectId('non-existent')).toEqual([])
		})
	})

	describe('getTasksByAgentId', () => {
		it('should return tasks assigned to a specific agent', () => {
			manager.createTask({ id: 'task-1', title: 'Task 1', assignedTo: 'agent-1' })
			manager.createTask({ id: 'task-2', title: 'Task 2', assignedTo: 'agent-1' })
			manager.createTask({ id: 'task-3', title: 'Task 3', assignedTo: 'agent-2' })

			const agentTasks = manager.getTasksByAgentId('agent-1')

			expect(agentTasks).toHaveLength(2)
			expect(agentTasks.map((t) => t.id)).toEqual(['task-1', 'task-2'])
		})

		it('should return empty array when no tasks for agent', () => {
			expect(manager.getTasksByAgentId('non-existent')).toEqual([])
		})
	})

	describe('assignFairyToTask', () => {
		it('should assign a fairy to a task', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agentId = agents[0]!.id

			manager.createTask({ id: 'task-1', title: 'Test Task' })

			manager.assignFairyToTask('task-1', agentId, agents)

			expect(manager.getTaskById('task-1')!.assignedTo).toBe(agentId)
		})

		it('should unassign a fairy when empty string provided', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agentId = agents[0]!.id

			manager.createTask({ id: 'task-1', title: 'Test Task', assignedTo: agentId })

			manager.assignFairyToTask('task-1', '', agents)

			expect(manager.getTaskById('task-1')!.assignedTo).toBeNull()
		})

		it('should not assign non-existent fairy', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()

			manager.createTask({ id: 'task-1', title: 'Test Task' })

			manager.assignFairyToTask('task-1', 'non-existent', agents)

			expect(manager.getTaskById('task-1')!.assignedTo).toBeNull()
		})
	})

	describe('clearTasksAndProjects', () => {
		it('should clear all tasks and projects', () => {
			manager.createTask({ id: 'task-1', title: 'Task 1' })
			manager.createTask({ id: 'task-2', title: 'Task 2' })

			fairyApp.projects.addProject({
				id: 'project-1',
				title: 'Project 1',
				description: 'Test',
				color: 'blue',
				members: [],
				plan: 'Test',
			})

			expect(manager.getTasks()).toHaveLength(2)
			expect(fairyApp.projects.getProjects()).toHaveLength(1)

			manager.clearTasksAndProjects()

			expect(manager.getTasks()).toHaveLength(0)
			expect(fairyApp.projects.getProjects()).toHaveLength(0)
		})
	})

	describe('reset', () => {
		it('should reset the manager', () => {
			manager.createTask({ id: 'task-1', title: 'Task 1' })
			manager.createTask({ id: 'task-2', title: 'Task 2' })

			expect(manager.getTasks()).toHaveLength(2)

			manager.reset()

			expect(manager.getTasks()).toHaveLength(0)
		})
	})
})
