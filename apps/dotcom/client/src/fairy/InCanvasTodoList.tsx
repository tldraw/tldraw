import { SharedTodoItem } from '@tldraw/fairy-shared'
import { useEditor, useValue } from 'tldraw'
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { getProjectColor } from './getProjectColor'
import { getProjectById } from './Projects'
import { $sharedTodoList, $showCanvasTodos, deleteSharedTodoItem } from './SharedTodoList'

export function InCanvasTodoList({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
	const todos = useValue('shared-todo-list', () => $sharedTodoList.get(), [$sharedTodoList])
	const showCanvasTodos = useValue('show-canvas-todos', () => $showCanvasTodos.get(), [
		$showCanvasTodos,
	])
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])
	const isInTodoDragTool = useValue('is-in-todo-drag-tool', () => editor.isIn('select.todo-drag.dragging'), [editor])

	// Filter todos that are on canvas (have x/y coordinates) AND are on the current page
	const inCanvasTodos = useValue(
		'in-canvas-todos-on-page',
		() => {
			return todos.filter((todo) => {
				// Must have coordinates to be shown on canvas
				const hasCoordinates = todo.x != null && todo.y != null
				// Must be on the current page (or have no pageId for backwards compatibility)
				const isOnCurrentPage = !todo.pageId || todo.pageId === currentPageId
				return hasCoordinates && isOnCurrentPage
			})
		},
		[todos, currentPageId]
	)

	if (!showCanvasTodos) return null

	return (
		<div className={`in-canvas-todo-list ${isInTodoDragTool ? 'in-canvas-todo-list--dragging' : ''}`}>
			{inCanvasTodos.map((todo) => (
				<InCanvasTodoItem key={todo.id} agents={agents} todo={todo} />
			))}
		</div>
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
	const deleteTodoLabel = useMsg(fairyMessages.deleteTodo)

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

	if (todo.x == null || todo.y == null) return null

	return (
		<div
			className={`in-canvas-todo-item-wrapper`}
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
					title={deleteTodoLabel}
				>
					×
				</button>
			</div>
		</div>
	)
}
