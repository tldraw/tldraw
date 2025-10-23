import { SharedTodoItem } from '@tldraw/fairy-shared'
import React, { useCallback, useState } from 'react'
import { useValue } from 'tldraw'
import '../tla/styles/fairy.css'
import { $sharedTodoList, addSharedTodoItem, deleteSharedTodoItem } from './SharedTodoList'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function SharedTodoListInline({ agents }: { agents: FairyAgent[] }) {
	const todos = useValue('shared-todo-list', () => $sharedTodoList.get(), [$sharedTodoList])
	const [newTodoText, setNewTodoText] = useState('')

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

	const handleAddTodo = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			if (!newTodoText.trim()) return

			addSharedTodoItem(newTodoText.trim())

			setNewTodoText('')
		},
		[newTodoText]
	)

	const handleDeleteTodo = useCallback((id: number) => {
		deleteSharedTodoItem(id)
	}, [])

	const handleAssignFairy = useCallback((todoId: number, fairyName: string) => {
		$sharedTodoList.update((todos) =>
			todos.map((t) => (t.id === todoId ? { ...t, claimedBy: fairyName } : t))
		)
	}, [])

	const handleHelpOut = useCallback(
		(todo: SharedTodoItem) => {
			const agent = agents.find((a) => a.$fairyConfig.get().name === todo.claimedBy) // TODO Matching by name is bad
			if (agent) {
				agent.helpOut([todo])
			}
		},
		[agents]
	)

	return (
		<div className="shared-todo-list-inline">
			<form onSubmit={handleAddTodo} className="shared-todo-input">
				<input
					type="text"
					value={newTodoText}
					onChange={(e) => setNewTodoText(e.target.value)}
					placeholder="Add a new todo..."
					className="shared-todo-input-field"
				/>
				<button type="submit" className="shared-todo-input-submit" disabled={!newTodoText.trim()}>
					+
				</button>
			</form>
			{todos.length > 0 && (
				<div className="shared-todo-list-items">
					{todos.map((todo) => {
						const statusClass =
							todo.status === 'done'
								? 'shared-todo-item--done'
								: todo.status === 'in-progress'
									? 'shared-todo-item--in-progress'
									: 'shared-todo-item--todo'

						const icon = getStatusIcon(todo.status)

						return (
							<div key={todo.id} className={`shared-todo-item ${statusClass}`}>
								<div className="shared-todo-item-main">
									<span className="shared-todo-item-icon">{icon}</span>
									<span className="shared-todo-item-text">
										{todo.id}. {todo.text}
									</span>
									<button
										className="shared-todo-item-delete"
										onClick={() => handleDeleteTodo(todo.id)}
										title="Delete todo"
									>
										×
									</button>
								</div>
								<div className="shared-todo-item-assign">
									<select
										value={todo.claimedBy || ''}
										onChange={(e) => handleAssignFairy(todo.id, e.target.value)}
										className="shared-todo-item-fairy-select"
									>
										<option value="">Unassigned</option>
										{agents.map((agent) => (
											<option key={agent.id} value={agent.$fairyConfig.get().name}>
												{agent.$fairyConfig.get().name}
											</option>
										))}
									</select>
									{todo.claimedBy && (
										<button
											className="shared-todo-item-help-button"
											onClick={() => handleHelpOut(todo)}
											title="Request help with this task"
										>
											Request help
										</button>
									)}
								</div>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
