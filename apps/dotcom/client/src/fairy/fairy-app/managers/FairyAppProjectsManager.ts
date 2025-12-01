import { FairyProject, FairyProjectMember, FairyProjectRole } from '@tldraw/fairy-shared'
import { atom, Atom, uniqueId } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { BaseFairyAppManager } from './BaseFairyAppManager'

/**
 * Manager for fairy projects - CRUD operations and project lifecycle.
 *
 * This duplicates functionality from fairy-projects.ts
 * but in a class-based form tied to FairyApp.
 */
export class FairyAppProjectsManager extends BaseFairyAppManager {
	/**
	 * Atom containing the current list of projects.
	 */
	private $projects: Atom<FairyProject[]> = atom('fairyAppProjects', [])

	/**
	 * Get all projects.
	 */
	getProjects(): FairyProject[] {
		return this.$projects.get()
	}

	/**
	 * Set all projects (used during state loading).
	 */
	setProjects(projects: FairyProject[]) {
		this.$projects.set(projects)
	}

	/**
	 * Add a new project.
	 */
	addProject(project: FairyProject) {
		this.$projects.update((projects) => {
			// Check if project already exists
			if (projects.find((p) => p.id === project.id)) {
				return projects
			}
			return [...projects, project]
		})
	}

	/**
	 * Get a project by ID.
	 */
	getProjectById(id: string): FairyProject | undefined {
		return this.$projects.get().find((p) => p.id === id)
	}

	/**
	 * Get a project that an agent is a member of.
	 */
	getProjectByAgentId(agentId: string): FairyProject | undefined {
		return this.$projects.get().find((p) => p.members.some((m) => m.id === agentId))
	}

	/**
	 * Get an agent's role within their project.
	 */
	getRoleByAgentId(agentId: string): FairyProjectRole | undefined {
		const project = this.getProjectByAgentId(agentId)
		if (!project) return undefined
		return project.members.find((m) => m.id === agentId)?.role
	}

	/**
	 * Get the orchestrator of a project.
	 */
	getProjectOrchestrator(project: FairyProject): FairyProjectMember | undefined {
		return project.members.find(
			(member) => member.role === 'orchestrator' || member.role === 'duo-orchestrator'
		)
	}

	/**
	 * Update a project's properties.
	 */
	updateProject(projectId: string, updates: Partial<FairyProject>) {
		this.$projects.update((projects) =>
			projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
		)
	}

	/**
	 * Delete a project.
	 */
	deleteProject(projectId: string) {
		this.$projects.update((projects) => projects.filter((p) => p.id !== projectId))
	}

	/**
	 * Clear all projects.
	 */
	clearProjects() {
		this.$projects.set([])
	}

	/**
	 * Delete a project and all associated tasks.
	 */
	deleteProjectAndAssociatedTasks(projectId: string) {
		this.fairyApp.tasks.getTasksByProjectId(projectId).forEach((task) => {
			this.fairyApp.tasks.deleteTask(task.id)
		})
		this.deleteProject(projectId)
	}

	/**
	 * Add a memory entry to an agent about project cancellation.
	 */
	private addProjectCancellationMemory(memberAgent: FairyAgent, project: FairyProject) {
		const role = memberAgent.getRole()
		const isOrchestrator = role === 'orchestrator' || role === 'duo-orchestrator'
		const verb = isOrchestrator ? 'leading' : 'working on'
		const projectReference = project.title ? `the "${project.title}" project` : 'a project'

		// Get completed tasks for this member agent
		const completedTasks = this.fairyApp.tasks
			.getTasksByProjectId(project.id)
			.filter((task) => task.status === 'done' && task.assignedTo === memberAgent.id)
		const completedTasksCount = completedTasks.length

		if (completedTasksCount > 0) {
			const taskWord = completedTasksCount === 1 ? 'task' : 'tasks'
			memberAgent.chat.push(
				{
					id: uniqueId(),
					type: 'memory-transition',
					memoryLevel: 'fairy',
					agentFacingMessage: `[ACTIONS]: <Project actions filtered for brevity>`,
					userFacingMessage: 'Project cancelled',
				},
				{
					id: uniqueId(),
					type: 'prompt',
					promptSource: 'self',
					memoryLevel: 'fairy',
					agentFacingMessage: `[THOUGHT]: I was ${verb} ${projectReference} that got cancelled by the user. I had completed ${completedTasksCount} ${taskWord} before the project was cancelled.`,
					userFacingMessage: '',
				}
			)
		} else {
			memberAgent.chat.push(
				{
					id: uniqueId(),
					type: 'memory-transition',
					memoryLevel: 'fairy',
					agentFacingMessage: `[ACTIONS]: <Project actions filtered for brevity>`,
					userFacingMessage: 'Project cancelled',
				},
				{
					id: uniqueId(),
					type: 'prompt',
					promptSource: 'self',
					memoryLevel: 'fairy',
					agentFacingMessage: `[THOUGHT]: I was ${verb} ${projectReference} that got cancelled by the user.`,
					userFacingMessage: null,
				}
			)
		}
	}

