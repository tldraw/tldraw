import { useCallback } from 'react'
import { useValue } from 'tldraw'
import { TodoItem } from '../../shared/types/TodoItem'
import { TldrawAgent } from '../agent/TldrawAgent'

export function TodoList({ agent }: { agent: TldrawAgent }) {
	const todoItems = useValue(agent.$todoList)

	if (todoItems.length === 0) {
		return null
	}

	return (
		<div className="todo-list">
			<div className="todo-list-items">
				{todoItems.map((item) => (
					<TodoListItem key={item.id} agent={agent} item={item} />
				))}
			</div>
		</div>
	)
}

function TodoListItem({ agent, item }: { agent: TldrawAgent; item: TodoItem }) {
	const deleteTodo = useCallback(() => {
		agent.$todoList.update((items) => items.filter((i) => i.id !== item.id))
	}, [item.id, agent.$todoList])

	const getStatusIcon = (status: TodoItem['status']) => {
		switch (status) {
			case 'todo':
				return '○'
			case 'in-progress':
				return '➤'
			case 'done':
				return '●'
		}
	}

	const icon = getStatusIcon(item.status)

	return (
		<div className={`todo-item todo-item-${item.status}`}>
			<span className="todo-item-icon">{icon}</span>
			<span className="todo-item-text">{item.text}</span>
			<button className="todo-item-delete" onClick={deleteTodo}>
				×
			</button>
		</div>
	)
}
