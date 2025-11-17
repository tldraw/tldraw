import { FairyTask } from '@tldraw/fairy-shared'
import { useEditor, useValue } from 'tldraw'
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { $fairyDebugFlags } from './FairyDebugFlags'
import { getProjectById } from './FairyProjects'
import { $fairyTasks, $showCanvasFairyTasks, deleteFairyTask } from './FairyTaskList'
import { getProjectColor } from './getProjectColor'

export function InCanvasTaskList({ agents }: { agents: FairyAgent[] }) {
	const editor = useEditor()
	const tasks = useValue('fairy-tasks-list', () => $fairyTasks.get(), [$fairyTasks])
	const showCanvasTodos = useValue('show-canvas-todos', () => $showCanvasFairyTasks.get(), [
		$showCanvasFairyTasks,
	])
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])
	const isInTodoDragTool = useValue(
		'is-in-todo-drag-tool',
		() => editor.isIn('select.task-drag.dragging'),
		[editor]
	)

	// Filter tasks that are on canvas (have x/y coordinates) AND are on the current page
	const inCanvasTasks = useValue(
		'in-canvas-tasks-on-page',
		() => {
			return tasks.filter((task) => {
				// Must have coordinates to be shown on canvas
				const hasCoordinates = task.x != null && task.y != null
				// Must be on the current page (or have no pageId for backwards compatibility)
				const isOnCurrentPage = !task.pageId || task.pageId === currentPageId
				return hasCoordinates && isOnCurrentPage
			})
		},
		[tasks, currentPageId]
	)

	const showTaskBounds = useValue('show-task-bounds', () => $fairyDebugFlags.get().showTaskBounds, [
		$fairyDebugFlags,
	])

	if (!showCanvasTodos) return null

	return (
		<>
			<div
				className={`in-canvas-todo-list ${isInTodoDragTool ? 'in-canvas-todo-list--dragging' : ''}`}
			>
				{inCanvasTasks.map((task) => (
					<InCanvasTaskItem key={task.id} agents={agents} task={task} />
				))}
			</div>
			{showTaskBounds &&
				inCanvasTasks
					.filter((task) => task.x != null && task.y != null && task.w != null && task.h != null)
					.map((task) => (
						<TaskBoundsOverlay
							key={`bounds-${task.id}`}
							x={task.x!}
							y={task.y!}
							w={task.w!}
							h={task.h!}
						/>
					))}
		</>
	)
}

function getStatusIcon(status: FairyTask['status']) {
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

function InCanvasTaskItem({ agents, task }: { agents: FairyAgent[]; task: FairyTask }) {
	const deleteTaskLabel = useMsg(fairyMessages.deleteTask)
	const statusClass =
		task.status === 'done'
			? 'in-canvas-todo-item--done'
			: task.status === 'in-progress'
				? 'in-canvas-todo-item--in-progress'
				: 'in-canvas-todo-item--todo'

	const icon = getStatusIcon(task.status)
	const project = task.projectId ? getProjectById(task.projectId) : undefined
	const projectColor =
		project && agents.length > 0 ? getProjectColor(agents[0].editor, project.color) : undefined

	if (task.x == null || task.y == null) return null

	return (
		<div
			className={`in-canvas-todo-item-wrapper`}
			style={{
				left: task.x,
				top: task.y,
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
				<span className="in-canvas-todo-item-text">{task.text}</span>
				<button
					className="in-canvas-todo-item-delete"
					onPointerDown={(e) => {
						e.stopPropagation()
						deleteFairyTask(task.id)
					}}
					title={deleteTaskLabel}
				>
					×
				</button>
			</div>
		</div>
	)
}

function TaskBoundsOverlay({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
	return (
		<div
			className="in-canvas-todo-item-bounds"
			style={{
				position: 'absolute',
				left: x,
				top: y,
				width: w,
				height: h,
				border: '2px dashed rgba(255, 0, 0, 0.5)',
				pointerEvents: 'none',
				boxSizing: 'border-box',
			}}
		/>
	)
}