	/**
	 * Disband a project, interrupting all agents and cleaning up.
	 */
	disbandProject(projectId: string) {
		const project = this.getProjectById(projectId)
		if (!project || project.members.length <= 1) return

		const memberAgents = project.members
			.map((member) => this.fairyApp.agents.getAgentById(member.id))
			.filter((agent): agent is FairyAgent => agent !== undefined)

		memberAgents.forEach((memberAgent) => {
			this.addProjectCancellationMemory(memberAgent, project)
			memberAgent.interrupt({ mode: 'idling', input: null })
		})

		this.deleteProjectAndAssociatedTasks(projectId)
	}

	/**
	 * Disband all projects.
	 */
	disbandAllProjects() {
		const projects = this.$projects.get()
		const agents = this.fairyApp.agents.getAgents()

		projects.forEach((project) => {
			if (project.members.length <= 1) return

			const memberAgents = project.members
				.map((member) => agents.find((a) => a.id === member.id))
				.filter((agent): agent is FairyAgent => agent !== undefined)

			memberAgents.forEach((memberAgent) => {
				this.addProjectCancellationMemory(memberAgent, project)
				memberAgent.interrupt({ mode: 'idling', input: null })
				memberAgent.updateEntity((f) => (f ? { ...f, isSelected: false } : f))
			})

			this.deleteProjectAndAssociatedTasks(project.id)
		})

		// Clear any remaining projects
		this.clearProjects()
	}

	/**
	 * Resume a project after a page reload or interruption.
	 */
	resumeProject(projectId: string) {
		this.rectifyFairyModesUponBadState(projectId)

		const project = this.getProjectById(projectId)

		const isValidProject =
			project &&
			project.members.length > 1 &&
			project.members.some(
				(member) => member.role === 'orchestrator' || member.role === 'duo-orchestrator'
			) &&
			project.members.some((member) => member.role === 'drone')

		if (!isValidProject) {
			console.error('Invalid project', JSON.stringify(project, null, 2))
			this.disbandProject(projectId)
			return
		}

		const projectMemberAgents = project.members
			.map((member) => this.fairyApp.agents.getAgentById(member.id))
			.filter((agent): agent is FairyAgent => agent !== undefined)

		if (projectMemberAgents.length !== project.members.length) {
			console.error(
				'Invalid project member agents',
				JSON.stringify(projectMemberAgents, null, 2),
				JSON.stringify(project.members, null, 2)
			)
			this.disbandProject(projectId)
			return
		}

		const isDuoProject = project.members.some((member) => member.role === 'duo-orchestrator')

		if (isDuoProject) {
			this.handleResumeDuoProject(project, projectMemberAgents)
		} else {
			this.handleResumeTeamProject(project, projectMemberAgents)
		}
	}

