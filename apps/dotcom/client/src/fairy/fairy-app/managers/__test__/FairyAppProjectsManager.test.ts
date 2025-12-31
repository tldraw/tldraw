import { FairyProject, toAgentId, toProjectId, toTaskId } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FairyApp } from '../../FairyApp'
import { FairyAppProjectsManager } from '../FairyAppProjectsManager'
import {
	createTestEditor,
	createTestFairyApp,
	getDefaultFairyConfig,
	getFairyProject,
} from './fairy-app-managers-test-shared'

const agentId1 = toAgentId('agent-1')
const agentId2 = toAgentId('agent-2')
const projectId1 = toProjectId('project-1')
const projectId2 = toProjectId('project-2')
const taskId1 = toTaskId('task-1')
const taskId2 = toTaskId('task-2')

describe('FairyAppProjectsManager', () => {
	let editor: Editor
	let fairyApp: FairyApp
	let manager: FairyAppProjectsManager

	beforeEach(() => {
		editor = createTestEditor()
		fairyApp = createTestFairyApp(editor)
		manager = fairyApp.projects
	})

	afterEach(() => {
		editor.dispose()
		fairyApp.dispose()
	})

	describe('getProjects', () => {
		it('should return an empty array initially', () => {
			expect(manager.getProjects()).toEqual([])
		})
	})

	describe('setProjects', () => {
		it('should set projects', () => {
			const projects: FairyProject[] = [
				{
					id: projectId1,
					title: 'Test Project',
					description: 'Test description',
					color: 'blue',
					members: [],
					plan: 'Test plan',
					softDeleted: false,
				},
			]

			manager.setProjects(projects)

			expect(manager.getProjects()).toEqual(projects)
		})
	})

	describe('addProject', () => {
		it('should add a new project', () => {
			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project)

			expect(manager.getProjects()).toContainEqual(project)
		})

		it('should not add duplicate projects', () => {
			const project = getFairyProject({
				id: projectId1,
			})

			manager.addProject(project)
			manager.addProject(project)

			expect(manager.getProjects()).toHaveLength(1)
		})
	})

	describe('getProjectById', () => {
		it('should return a project by ID', () => {
			const project = getFairyProject({
				id: projectId1,
			})

			manager.addProject(project)

			expect(manager.getProjectById(projectId1)).toEqual(project)
		})

		it('should return undefined when project not found', () => {
			expect(manager.getProjectById(toProjectId('non-existent'))).toBeUndefined()
		})
	})

	describe('getProjectByAgentId', () => {
		it('should return a project by agent ID', () => {
			const project = getFairyProject({
				id: projectId1,
				members: [
					{ id: agentId1, role: 'orchestrator' },
					{ id: agentId2, role: 'drone' },
				],
			})

			manager.addProject(project)

			expect(manager.getProjectByAgentId(agentId1)).toEqual(project)
			expect(manager.getProjectByAgentId(agentId2)).toEqual(project)
		})

		it('should return undefined when agent not in any project', () => {
			expect(manager.getProjectByAgentId(toAgentId('non-existent'))).toBeUndefined()
		})
	})

	describe('getRoleByAgentId', () => {
		it('should return the role of an agent', () => {
			const project = getFairyProject({
				id: projectId1,
				members: [
					{ id: agentId1, role: 'orchestrator' },
					{ id: agentId2, role: 'drone' },
				],
			})

			manager.addProject(project)

			expect(manager.getRoleByAgentId(agentId1)).toBe('orchestrator')
			expect(manager.getRoleByAgentId(agentId2)).toBe('drone')
		})

		it('should return undefined when agent not in any project', () => {
			expect(manager.getRoleByAgentId(toAgentId('non-existent'))).toBeUndefined()
		})
	})

	describe('getProjectOrchestrator', () => {
		it('should return the orchestrator of a project', () => {
			const project = getFairyProject({
				id: projectId1,
				members: [
					{ id: agentId1, role: 'orchestrator' },
					{ id: agentId2, role: 'drone' },
				],
			})

			const orchestrator = manager.getProjectOrchestrator(project)

			expect(orchestrator).toEqual({ id: agentId1, role: 'orchestrator' })
		})

		it('should return duo-orchestrator when present', () => {
			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: agentId1, role: 'duo-orchestrator' },
					{ id: agentId2, role: 'drone' },
				],
				plan: 'Test plan',
				softDeleted: false,
			}

			const orchestrator = manager.getProjectOrchestrator(project)

			expect(orchestrator).toEqual({ id: agentId1, role: 'duo-orchestrator' })
		})

		it('should return undefined when no orchestrator present', () => {
			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: agentId1, role: 'drone' },
					{ id: agentId2, role: 'drone' },
				],
				plan: 'Test plan',
				softDeleted: false,
			}

			const orchestrator = manager.getProjectOrchestrator(project)

			expect(orchestrator).toBeUndefined()
		})
	})

	describe('updateProject', () => {
		it('should update a project', () => {
			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project)
			manager.updateProject(projectId1, { title: 'Updated Project' })

			expect(manager.getProjectById(projectId1)!.title).toBe('Updated Project')
		})
	})

	describe('deleteProject', () => {
		it('should delete a project', () => {
			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project)
			expect(manager.getProjects()).toHaveLength(1)

			manager.deleteProject(projectId1)

			expect(manager.getProjects()).toHaveLength(0)
		})
	})

	describe('clearProjects', () => {
		it('should clear all projects', () => {
			manager.addProject({
				id: projectId1,
				title: 'Test Project 1',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			})

			manager.addProject({
				id: projectId2,
				title: 'Test Project 2',
				description: 'Test description',
				color: 'red',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			})

			expect(manager.getProjects()).toHaveLength(2)

			manager.clearProjects()

			expect(manager.getProjects()).toHaveLength(0)
		})
	})

	describe('deleteProjectAndAssociatedTasks', () => {
		it('should delete a project and its tasks', () => {
			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project)

			fairyApp.tasks.createTask({
				id: taskId1,
				title: 'Task 1',
				text: 'Test',
				status: 'todo',
				projectId: projectId1,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			fairyApp.tasks.createTask({
				id: taskId2,
				title: 'Task 2',
				text: 'Test',
				status: 'todo',
				projectId: projectId1,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			expect(fairyApp.tasks.getTasks()).toHaveLength(2)

			manager.deleteProjectAndAssociatedTasks(projectId1)

			expect(manager.getProjects()).toHaveLength(0)
			expect(fairyApp.tasks.getTasks()).toHaveLength(0)
		})
	})

	describe('softDeleteProjectAndAssociatedTasks', () => {
		it('should mark a project as soft deleted', () => {
			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project)

			expect(manager.getProjectById(projectId1)?.softDeleted).toBe(false)

			manager.softDeleteProjectAndAssociatedTasks(projectId1)

			expect(manager.getProjectById(projectId1, true)?.softDeleted).toBe(true)
		})

		it('should filter out soft-deleted projects from getProjects() by default', () => {
			const project1: FairyProject = {
				id: projectId1,
				title: 'Active Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			const project2: FairyProject = {
				id: projectId2,
				title: 'Soft Deleted Project',
				description: 'Test description',
				color: 'red',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project1)
			manager.addProject(project2)

			expect(manager.getProjects()).toHaveLength(2)

			manager.softDeleteProjectAndAssociatedTasks(projectId2)

			// Should filter out soft-deleted project by default
			const projects = manager.getProjects()
			expect(projects).toHaveLength(1)
			expect(projects[0]?.id).toBe(projectId1)

			// Should include soft-deleted projects when explicitly requested
			const allProjects = manager.getProjects(true)
			expect(allProjects).toHaveLength(2)
			expect(allProjects.find((p) => p.id === projectId2)?.softDeleted).toBe(true)
		})

		it('should filter out soft-deleted projects from getProjectById() by default', () => {
			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project)

			expect(manager.getProjectById(projectId1)).toBeDefined()

			manager.softDeleteProjectAndAssociatedTasks(projectId1)

			// Should return undefined for soft-deleted project by default
			expect(manager.getProjectById(projectId1)).toBeUndefined()

			// Should return project when explicitly including soft-deleted
			const softDeletedProject = manager.getProjectById(projectId1, true)
			expect(softDeletedProject).toBeDefined()
			expect(softDeletedProject?.softDeleted).toBe(true)
		})

		it('should filter out soft-deleted projects from getProjectByAgentId() by default', () => {
			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [{ id: agentId1, role: 'orchestrator' }],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project)

			expect(manager.getProjectByAgentId(agentId1)).toBeDefined()

			manager.softDeleteProjectAndAssociatedTasks(projectId1)

			// Should return undefined for soft-deleted project by default
			expect(manager.getProjectByAgentId(agentId1)).toBeUndefined()

			// Should return project when explicitly including soft-deleted
			const softDeletedProject = manager.getProjectByAgentId(agentId1, true)
			expect(softDeletedProject).toBeDefined()
			expect(softDeletedProject?.softDeleted).toBe(true)
		})
	})

	describe('hardDeleteSoftDeletedProjects', () => {
		it('should hard delete all soft-deleted projects and their tasks', () => {
			const project1: FairyProject = {
				id: projectId1,
				title: 'Active Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			const project2: FairyProject = {
				id: projectId2,
				title: 'Soft Deleted Project',
				description: 'Test description',
				color: 'red',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project1)
			manager.addProject(project2)

			// Create tasks for both projects
			fairyApp.tasks.createTask({
				id: taskId1,
				title: 'Task 1',
				text: 'Test',
				status: 'todo',
				projectId: projectId1,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			fairyApp.tasks.createTask({
				id: taskId2,
				title: 'Task 2',
				text: 'Test',
				status: 'todo',
				projectId: projectId2,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			expect(manager.getProjects()).toHaveLength(2)
			expect(fairyApp.tasks.getTasks()).toHaveLength(2)

			// Soft delete project2
			manager.softDeleteProjectAndAssociatedTasks(projectId2)

			// Project2 should still exist but be soft-deleted
			expect(manager.getProjects(true)).toHaveLength(2)
			expect(manager.getProjects()).toHaveLength(1) // Filtered out by default
			expect(fairyApp.tasks.getTasks()).toHaveLength(2) // Tasks still exist

			// Hard delete soft-deleted projects
			manager.hardDeleteSoftDeletedProjects()

			// Project2 and its task should be completely removed
			expect(manager.getProjects()).toHaveLength(1)
			expect(manager.getProjects(true)).toHaveLength(1)
			expect(fairyApp.tasks.getTasks()).toHaveLength(1)
			expect(fairyApp.tasks.getTasks()[0]?.projectId).toBe(projectId1)
		})

		it('should not delete active projects', () => {
			const project: FairyProject = {
				id: projectId1,
				title: 'Active Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project)

			fairyApp.tasks.createTask({
				id: taskId1,
				title: 'Task 1',
				text: 'Test',
				status: 'todo',
				projectId: projectId1,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			expect(manager.getProjects()).toHaveLength(1)
			expect(fairyApp.tasks.getTasks()).toHaveLength(1)

			// Hard delete should not affect active projects
			manager.hardDeleteSoftDeletedProjects()

			expect(manager.getProjects()).toHaveLength(1)
			expect(fairyApp.tasks.getTasks()).toHaveLength(1)
		})

		it('should handle multiple soft-deleted projects', () => {
			const project1: FairyProject = {
				id: projectId1,
				title: 'Soft Deleted Project 1',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			const project2: FairyProject = {
				id: projectId2,
				title: 'Soft Deleted Project 2',
				description: 'Test description',
				color: 'red',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project1)
			manager.addProject(project2)

			fairyApp.tasks.createTask({
				id: taskId1,
				title: 'Task 1',
				text: 'Test',
				status: 'todo',
				projectId: projectId1,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			fairyApp.tasks.createTask({
				id: taskId2,
				title: 'Task 2',
				text: 'Test',
				status: 'todo',
				projectId: projectId2,
				assignedTo: null,
				x: 0,
				y: 0,
				w: 0,
				h: 0,
			})

			// Soft delete both projects
			manager.softDeleteProjectAndAssociatedTasks(projectId1)
			manager.softDeleteProjectAndAssociatedTasks(projectId2)

			expect(manager.getProjects()).toHaveLength(0)
			expect(manager.getProjects(true)).toHaveLength(2)
			expect(fairyApp.tasks.getTasks()).toHaveLength(2)

			// Hard delete all soft-deleted projects
			manager.hardDeleteSoftDeletedProjects()

			expect(manager.getProjects()).toHaveLength(0)
			expect(manager.getProjects(true)).toHaveLength(0)
			expect(fairyApp.tasks.getTasks()).toHaveLength(0)
		})
	})

	describe('disbandProject', () => {
		it('should disband a project with multiple members', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			// Create first agent
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const firstAgent = fairyApp.agents.getAgents()[0]!

			// Create second agent with explicit configs
			const newId = fairyApp.agents.createNewFairyConfig()
			fairyApp.agents.syncAgentsWithConfigs(
				{
					[firstAgent.id]: getDefaultFairyConfig({
						name: 'Agent 1',
					}),
					[newId]: getDefaultFairyConfig({
						name: 'Agent 2',
					}),
				},
				options
			)

			const agents = fairyApp.agents.getAgents()
			const agent1 = agents[0]!
			const agent2 = agents[1]!

			if (!agent2) {
				throw new Error('Expected second agent to be created')
			}

			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: agent1.id, role: 'orchestrator' },
					{ id: agent2.id, role: 'drone' },
				],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project)

			const interruptSpy1 = vi.spyOn(agent1, 'interrupt')
			const interruptSpy2 = vi.spyOn(agent2, 'interrupt')

			manager.disbandProject(projectId1)

			expect(interruptSpy1).toHaveBeenCalled()
			expect(interruptSpy2).toHaveBeenCalled()
			expect(manager.getProjects()).toHaveLength(0)
		})

		it('should not disband a project with only one member', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agent1 = agents[0]!

			const project: FairyProject = {
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [{ id: agent1.id, role: 'orchestrator' }],
				plan: 'Test plan',
				softDeleted: false,
			}

			manager.addProject(project)

			manager.disbandProject(projectId1)

			// Project should still exist
			expect(manager.getProjects()).toHaveLength(1)
		})
	})

	describe('disbandAllProjects', () => {
		it('should disband all projects', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			// Create first agent
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const firstAgent = fairyApp.agents.getAgents()[0]!

			// Create additional agents with explicit configs
			const newId1 = fairyApp.agents.createNewFairyConfig()
			const newId2 = fairyApp.agents.createNewFairyConfig()

			fairyApp.agents.syncAgentsWithConfigs(
				{
					[firstAgent.id]: getDefaultFairyConfig({
						name: 'Agent 1',
					}),
					[newId1]: getDefaultFairyConfig({
						name: 'Agent 2',
					}),
					[newId2]: getDefaultFairyConfig({
						name: 'Agent 3',
					}),
				},
				options
			)

			const agents = fairyApp.agents.getAgents()

			if (agents.length < 3) {
				throw new Error(`Expected 3 agents, got ${agents.length}`)
			}

			manager.addProject({
				id: projectId1,
				title: 'Test Project 1',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: agents[0]!.id, role: 'orchestrator' },
					{ id: agents[1]!.id, role: 'drone' },
				],
				plan: 'Test plan',
				softDeleted: false,
			})

			manager.addProject({
				id: projectId2,
				title: 'Test Project 2',
				description: 'Test description',
				color: 'red',
				members: [
					{ id: agents[2]!.id, role: 'orchestrator' },
					{ id: agents[1]!.id, role: 'drone' },
				],
				plan: 'Test plan',
				softDeleted: false,
			})

			const interruptSpy0 = vi.spyOn(agents[0]!, 'interrupt')
			const interruptSpy1 = vi.spyOn(agents[1]!, 'interrupt')
			const interruptSpy2 = vi.spyOn(agents[2]!, 'interrupt')

			manager.disbandAllProjects()

			expect(interruptSpy0).toHaveBeenCalled()
			expect(interruptSpy1).toHaveBeenCalled()
			expect(interruptSpy2).toHaveBeenCalled()
			expect(manager.getProjects()).toHaveLength(0)
		})
	})

	describe('addAgentToDummyProject', () => {
		it('should create a dummy project if it does not exist', () => {
			manager.addAgentToDummyProject(agentId1)

			const dummyProject = manager.getProjectById(toProjectId('dummy'))
			expect(dummyProject).toBeDefined()
			expect(dummyProject!.members).toContainEqual({ id: agentId1, role: 'orchestrator' })
		})

		it('should add agent to existing dummy project', () => {
			manager.addAgentToDummyProject(agentId1)
			manager.addAgentToDummyProject(agentId2)

			const dummyProject = manager.getProjectById(toProjectId('dummy'))
			expect(dummyProject!.members).toHaveLength(2)
			expect(dummyProject!.members).toContainEqual({ id: agentId2, role: 'drone' })
		})

		it('should not add the same agent twice', () => {
			manager.addAgentToDummyProject(agentId1)
			manager.addAgentToDummyProject(agentId1)

			const dummyProject = manager.getProjectById(toProjectId('dummy'))
			expect(dummyProject!.members).toHaveLength(1)
		})
	})

	describe('reset', () => {
		it('should reset the manager', () => {
			manager.addProject({
				id: projectId1,
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
				softDeleted: false,
			})

			expect(manager.getProjects()).toHaveLength(1)

			manager.reset()

			expect(manager.getProjects()).toHaveLength(0)
		})
	})
})
