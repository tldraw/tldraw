import { SharedTodoItem } from '@tldraw/fairy-shared'
import { atom } from 'tldraw'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { $fairyAgentsAtom } from './fairy-agent/agent/fairyAgentsAtom'
import { clearProjects } from './Projects'

export const $sharedTodoList = atom<SharedTodoItem[]>('sharedTodoList', [])

export function addSharedTodoItem(text: string, x?: number, y?: number) {
	$sharedTodoList.update((todos) => {
		const maxId = todos.length === 0 ? 0 : Math.max(...todos.map((t) => t.id))
		return [
			...todos,
			{
				id: maxId + 1,
				text,
				status: 'todo' as const,
				x: x ?? undefined,
				y: y ?? undefined,
			},
		]
	})
}

export function deleteSharedTodoItem(id: number) {
	$sharedTodoList.update((todos) => todos.filter((t) => t.id !== id))
}

export function clearSharedTodoList(agents?: FairyAgent[]) {
	$sharedTodoList.set([])

	// Clear all projects
	clearProjects()

	// Reset all active projects from all fairies
	if (agents && agents.length > 0) {
		// Get all agents from the editor to ensure we reset all of them
		const editor = agents[0].editor
		const allAgents = $fairyAgentsAtom.get(editor)

		allAgents.forEach((agent) => {
			agent.$currentProjectId.set(null)
			agent.setMode('default')
		})
	}
}

export function requestHelpWithTodo(todoId: number, agents: FairyAgent[]) {
	const todo = $sharedTodoList.get().find((t) => t.id === todoId)
	if (!todo) return

	// If there's an assigned agent, ask them to help
	const assignedAgent = todo.claimedById ? agents.find((a) => a.id === todo.claimedById) : undefined
	if (assignedAgent) {
		assignedAgent.helpOut([todo])
		return
	}

	// If there's a free agent, ask them to help
	const freeAgent = agents.find((v) => !v.isGenerating())
	if (freeAgent) {
		freeAgent.helpOut([todo])
		return
	}

	// If no free agent is found, ask a random agent to help
	const randomAgent = agents[Math.floor(Math.random() * agents.length)]
	if (randomAgent) {
		randomAgent.helpOut([todo])
	}
}

export function assignAgentToTodo(todoId: number, agentId: string, agents: FairyAgent[]) {
	const agent = agents.find((a) => a.id === agentId)
	if (!agent && agentId !== '') return

	$sharedTodoList.update((todos) =>
		todos.map((t) => (t.id === todoId ? { ...t, claimedById: agentId || undefined } : t))
	)
}

export function requestHelpFromEveryone(agents: FairyAgent[]) {
	agents.forEach((agent) => {
		agent.helpOut()
	})
}