	/**
	 * Handle resuming a team project (one orchestrator, multiple drones).
	 */
	private handleResumeTeamProject(project: FairyProject, projectMemberAgents: FairyAgent[]) {
		const orchestratorAgent = projectMemberAgents.find(
			(agent) => agent.getRole() === 'orchestrator'
		)
		const droneAgents = projectMemberAgents.filter((agent) => agent.getRole() === 'drone')

		if (!orchestratorAgent || droneAgents.length < 2) {
			return
		}

		const projectTasks = this.fairyApp.tasks.getTasksByProjectId(project.id)
		const projectHasTasks = projectTasks.length > 0

		if (projectHasTasks) {
			const allTasksDone = projectTasks.every((task) => task.status === 'done')
			const allTasksTodo = projectTasks.every((task) => task.status === 'todo')

			if (allTasksDone) {
				console.warn(
					`[Team Project ${project.id}] State 1: All tasks done (${projectTasks.length} tasks). Resuming orchestrator to review/end project.`
				)
				orchestratorAgent.interrupt({
					mode: 'orchestrating-active',
					input: {
						message:
							"You were orchestrating a project but you got cut off. All tasks have been marked as done, if you've already reviewed the project, you can end it. If not, review the project.",
					},
				})
			} else if (allTasksTodo) {
				console.warn(
					`[Team Project ${project.id}] State 5: All tasks are todo (${projectTasks.length} tasks). Resuming orchestrator to finish planning or direct drones.`
				)
				orchestratorAgent.interrupt({
					mode: 'orchestrating-active',
					input: {
						message:
							"You were orchestrating a project but you got cut off. All project tasks are marked as todo. Consult the project plan, if you've finished planning, you can direct the drones to start working on the tasks. Otherwise, continue making tasks, then continue as normal.",
					},
				})
			} else {
				const inProgressTasks = projectTasks.filter((task) => task.status === 'in-progress')
				if (inProgressTasks.length > 0) {
					const droneAgentsWithInProgressTasks = inProgressTasks
						.map((task) => task.assignedTo)
						.filter((assigneeId) => assigneeId !== null)
						.map((assigneeId) => droneAgents.find((agent) => agent.id === assigneeId))
						.filter((agent): agent is FairyAgent => agent !== undefined)

					console.warn(
						`[Team Project ${project.id}] State 2: ${inProgressTasks.length} task(s) in progress. Resuming ${droneAgentsWithInProgressTasks.length} drone(s) to continue working.`
					)
					droneAgentsWithInProgressTasks.forEach((agent) => {
						agent.interrupt({
							mode: 'working-drone',
							input: {
								message: 'You were working on a task but got cut off. Continue.',
							},
						})
					})
				} else {
					const doneCount = projectTasks.filter((task) => task.status === 'done').length
					const todoCount = projectTasks.filter((task) => task.status === 'todo').length
					console.warn(
						`[Team Project ${project.id}] State 3: Mix of done (${doneCount}) and todo (${todoCount}) tasks, no in-progress. Resuming orchestrator to continue leading.`
					)
					orchestratorAgent.interrupt({
						mode: 'orchestrating-active',
						input: {
							message:
								'You were orchestrating a project but you got cut off. There are no in progress tasks, but some remaining to do. Consult the project plan on what to do next and continue leading the project.',
						},
					})
				}
			}
		} else {
			console.warn(
				`[Team Project ${project.id}] State 4: No tasks exist. Resuming orchestrator to finish planning.`
			)
			orchestratorAgent.interrupt({
				mode: 'orchestrating-active',
				input: {
					message:
						'You were orchestrating a project but you got cut off. The project has no tasks, so you should finish planning the project given the original ask.',
				},
			})
		}
	}

