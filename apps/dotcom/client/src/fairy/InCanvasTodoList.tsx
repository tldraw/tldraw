import { SharedTodoItem } from '@tldraw/fairy-shared'
import { useValue } from 'tldraw'
import { getProjectById } from './Projects'
import { $sharedTodoList, $showCanvasTodos, deleteSharedTodoItem } from './SharedTodoList'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { getProjectColor } from './getProjectColor'

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
	const project = todo.projectId ? getProjectById(todo.projectId) : undefined
	const projectColor =
		project && agents.length > 0 ? getProjectColor(agents[0].editor, project.color) : undefined

	if (!todo.x || !todo.y) return null

	return (
		<div
			className="in-canvas-todo-item-wrapper"
			style={{
				left: todo.x,
				top: todo.y,
			}}
		>
			<div className={`in-canvas-todo-item ${statusClass}`}>
				{projectColor && (
					<div
						className="in-canvas-todo-item-project-indicator"
						style={{ backgroundColor: projectColor }}
					/>
				)}
				<div className="in-canvas-todo-item-icon">{icon}</div>
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
		</div>
	)
}
