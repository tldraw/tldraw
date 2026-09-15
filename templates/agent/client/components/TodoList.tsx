import { useValue } from 'tldraw'
import { TodoItem } from '../../shared/types/TodoItem'
import { TldrawAgent } from '../agent/TldrawAgent'

export function TodoList({ agent }: { agent: TldrawAgent }) {
	const todoItems = useValue('todoList', () => agent.todos.getTodos(), [agent])

	if (todoItems.length === 0) {
		return null
	}

	return (
		<div className="todo-list">
			<div className="todo-list-items">
				{todoItems.map((item) => (
					<TodoListItem key={item.id} item={item} agent={agent} />
				))}
			</div>
		</div>
	)
}

const STATUS_ICONS: Record<TodoItem['status'], string> = {
	todo: '○',
	'in-progress': '➤',
	done: '●',
}

function TodoListItem({ item, agent }: { item: TodoItem; agent: TldrawAgent }) {
	return (
		<div className={`todo-item todo-item-${item.status}`}>
			<span className="todo-item-icon">{STATUS_ICONS[item.status]}</span>
			<span className="todo-item-text">{item.text}</span>
			<button className="todo-item-delete" onClick={() => agent.todos.delete([item.id])}>
				×
			</button>
		</div>
	)
}
