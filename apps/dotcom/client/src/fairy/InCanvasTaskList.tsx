import { FairyTask } from '@tldraw/fairy-shared'
import { useValue } from 'tldraw'
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { getProjectById } from './FairyProjects'
import { $fairyTasks, $showCanvasFairyTasks, deleteFairyTask } from './FairyTaskList'
import { getProjectColor } from './getProjectColor'

export function InCanvasTaskList({ agents }: { agents: FairyAgent[] }) {
	const tasks = useValue('fairy-tasks-list', () => $fairyTasks.get(), [$fairyTasks])
	const showCanvasTodos = useValue('show-canvas-todos', () => $showCanvasFairyTasks.get(), [
		$showCanvasFairyTasks,
	])

	const inCanvasTasks = tasks.filter((task) => task.x != null && task.y != null)

	if (!showCanvasTodos) return null

	return (
		<>
			{inCanvasTasks.map((task) => (
				<InCanvasTaskItem key={task.id} agents={agents} task={task} />
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
			className="in-canvas-todo-item-wrapper"
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
