import { SharedTodoItem } from '@tldraw/fairy-shared'
import React, { useCallback, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import '../tla/styles/fairy.css'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { $sharedTodoList, addSharedTodoItem, deleteSharedTodoItem } from './SharedTodoList'
import { TodoDragTool } from './TodoDragTool'

export function SharedTodoListInline({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
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

	const handleAssignFairy = useCallback(
		(todoId: number, fairyId: string) => {
			const agent = agents.find((a) => a.id === fairyId)
			if (!agent && fairyId !== '') return

			$sharedTodoList.update((todos) =>
				todos.map((t) => (t.id === todoId ? { ...t, claimedById: fairyId || undefined } : t))
			)
		},
		[agents]
	)

	const handleHelpOut = useCallback(
		(todo: SharedTodoItem) => {
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
		},
		[agents]
	)

	const handleDragStart = useCallback(
		(e: React.PointerEvent, todoId: number) => {
			const todo = todos.find((t) => t.id === todoId)
			if (!todo) return

			// If todo has coordinates and this is just a click (no movement), remove them
			if (todo.x != null && todo.y != null) {
				// Check if this will be a drag by tracking movement
				const startX = e.clientX
				const startY = e.clientY
				let hasMoved = false

				const handlePointerMove = (moveEvent: PointerEvent) => {
					const deltaX = moveEvent.clientX - startX
					const deltaY = moveEvent.clientY - startY

					// If moved more than 1 pixel, treat as drag
					if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
						hasMoved = true
						document.removeEventListener('pointermove', handlePointerMove)
						document.removeEventListener('pointerup', handlePointerUp)

						// Activate drag tool for repositioning
						const tool = editor.getStateDescendant('todo-drag')
						if (tool && 'setTodoId' in tool) {
							;(tool as TodoDragTool).setTodoId(todoId)
							editor.setCurrentTool('todo-drag')
						}
					}
				}

				const handlePointerUp = () => {
					document.removeEventListener('pointermove', handlePointerMove)
					document.removeEventListener('pointerup', handlePointerUp)

					// If didn't move, remove coordinates (simple click)
					if (!hasMoved) {
						$sharedTodoList.update((todos) =>
							todos.map((t) => (t.id === todoId ? { ...t, x: undefined, y: undefined } : t))
						)
					}
				}

				document.addEventListener('pointermove', handlePointerMove)
				document.addEventListener('pointerup', handlePointerUp)
				return
			}

			// If no coordinates, set up drag to place
			const startX = e.clientX
			const startY = e.clientY

			const handlePointerMove = (moveEvent: PointerEvent) => {
				const deltaX = moveEvent.clientX - startX
				const deltaY = moveEvent.clientY - startY

				// Start dragging if moved more than 1 pixel
				if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
					document.removeEventListener('pointermove', handlePointerMove)
					document.removeEventListener('pointerup', handlePointerUp)

					// Activate the drag tool
					const tool = editor.getStateDescendant('todo-drag')
					if (tool && 'setTodoId' in tool) {
						;(tool as TodoDragTool).setTodoId(todoId)
						editor.setCurrentTool('todo-drag')
					}
				}
			}

			const handlePointerUp = () => {
				document.removeEventListener('pointermove', handlePointerMove)
				document.removeEventListener('pointerup', handlePointerUp)
			}

			document.addEventListener('pointermove', handlePointerMove)
			document.addEventListener('pointerup', handlePointerUp)
		},
		[editor, todos]
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
										{todo.x != null && todo.y != null && (
											<span className="shared-todo-item-coords">
												{' '}
												({Math.round(todo.x)}, {Math.round(todo.y)})
											</span>
										)}
									</span>
									<button
										className="shared-todo-item-drag"
										onPointerDown={(e) => {
											e.preventDefault()
											e.stopPropagation()
											handleDragStart(e, todo.id)
										}}
										title={
											todo.x != null && todo.y != null
												? 'Click to remove or drag to move'
												: 'Drag to canvas'
										}
									>
										⇄
									</button>
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
										value={todo.claimedById || ''}
										onChange={(e) => handleAssignFairy(todo.id, e.target.value)}
										className="shared-todo-item-fairy-select"
									>
										<option value="">Auto</option>
										{agents.map((agent) => (
											<option key={agent.id} value={agent.id}>
												{agent.$fairyConfig.get().name}
											</option>
										))}
									</select>
									{
										<button
											className="shared-todo-item-help-button"
											onClick={() => handleHelpOut(todo)}
											title="Request help with this task"
										>
											Request help
										</button>
									}
								</div>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
