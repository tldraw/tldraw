import { FairyProject, FairyProjectRole } from '@tldraw/fairy-shared'
import { atom } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { deleteFairyTask, getFairyTasksByProjectId } from './FairyTaskList'

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

export function disbandProject(projectId: string, agents: FairyAgent[]) {
	const project = getProjectById(projectId)
	if (!project || project.members.length <= 1) return

	const memberIds = new Set(project.members.map((member) => member.id))
	const memberAgents = agents.filter((agent) => memberIds.has(agent.id))

	memberAgents.forEach((memberAgent) => {
		memberAgent.interrupt({ mode: 'idling', input: null })
		memberAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
	})

	deleteProjectAndAssociatedTasks(projectId)
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
