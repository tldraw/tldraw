import { SharedTodoItem } from '@tldraw/fairy-shared'
import { useCallback } from 'react'
import { useValue } from 'tldraw'
import { $sharedTodoList, deleteSharedTodoItem } from './SharedTodoList'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function InCanvasTodoList({ agents }: { agents: FairyAgent[] }) {
	const todos = useValue('shared-todo-list', () => $sharedTodoList.get(), [$sharedTodoList])

	const inCanvasTodos = todos.filter((todo) => todo.x && todo.y)
	return (
		<>
			{inCanvasTodos.map((todo) => (
				<InCanvasTodoItem key={todo.id} agents={agents} todo={todo} />
			))}
		</>
	)
}

function getStatusIcon(status: SharedTodoItem['status']) {
	switch (status) {
		case 'todo':
			return '○'
		case 'in-progress':
			return '➤'
		case 'done':
			return '●'
		default:
			return '○'
	}
}

function InCanvasTodoItem({ agents, todo }: { agents: FairyAgent[]; todo: SharedTodoItem }) {
	const statusClass =
		todo.status === 'done'
			? 'in-canvas-todo-item--done'
			: todo.status === 'in-progress'
				? 'in-canvas-todo-item--in-progress'
				: 'in-canvas-todo-item--todo'

	const icon = getStatusIcon(todo.status)

	const askForHelp = useCallback(() => {
		const agent = todo.claimedById ? agents.find((a) => a.id === todo.claimedById) : undefined
		if (agent) {
			agent.helpOut([todo])
		} else {
			// Get a free agent
			const freeAgent = agents.find((v) => !v.isGenerating())
			if (freeAgent) {
				freeAgent.helpOut([todo])
			} else {
				// If no free agent is found, ask everyone to help
				agents.forEach((agent) => {
					agent.helpOut([todo])
				})
			}
		}
	}, [todo, agents])

	if (!todo.x || !todo.y) return null

	return (
		<div
			className={`in-canvas-todo-item ${statusClass}`}
			style={{
				left: todo.x,
				top: todo.y,
			}}
		>
			<button
				className="in-canvas-todo-item-icon"
				onPointerDown={(e) => {
					e.stopPropagation()
					askForHelp()
				}}
			>
				{icon}
			</button>
			<span className="in-canvas-todo-item-text">{todo.text}</span>
			<button
				className="in-canvas-todo-item-delete"
				onPointerDown={(e) => {
					e.stopPropagation()
					deleteSharedTodoItem(todo.id)
				}}
				title="Delete todo"
			>
				×
			</button>
		</div>
	)
}
