import React, { useCallback, useState } from 'react'
import { uniqueId, useEditor, useValue } from 'tldraw'
import '../tla/styles/fairy.css'
import { F, useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { getProjectById } from './FairyProjects'
import { FairyTaskDragTool } from './FairyTaskDragTool'
import {
	$fairyTasks,
	$showCanvasFairyTasks,
	assignFairyToTask,
	createFairyTask,
	deleteFairyTask,
} from './FairyTaskList'
import { getProjectColor } from './getProjectColor'

export function FairyTaskListInline({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
	const tasks = useValue('fairy-tasks-list', () => $fairyTasks.get(), [$fairyTasks])
	const [newTaskText, setNewTaskText] = useState('')
	const addTaskPlaceholder = useMsg(fairyMessages.addTaskPlaceholder)
	const dragToCanvas = useMsg(fairyMessages.dragToCanvas)
	const clickToRemoveOrDrag = useMsg(fairyMessages.clickToRemoveOrDrag)
	const deleteTask = useMsg(fairyMessages.deleteTask)

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

	const handleAddTask = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			if (!newTaskText.trim()) return

			const currentPageId = editor.getCurrentPageId()
			const taskId = `task-${uniqueId(6)}`
			createFairyTask({ id: taskId, text: newTaskText.trim(), pageId: currentPageId })
			setNewTaskText('')
		},
		[newTaskText, editor]
	)

	const handleDragStart = useCallback(
		(e: React.PointerEvent, taskId: string) => {
			const task = tasks.find((t) => t.id === taskId)
			if (!task) return

			// If task has coordinates and this is just a click (no movement), remove them
			if (task.x != null && task.y != null) {
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

						// Show todo items in canvas
						$showCanvasFairyTasks.set(true)

						// Activate drag tool for repositioning
						const tool = editor.getStateDescendant('select.task-drag')
						if (tool && 'setTodoId' in tool) {
							;(tool as FairyTaskDragTool).setTodoId(taskId)
							editor.setCurrentTool('select.task-drag')
						}
					}
				}

				const handlePointerUp = () => {
					document.removeEventListener('pointermove', handlePointerMove)
					document.removeEventListener('pointerup', handlePointerUp)

					// If didn't move, remove coordinates and pageId (simple click)
					if (!hasMoved) {
						$fairyTasks.update((todos) =>
							todos.map((t) =>
								t.id === taskId ? { ...t, x: undefined, y: undefined, pageId: undefined } : t
							)
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
					const tool = editor.getStateDescendant('select.task-drag')
					if (tool && 'setTodoId' in tool) {
						;(tool as FairyTaskDragTool).setTodoId(taskId)
						editor.setCurrentTool('select.task-drag')
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
		[editor, tasks]
	)

	return (
		<div className="shared-todo-list-inline">
			<form onSubmit={handleAddTask} className="shared-todo-input">
				<input
					type="text"
					value={newTaskText}
					onChange={(e) => setNewTaskText(e.target.value)}
					placeholder={addTaskPlaceholder}
					className="shared-todo-input-field"
				/>
				<button type="submit" className="shared-todo-input-submit" disabled={!newTaskText.trim()}>
					+
				</button>
			</form>
			{tasks.length > 0 && (
				<div className="shared-todo-list-items">
					{tasks.map((task) => {
						const statusClass =
							task.status === 'done'
								? 'shared-todo-item--done'
								: task.status === 'in-progress'
									? 'shared-todo-item--in-progress'
									: 'shared-todo-item--todo'

						const icon = getStatusIcon(task.status)
						const project = task.projectId ? getProjectById(task.projectId) : undefined
						const projectColor = project ? getProjectColor(editor, project.color) : undefined

						return (
							<div key={task.id} className={`shared-todo-item ${statusClass}`}>
								{projectColor && (
									<div
										className="shared-todo-item-project-indicator"
										style={{ backgroundColor: projectColor }}
									/>
								)}
								<div className="shared-todo-item-main">
									<span className="shared-todo-item-icon">{icon}</span>
									<span className="shared-todo-item-text">
										{task.id}. {task.text}
										{task.x != null && task.y != null && (
											<span className="shared-todo-item-coords">
												{' '}
												({Math.round(task.x)}, {Math.round(task.y)})
											</span>
										)}
									</span>
									<button
										className="shared-todo-item-drag"
										onPointerDown={(e) => {
											e.preventDefault()
											e.stopPropagation()
											handleDragStart(e, task.id)
										}}
										title={task.x != null && task.y != null ? clickToRemoveOrDrag : dragToCanvas}
									>
										{task.x != null && task.y != null ? '⊖' : '◎'}
									</button>
									<button
										className="shared-todo-item-delete"
										onClick={() => deleteFairyTask(task.id)}
										title={deleteTask}
									>
										×
									</button>
								</div>
								<div className="shared-todo-item-assign">
									<select
										value={task.assignedTo || ''}
										onChange={(e) => assignFairyToTask(task.id, e.target.value, agents)}
										className="shared-todo-item-fairy-select"
									>
										<option value="">
											<F defaultMessage="Auto" />
										</option>
										{agents.map((agent) => (
											<option key={agent.id} value={agent.id}>
												{agent.$fairyConfig.get().name}
											</option>
										))}
									</select>
								</div>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
