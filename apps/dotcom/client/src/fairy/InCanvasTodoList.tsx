import { SharedTodoItem } from '@tldraw/fairy-shared'
import { useValue } from 'tldraw'
import {
	$sharedTodoList,
	$showCanvasTodos,
	deleteSharedTodoItem,
	requestHelpWithTodo,
} from './SharedTodoList'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function InCanvasTodoList({ agents }: { agents: FairyAgent[] }) {
	const todos = useValue('shared-todo-list', () => $sharedTodoList.get(), [$sharedTodoList])
	const showCanvasTodos = useValue('show-canvas-todos', () => $showCanvasTodos.get(), [
		$showCanvasTodos,
	])

	const inCanvasTodos = todos.filter((todo) => todo.x && todo.y)

	if (!showCanvasTodos) return null

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
					requestHelpWithTodo(todo.id, agents)
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