	/**
	 * Handle resuming a duo project (one duo-orchestrator, one drone).
	 */
	private handleResumeDuoProject(project: FairyProject, projectMemberAgents: FairyAgent[]) {
		const duoOrchestratorAgent = projectMemberAgents.find(
			(agent) => agent.getRole() === 'duo-orchestrator'
		)
		const droneAgent = projectMemberAgents.find((agent) => agent.getRole() === 'drone')

		if (!duoOrchestratorAgent || !droneAgent) {
			return
		}

		const projectTasks = this.fairyApp.tasks.getTasksByProjectId(project.id)
		const projectHasTasks = projectTasks.length > 0

		if (projectHasTasks) {
			const allTasksDone = projectTasks.every((task) => task.status === 'done')
			const allTasksTodo = projectTasks.every((task) => task.status === 'todo')

			if (allTasksDone) {
				console.warn(
					`[Duo Project ${project.id}] State 1: All tasks done (${projectTasks.length} tasks). Resuming duo-orchestrator to review/end project.`
				)
				duoOrchestratorAgent.interrupt({
					mode: 'duo-orchestrating-active',
					input: {
						message:
							"You were orchestrating a project but you got cut off. All tasks have been marked as done, if you've already reviewed the project, you can end it. If not, review the project.",
					},
				})
			} else if (allTasksTodo) {
				console.warn(
					`[Duo Project ${project.id}] State 5: All tasks are todo (${projectTasks.length} tasks). Resuming duo-orchestrator to finish planning or start working.`
				)
				duoOrchestratorAgent.interrupt({
					mode: 'duo-orchestrating-active',
					input: {
						message:
							"You were orchestrating a project but you got cut off. All project tasks are marked as todo. Consult the project plan, if you've finished planning, you can start working on tasks yourself or direct the drone to start working. Otherwise, continue making tasks, then continue as normal.",
					},
				})
			} else {
				const inProgressTasks = projectTasks.filter((task) => task.status === 'in-progress')
				if (inProgressTasks.length > 0) {
					const duoOrchestratorInProgressTasks = inProgressTasks.filter(
						(task) => task.assignedTo === duoOrchestratorAgent.id
					)
					const droneInProgressTasks = inProgressTasks.filter(
						(task) => task.assignedTo === droneAgent.id
					)

					console.warn(
						`[Duo Project ${project.id}] State 2: ${inProgressTasks.length} task(s) in progress. Duo-orchestrator: ${duoOrchestratorInProgressTasks.length} task(s), Drone: ${droneInProgressTasks.length} task(s). Resuming agents accordingly.`
					)

					if (duoOrchestratorInProgressTasks.length > 0) {
						duoOrchestratorAgent.interrupt({
							mode: 'working-orchestrator',
							input: {
								message: 'You were working on a task but got cut off. Continue.',
							},
						})
					}

					if (droneInProgressTasks.length > 0) {
						droneAgent.interrupt({
							mode: 'working-drone',
							input: {
								message: 'You were working on a task but got cut off. Continue.',
							},
						})
					}
				} else {
					const doneCount = projectTasks.filter((task) => task.status === 'done').length
					const todoCount = projectTasks.filter((task) => task.status === 'todo').length
					console.warn(
						`[Duo Project ${project.id}] State 3: Mix of done (${doneCount}) and todo (${todoCount}) tasks, no in-progress. Resuming duo-orchestrator to continue leading.`
					)
					duoOrchestratorAgent.interrupt({
						mode: 'duo-orchestrating-active',
						input: {
							message:
								'You were orchestrating a project but you got cut off. There are no in progress tasks, but some remaining to do. Consult the project plan on what to do next and continue leading the project.',
						},
					})
				}
			}
		} else {
			console.warn(
				`[Duo Project ${project.id}] State 4: No tasks exist. Resuming duo-orchestrator to finish planning.`
			)
			duoOrchestratorAgent.interrupt({
				mode: 'duo-orchestrating-active',
				input: {
					message:
						'You were orchestrating a project but you got cut off. The project has no tasks, so you should finish planning the project given the original ask.',
				},
			})
		}
	}

	/**
	 * Rectify fairy modes when in bad state (e.g., after reload).
	 */
	private rectifyFairyModesUponBadState(projectId: string) {
		const project = this.getProjectById(projectId)
		if (!project) return

		const projectMemberAgents = project.members
			.map((member) => this.fairyApp.agents.getAgentById(member.id))
			.filter((agent): agent is FairyAgent => agent !== undefined)

		projectMemberAgents.forEach((agent) => {
			const role = agent.getRole()
			if (role === 'orchestrator') {
				agent.mode.setMode('orchestrating-waiting')
			} else if (role === 'duo-orchestrator') {
				agent.mode.setMode('duo-orchestrating-waiting')
			} else if (role === 'drone') {
				agent.mode.setMode('standing-by')
			}
		})
	}

	/**
	 * Add an agent to a dummy project (for debug purposes).
	 */
	addAgentToDummyProject(agentId: string) {
		this.$projects.update((projects) => {
			const dummyProject = projects.find((p) => p.id === 'dummy')

			if (!dummyProject) {
				const newProject: FairyProject = {
					id: 'dummy',
					title: 'Dummy Project',
					description: 'A dummy project for testing',
					color: 'violet',
					members: [{ id: agentId, role: 'orchestrator' }],
					plan: 'idk!!',
				}
				return [...projects, newProject]
			} else {
				const isAlreadyMember = dummyProject.members.some((m) => m.id === agentId)
				if (isAlreadyMember) {
					return projects
				}
				return projects.map((p) =>
					p.id === 'dummy' ? { ...p, members: [...p.members, { id: agentId, role: 'drone' }] } : p
				)
			}
		})
	}

	/**
	 * Reset the manager to its initial state.
	 */
	reset() {
		this.$projects.set([])
	}
}
