import { FairyProject, FairyProjectRole } from '@tldraw/fairy-shared'
import { atom } from 'tldraw'

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

export function deleteProject(projectId: string) {
	$fairyProjects.update((projects) => projects.filter((p) => p.id !== projectId))
}

export function clearProjects() {
	$fairyProjects.set([])
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
