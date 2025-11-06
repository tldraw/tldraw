import { FairyProject } from '@tldraw/fairy-shared'
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
