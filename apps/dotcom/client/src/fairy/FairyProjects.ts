import { FairyProject, FairyProjectMember, FairyProjectRole } from '@tldraw/fairy-shared'
import { atom, Editor } from 'tldraw'
import { deleteFairyTask, getFairyTasksByProjectId } from './FairyTaskList'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { getFairyAgentById } from './fairy-agent/agent/fairyAgentsAtom'

export const $fairyProjects = atom<FairyProject[]>('fairyProjects', [])

export function addProject(project: FairyProject) {
	$fairyProjects.update((projects) => {
		// Check if project already exists
		if (projects.find((p) => p.id === project.id)) {
			return projects
		}
		return [...projects, project]
	})
}

export function getProjectById(id: string): FairyProject | undefined {
	return $fairyProjects.get().find((p) => p.id === id)
}

export function getProjectByAgentId(agentId: string): FairyProject | undefined {
	return $fairyProjects.get().find((p) => p.members.some((m) => m.id === agentId))
}

export function getRoleByAgentId(agentId: string): FairyProjectRole | undefined {
	const project = getProjectByAgentId(agentId)
	if (!project) return undefined
	return project.members.find((m) => m.id === agentId)?.role
}

export function getProjectOrchestrator(project: FairyProject): FairyProjectMember | undefined {
	return project.members.find(
		(member) => member.role === 'orchestrator' || member.role === 'duo-orchestrator'
	)
}

export function updateProject(projectId: string, updates: Partial<FairyProject>) {
	$fairyProjects.update((projects) =>
		projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
	)
}

function deleteProject(projectId: string) {
	$fairyProjects.update((projects) => projects.filter((p) => p.id !== projectId))
}

export function clearProjects() {
	$fairyProjects.set([])
}

export function deleteProjectAndAssociatedTasks(projectId: string) {
	getFairyTasksByProjectId(projectId).forEach((task) => deleteFairyTask(task.id))
	deleteProject(projectId)
}

export function disbandProject(projectId: string, editor: Editor) {
	const project = getProjectById(projectId)
	if (!project || project.members.length <= 1) return

	const memberAgents = project.members
		.map((member) => getFairyAgentById(member.id, editor))
		.filter((agent) => agent !== undefined)

	memberAgents.forEach((memberAgent) => {
		memberAgent.interrupt({ mode: 'idling', input: null })
		memberAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
	})

	deleteProjectAndAssociatedTasks(projectId)
}

// TODO we need to handling orchestrators that are waiting for something
export function resumeProject(projectId: string, editor: Editor) {
	rectifyFairyModesUponBadState(projectId, editor)

	const project = getProjectById(projectId)

	const isValidProject =
		project &&
		project.members.length > 1 &&
		project.members.some(
			(member) => member.role === 'orchestrator' || member.role === 'duo-orchestrator'
		) &&
		project.members.some((member) => member.role === 'drone')

	if (!isValidProject) {
		console.error('Invalid project', JSON.stringify(project, null, 2))
		disbandProject(projectId, editor)
		return
	}

	const projectMemberAgents = project.members
		.map((member) => getFairyAgentById(member.id, editor))
		.filter((agent) => agent !== undefined)

	// todo handle errors better
	if (projectMemberAgents.length !== project.members.length) {
		console.error(
			'Invalid project member agents',
			JSON.stringify(projectMemberAgents, null, 2),
			JSON.stringify(project.members, null, 2)
		)
		disbandProject(projectId, editor)
		return
	}

	const isDuoProject = project?.members.some((member) => member.role === 'duo-orchestrator')

	if (isDuoProject) {
		handleResumeDuoProject(project, projectMemberAgents)
	} else {
		handleResumeTeamProject(project, projectMemberAgents)
	}
}

