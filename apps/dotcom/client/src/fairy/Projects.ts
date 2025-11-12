import { FairyProject } from '@tldraw/fairy-shared'
import { atom } from 'tldraw'

export const $projects = atom<FairyProject[]>('projects', [])

export function addProject(project: FairyProject) {
	$projects.update((projects) => {
		// Check if project already exists
		if (projects.find((p) => p.id === project.id)) {
			return projects
		}
		return [...projects, project]
	})
}

export function getProjectById(id: string): FairyProject | undefined {
	return $projects.get().find((p) => p.id === id)
}

export function updateProject(projectId: string, updates: Partial<FairyProject>) {
	$projects.update((projects) =>
		projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
	)
}

export function deleteProject(projectId: string) {
	$projects.update((projects) => projects.filter((p) => p.id !== projectId))
}

export function clearProjects() {
	$projects.set([])
}
