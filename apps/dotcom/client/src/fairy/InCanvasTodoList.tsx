import { SharedTodoItem } from '@tldraw/fairy-shared'
import { useValue } from 'tldraw'
import { $sharedTodoList, deleteSharedTodoItem } from './SharedTodoList'

export function InCanvasTodoList() {
	const todos = useValue('shared-todo-list', () => $sharedTodoList.get(), [$sharedTodoList])

	const inCanvasTodos = todos.filter((todo) => todo.x && todo.y)
	return (
		<>
			{inCanvasTodos.map((todo) => (
				<InCanvasTodoItem key={todo.id} todo={todo} />
			))}
		</>
	)
}

function InCanvasTodoItem({ todo }: { todo: SharedTodoItem }) {
	const getStatusIcon = (status: string) => {
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
			<span className="in-canvas-todo-item-icon">{icon}</span>
			<span className="in-canvas-todo-item-text">{todo.text}</span>
			<button
				className="in-canvas-todo-item-delete"
				onClick={(e) => {
					e.preventDefault()
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
