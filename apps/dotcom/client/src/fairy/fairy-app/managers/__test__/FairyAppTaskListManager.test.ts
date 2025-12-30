import { FairyTask, toAgentId, toProjectId, toTaskId } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FairyApp } from '../../FairyApp'
import { FairyAppTaskListManager } from '../FairyAppTaskListManager'
import {
	createTestEditor,
	createTestFairyApp,
	getFairyProject,
} from './fairy-app-managers-test-shared'

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
					id: toTaskId('task-1'),
					title: 'Test Task',
					text: 'Test description',
					status: 'todo',
					projectId: null,
					assignedTo: null,
					x: 0,
					y: 0,
					w: 0,
					h: 0,
				},
			]

			manager.setTasks(tasks)

			expect(manager.getTasks()).toEqual(tasks)
		})
	})

	describe('createTask', () => {
		it('should create a new task with defaults', () => {
			manager.createTask({ id: toTaskId('task-1'), title: '', x: 0, y: 0, w: 0, h: 0 })

			const tasks = manager.getTasks()
			expect(tasks).toHaveLength(1)
			expect(tasks[0]).toMatchObject({
				id: toTaskId('task-1'),
				title: '',
				text: '',
				status: 'todo',
				projectId: null,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})
		})

		it('should create a task with custom properties', () => {
			manager.createTask({
				id: toTaskId('task-1'),
				title: 'Test Task',
				text: 'Test description',
				status: 'in-progress',
				projectId: toProjectId('project-1'),
				assignedTo: toAgentId('agent-1'),
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			const task = manager.getTaskById(toTaskId('task-1'))
			expect(task).toMatchObject({
				id: toTaskId('task-1'),
				title: 'Test Task',
				text: 'Test description',
				status: 'in-progress',
				projectId: toProjectId('project-1'),
				assignedTo: toAgentId('agent-1'),
			})
		})
	})

	describe('deleteTask', () => {
		it('should delete a task by ID', () => {
			manager.createTask({ id: toTaskId('task-1'), title: 'Task 1', x: 0, y: 0, w: 0, h: 0 })
			expect(manager.getTasks()).toHaveLength(1)

			manager.deleteTask(toTaskId('task-1'))

			expect(manager.getTasks()).toHaveLength(0)
		})
	})

	describe('getTaskById', () => {
		it('should return a task by ID', () => {
			manager.createTask({
				id: toTaskId('task-1'),
				title: 'Test Task',
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			const task = manager.getTaskById(toTaskId('task-1'))

			expect(task).toBeDefined()
			expect(task!.id).toBe(toTaskId('task-1'))
			expect(task!.title).toBe('Test Task')
		})

		it('should return undefined when task not found', () => {
			expect(manager.getTaskById(toTaskId('non-existent'))).toBeUndefined()
		})
	})

	describe('setTaskStatus', () => {
		it('should set a task status', () => {
			manager.createTask({
				id: toTaskId('task-1'),
				title: 'Test Task',
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			manager.setTaskStatus(toTaskId('task-1'), 'in-progress')

			expect(manager.getTaskById(toTaskId('task-1'))!.status).toBe('in-progress')
		})

		it('should not affect other tasks', () => {
			manager.createTask({ id: toTaskId('task-1'), title: 'Task 1', x: 0, y: 0, w: 0, h: 0 })
			manager.createTask({ id: toTaskId('task-2'), title: 'Task 2', x: 0, y: 0, w: 0, h: 0 })

			manager.setTaskStatus(toTaskId('task-1'), 'done')

			expect(manager.getTaskById(toTaskId('task-1'))!.status).toBe('done')
			expect(manager.getTaskById(toTaskId('task-2'))!.status).toBe('todo')
		})
	})

	describe('setTaskStatusAndNotify', () => {
		it('should set task status and notify waiting agents when done', () => {
			manager.createTask({
				id: toTaskId('task-1'),
				title: 'Test Task',
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			const notifyTaskCompletedSpy = vi.spyOn(fairyApp.waits, 'notifyTaskCompleted')

			manager.setTaskStatusAndNotify(toTaskId('task-1'), 'done')

			expect(manager.getTaskById(toTaskId('task-1'))!.status).toBe('done')
			expect(notifyTaskCompletedSpy).toHaveBeenCalledWith(
				expect.objectContaining({ id: toTaskId('task-1') })
			)
		})

		it('should not notify when status is not done', () => {
			manager.createTask({
				id: toTaskId('task-1'),
				title: 'Test Task',
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			const notifyTaskCompletedSpy = vi.spyOn(fairyApp.waits, 'notifyTaskCompleted')

			manager.setTaskStatusAndNotify(toTaskId('task-1'), 'in-progress')

			expect(notifyTaskCompletedSpy).not.toHaveBeenCalled()
		})
	})

	describe('getTasksByProjectId', () => {
		it('should return tasks for a specific project', () => {
			// Create projects first (required since getTasksByProjectId checks if project exists)
			fairyApp.projects.addProject({
				...getFairyProject({ id: toProjectId('project-1') }),
			})
			fairyApp.projects.addProject({
				...getFairyProject({ id: toProjectId('project-2') }),
			})

			manager.createTask({
				id: toTaskId('task-1'),
				title: 'Task 1',
				projectId: toProjectId('project-1'),
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})
			manager.createTask({
				id: toTaskId('task-2'),
				title: 'Task 2',
				projectId: toProjectId('project-1'),
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})
			manager.createTask({
				id: toTaskId('task-3'),
				title: 'Task 3',
				projectId: toProjectId('project-2'),
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			const projectTasks = manager.getTasksByProjectId(toProjectId('project-1'))

			expect(projectTasks).toHaveLength(2)
			expect(projectTasks.map((t) => t.id)).toEqual([toTaskId('task-1'), toTaskId('task-2')])
		})

		it('should return empty array when no tasks for project', () => {
			expect(manager.getTasksByProjectId(toProjectId('non-existent'))).toEqual([])
		})
	})

	describe('getTasksByAgentId', () => {
		it('should return tasks assigned to a specific agent', () => {
			manager.createTask({
				id: toTaskId('task-1'),
				title: 'Task 1',
				assignedTo: toAgentId('agent-1'),
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})
			manager.createTask({
				id: toTaskId('task-2'),
				title: 'Task 2',
				assignedTo: toAgentId('agent-1'),
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})
			manager.createTask({
				id: toTaskId('task-3'),
				title: 'Task 3',
				assignedTo: toAgentId('agent-2'),
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			const agentTasks = manager.getTasksByAgentId(toAgentId('agent-1'))

			expect(agentTasks).toHaveLength(2)
			expect(agentTasks.map((t) => t.id)).toEqual([toTaskId('task-1'), toTaskId('task-2')])
		})

		it('should return empty array when no tasks for agent', () => {
			expect(manager.getTasksByAgentId(toAgentId('non-existent'))).toEqual([])
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
			const agentIdValue = agents[0]!.id

			manager.createTask({
				id: toTaskId('task-1'),
				title: 'Test Task',
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			manager.assignFairyToTask(toTaskId('task-1'), agentIdValue, agents)

			expect(manager.getTaskById(toTaskId('task-1'))!.assignedTo).toBe(agentIdValue)
		})

		it('should unassign a fairy when null provided', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agentIdValue = agents[0]!.id

			manager.createTask({
				id: toTaskId('task-1'),
				title: 'Test Task',
				assignedTo: agentIdValue,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			manager.assignFairyToTask(toTaskId('task-1'), null, agents)

			expect(manager.getTaskById(toTaskId('task-1'))!.assignedTo).toBeNull()
		})

		it('should not assign non-existent fairy', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()

			manager.createTask({
				id: toTaskId('task-1'),
				title: 'Test Task',
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			manager.assignFairyToTask(toTaskId('task-1'), toAgentId('non-existent'), agents)

			expect(manager.getTaskById(toTaskId('task-1'))!.assignedTo).toBeNull()
		})
	})

	describe('clearTasksAndProjects', () => {
		it('should clear all tasks and projects', () => {
			manager.createTask({ id: toTaskId('task-1'), title: 'Task 1', x: 0, y: 0, w: 0, h: 0 })
			manager.createTask({ id: toTaskId('task-2'), title: 'Task 2', x: 0, y: 0, w: 0, h: 0 })

			fairyApp.projects.addProject(getFairyProject())

			expect(manager.getTasks()).toHaveLength(2)
			expect(fairyApp.projects.getProjects()).toHaveLength(1)

			manager.clearTasksAndProjects()

			expect(manager.getTasks()).toHaveLength(0)
			expect(fairyApp.projects.getProjects()).toHaveLength(0)
		})
	})

	describe('reset', () => {
		it('should reset the manager', () => {
			manager.createTask({ id: toTaskId('task-1'), title: 'Task 1', x: 0, y: 0, w: 0, h: 0 })
			manager.createTask({ id: toTaskId('task-2'), title: 'Task 2', x: 0, y: 0, w: 0, h: 0 })

			expect(manager.getTasks()).toHaveLength(2)

			manager.reset()

			expect(manager.getTasks()).toHaveLength(0)
		})
	})
})
