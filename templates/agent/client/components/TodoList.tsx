import { useCallback } from 'react'
import { useValue } from 'tldraw'
import { TodoItem } from '../../shared/types/TodoItem'
import { $todoItems } from '../atoms/todoItems'

export const TodoList = function TodoList() {
	const todoItems = useValue('todoItems', () => $todoItems.get(), [$todoItems])

	if (todoItems.length === 0) {
		return null
	}

	return (
		<div className="todo-list">
			<div className="todo-list-items">
				{todoItems.map((item) => (
					<TodoListItem key={item.id} item={item} />
				))}
			</div>
		</div>
	)
}

function TodoListItem({ item }: { item: TodoItem }) {
	const deleteTodo = useCallback(() => {
		$todoItems.update((items) => items.filter((i) => i.id !== item.id))
	}, [item.id])

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