function handleResumeTeamProject(project: FairyProject, projectMemberAgents: FairyAgent[]) {
	const orchestratorAgent = projectMemberAgents.find((agent) => agent.getRole() === 'orchestrator')
	const droneAgents = projectMemberAgents.filter((agent) => agent.getRole() === 'drone')

	if (!orchestratorAgent || droneAgents.length < 2) {
		// todo return something so we can disband in main fn
		return
	}

	const projectTasks = getFairyTasksByProjectId(project.id)
	const projectHasTasks = projectTasks.length > 0

	if (projectHasTasks) {
		const allTasksDone = projectTasks.every((task) => task.status === 'done')
		const allTasksTodo = projectTasks.every((task) => task.status === 'todo')
		if (allTasksDone) {
			// state 1
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
			// state 5
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
			// check if there are in progress tasks
			const inProgressTasks = projectTasks.filter((task) => task.status === 'in-progress')
			if (inProgressTasks.length > 0) {
				// state 2
				const droneAgentsWithInProgressTasks = inProgressTasks
					.map((task) => task.assignedTo)
					.filter((assigneeId) => assigneeId !== null)
					.map((assigneeId) => droneAgents.find((agent) => agent.id === assigneeId))
					.filter((agent) => agent !== undefined)

				// .filter((agent) => agent.getTasks()
				// .some((task) => task.status === 'in-progress'))

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
				// TODO make the orchestrator wait for the drones to finish their tasks programmatically
			} else {
				// state 3
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
		// state 4
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

	// state 1: project has tasks and they are all are done
	// what to do: prompt the orchestrator to figure out what to do next
	// state 2: project has tasks and some tasks are in progress
	// what to do: prompt any relevant drones to resume working on the tasks
	// make the orchestrator wait for the drones to finish their tasks programmatically
	// state 3: project has tasks that are a mix of done and todo
	// what to do: prompt the orchestrator to figure out what to do next
	// state 4: project has no tasks
	// what to do: prompt the orchestrator to figure out what to do next
	// stat 5: project has tasks and all are todo
	// what to do: prompt the orchestrator to finish planning the project
}

function handleResumeDuoProject(project: FairyProject, projectMemberAgents: FairyAgent[]) {
	const duoOrchestratorAgent = projectMemberAgents.find(
		(agent) => agent.getRole() === 'duo-orchestrator'
	)
	const droneAgent = projectMemberAgents.find((agent) => agent.getRole() === 'drone')

	if (!duoOrchestratorAgent || !droneAgent) {
		// todo return something so we can disband in main fn
		return
	}

	const projectTasks = getFairyTasksByProjectId(project.id)
	const projectHasTasks = projectTasks.length > 0

	if (projectHasTasks) {
		const allTasksDone = projectTasks.every((task) => task.status === 'done')
		const allTasksTodo = projectTasks.every((task) => task.status === 'todo')
		if (allTasksDone) {
			// state 1
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
			// state 5
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
			// check if there are in progress tasks
			const inProgressTasks = projectTasks.filter((task) => task.status === 'in-progress')
			if (inProgressTasks.length > 0) {
				// state 2
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
				// TODO make the orchestrator wait for tasks to finish programmatically if needed
			} else {
				// state 3
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
		// state 4
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

	// state 1: project has tasks and they are all done
	// what to do: prompt the duo-orchestrator to figure out what to do next
	// state 2: project has tasks and some tasks are in progress
	// what to do: prompt the duo-orchestrator (if they have in-progress tasks) to resume working-orchestrator mode
	// prompt the drone (if they have in-progress tasks) to resume working-drone mode
	// make the orchestrator wait for tasks to finish programmatically if needed
	// state 3: project has tasks that are a mix of done and todo
	// what to do: prompt the duo-orchestrator to figure out what to do next
	// state 4: project has no tasks
	// what to do: prompt the duo-orchestrator to figure out what to do next
	// state 5: project has tasks and all are todo
	// what to do: prompt the duo-orchestrator to finish planning the project or start working
}

// function handleResumeProjectDrones(project: FairyProject) {}
// function handleResumeProjectOrchestrator(project: FairyProject) {}
// function handleResumeProjectDuoOrchestrator(project: FairyProject) {}

function rectifyFairyModesUponBadState(projectId: string, editor: Editor) {
	const project = getProjectById(projectId)
	if (!project) return

	const projectMemberAgents = project.members
		.map((member) => getFairyAgentById(member.id, editor))
		.filter((agent) => agent !== undefined)

	projectMemberAgents.forEach((agent) => {
		const role = agent.getRole()
		if (role === 'orchestrator') {
			agent.setMode('orchestrating-waiting')
		} else if (role === 'duo-orchestrator') {
			agent.setMode('duo-orchestrating-waiting')
		} else if (role === 'drone') {
			agent.setMode('standing-by')
		}
	})
}

// for debug purposes
export function addAgentToDummyProject(agentId: string) {
	$fairyProjects.update((projects) => {
		const dummyProject = projects.find((p) => p.id === 'dummy')

		if (!dummyProject) {
			// Create a new dummy project with the agent as orchestrator
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
			// Check if agent is already a member
			const isAlreadyMember = dummyProject.members.some((m) => m.id === agentId)
			if (isAlreadyMember) {
				return projects
			}
			// Add agent as a drone
			return projects.map((p) =>
				p.id === 'dummy' ? { ...p, members: [...p.members, { id: agentId, role: 'drone' }] } : p
			)
		}
	})
}
