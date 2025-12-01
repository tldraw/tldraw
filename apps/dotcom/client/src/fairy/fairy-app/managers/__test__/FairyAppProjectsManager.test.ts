import { FairyProject } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FairyApp } from '../../FairyApp'
import { FairyAppProjectsManager } from '../FairyAppProjectsManager'
import { createTestEditor, createTestFairyApp } from './fairy-app-managers-test-shared'

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
					id: 'project-1',
					title: 'Test Project',
					description: 'Test description',
					color: 'blue',
					members: [],
					plan: 'Test plan',
				},
			]

			manager.setProjects(projects)

			expect(manager.getProjects()).toEqual(projects)
		})
	})

	describe('addProject', () => {
		it('should add a new project', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
			}

			manager.addProject(project)

			expect(manager.getProjects()).toContainEqual(project)
		})

		it('should not add duplicate projects', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
			}

			manager.addProject(project)
			manager.addProject(project)

			expect(manager.getProjects()).toHaveLength(1)
		})
	})

	describe('getProjectById', () => {
		it('should return a project by ID', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
			}

			manager.addProject(project)

			expect(manager.getProjectById('project-1')).toEqual(project)
		})

		it('should return undefined when project not found', () => {
			expect(manager.getProjectById('non-existent')).toBeUndefined()
		})
	})

	describe('getProjectByAgentId', () => {
		it('should return a project by agent ID', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: 'agent-1', role: 'orchestrator' },
					{ id: 'agent-2', role: 'drone' },
				],
				plan: 'Test plan',
			}

			manager.addProject(project)

			expect(manager.getProjectByAgentId('agent-1')).toEqual(project)
			expect(manager.getProjectByAgentId('agent-2')).toEqual(project)
		})

		it('should return undefined when agent not in any project', () => {
			expect(manager.getProjectByAgentId('non-existent')).toBeUndefined()
		})
	})

	describe('getRoleByAgentId', () => {
		it('should return the role of an agent', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: 'agent-1', role: 'orchestrator' },
					{ id: 'agent-2', role: 'drone' },
				],
				plan: 'Test plan',
			}

			manager.addProject(project)

			expect(manager.getRoleByAgentId('agent-1')).toBe('orchestrator')
			expect(manager.getRoleByAgentId('agent-2')).toBe('drone')
		})

		it('should return undefined when agent not in any project', () => {
			expect(manager.getRoleByAgentId('non-existent')).toBeUndefined()
		})
	})

	describe('getProjectOrchestrator', () => {
		it('should return the orchestrator of a project', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: 'agent-1', role: 'orchestrator' },
					{ id: 'agent-2', role: 'drone' },
				],
				plan: 'Test plan',
			}

			const orchestrator = manager.getProjectOrchestrator(project)

			expect(orchestrator).toEqual({ id: 'agent-1', role: 'orchestrator' })
		})

		it('should return duo-orchestrator when present', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: 'agent-1', role: 'duo-orchestrator' },
					{ id: 'agent-2', role: 'drone' },
				],
				plan: 'Test plan',
			}

			const orchestrator = manager.getProjectOrchestrator(project)

			expect(orchestrator).toEqual({ id: 'agent-1', role: 'duo-orchestrator' })
		})

		it('should return undefined when no orchestrator present', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: 'agent-1', role: 'drone' },
					{ id: 'agent-2', role: 'drone' },
				],
				plan: 'Test plan',
			}

			const orchestrator = manager.getProjectOrchestrator(project)

			expect(orchestrator).toBeUndefined()
		})
	})

	describe('updateProject', () => {
		it('should update a project', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
			}

			manager.addProject(project)
			manager.updateProject('project-1', { title: 'Updated Project' })

			expect(manager.getProjectById('project-1')!.title).toBe('Updated Project')
		})
	})

	describe('deleteProject', () => {
		it('should delete a project', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
			}

			manager.addProject(project)
			expect(manager.getProjects()).toHaveLength(1)

			manager.deleteProject('project-1')

			expect(manager.getProjects()).toHaveLength(0)
		})
	})

	describe('clearProjects', () => {
		it('should clear all projects', () => {
			manager.addProject({
				id: 'project-1',
				title: 'Test Project 1',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
			})

			manager.addProject({
				id: 'project-2',
				title: 'Test Project 2',
				description: 'Test description',
				color: 'red',
				members: [],
				plan: 'Test plan',
			})

			expect(manager.getProjects()).toHaveLength(2)

			manager.clearProjects()

			expect(manager.getProjects()).toHaveLength(0)
		})
	})

	describe('deleteProjectAndAssociatedTasks', () => {
		it('should delete a project and its tasks', () => {
			const project: FairyProject = {
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
			}

			manager.addProject(project)

			fairyApp.tasks.createTask({
				id: 'task-1',
				title: 'Task 1',
				text: 'Test',
				status: 'todo',
				projectId: 'project-1',
				assignedTo: null,
			})

			fairyApp.tasks.createTask({
				id: 'task-2',
				title: 'Task 2',
				text: 'Test',
				status: 'todo',
				projectId: 'project-1',
				assignedTo: null,
			})

			expect(fairyApp.tasks.getTasks()).toHaveLength(2)

			manager.deleteProjectAndAssociatedTasks('project-1')

			expect(manager.getProjects()).toHaveLength(0)
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
					[firstAgent.id]: {
						name: 'Agent 1',
						outfit: { body: 'plain' as any, hat: 'ears' as any, wings: 'plain' as any },
						sign: { sun: 'aries', moon: 'aries', rising: 'aries' },
					},
					[newId]: {
						name: 'Agent 2',
						outfit: { body: 'plain' as any, hat: 'ears' as any, wings: 'plain' as any },
						sign: { sun: 'taurus', moon: 'taurus', rising: 'taurus' },
					},
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
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: agent1.id, role: 'orchestrator' },
					{ id: agent2.id, role: 'drone' },
				],
				plan: 'Test plan',
			}

			manager.addProject(project)

			const interruptSpy1 = vi.spyOn(agent1, 'interrupt')
			const interruptSpy2 = vi.spyOn(agent2, 'interrupt')

			manager.disbandProject('project-1')

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
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [{ id: agent1.id, role: 'orchestrator' }],
				plan: 'Test plan',
			}

			manager.addProject(project)

			manager.disbandProject('project-1')

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
					[firstAgent.id]: {
						name: 'Agent 1',
						outfit: { body: 'plain' as any, hat: 'ears' as any, wings: 'plain' as any },
						sign: { sun: 'aries', moon: 'aries', rising: 'aries' },
					},
					[newId1]: {
						name: 'Agent 2',
						outfit: { body: 'plain' as any, hat: 'ears' as any, wings: 'plain' as any },
						sign: { sun: 'taurus', moon: 'taurus', rising: 'taurus' },
					},
					[newId2]: {
						name: 'Agent 3',
						outfit: { body: 'plain' as any, hat: 'ears' as any, wings: 'plain' as any },
						sign: { sun: 'gemini', moon: 'gemini', rising: 'gemini' },
					},
				},
				options
			)

			const agents = fairyApp.agents.getAgents()

			if (agents.length < 3) {
				throw new Error(`Expected 3 agents, got ${agents.length}`)
			}

			manager.addProject({
				id: 'project-1',
				title: 'Test Project 1',
				description: 'Test description',
				color: 'blue',
				members: [
					{ id: agents[0]!.id, role: 'orchestrator' },
					{ id: agents[1]!.id, role: 'drone' },
				],
				plan: 'Test plan',
			})

			manager.addProject({
				id: 'project-2',
				title: 'Test Project 2',
				description: 'Test description',
				color: 'red',
				members: [
					{ id: agents[2]!.id, role: 'orchestrator' },
					{ id: agents[1]!.id, role: 'drone' },
				],
				plan: 'Test plan',
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
			manager.addAgentToDummyProject('agent-1')

			const dummyProject = manager.getProjectById('dummy')
			expect(dummyProject).toBeDefined()
			expect(dummyProject!.members).toContainEqual({ id: 'agent-1', role: 'orchestrator' })
		})

		it('should add agent to existing dummy project', () => {
			manager.addAgentToDummyProject('agent-1')
			manager.addAgentToDummyProject('agent-2')

			const dummyProject = manager.getProjectById('dummy')
			expect(dummyProject!.members).toHaveLength(2)
			expect(dummyProject!.members).toContainEqual({ id: 'agent-2', role: 'drone' })
		})

		it('should not add the same agent twice', () => {
			manager.addAgentToDummyProject('agent-1')
			manager.addAgentToDummyProject('agent-1')

			const dummyProject = manager.getProjectById('dummy')
			expect(dummyProject!.members).toHaveLength(1)
		})
	})

	describe('reset', () => {
		it('should reset the manager', () => {
			manager.addProject({
				id: 'project-1',
				title: 'Test Project',
				description: 'Test description',
				color: 'blue',
				members: [],
				plan: 'Test plan',
			})

			expect(manager.getProjects()).toHaveLength(1)

			manager.reset()

			expect(manager.getProjects()).toHaveLength(0)
		})
	})
})
