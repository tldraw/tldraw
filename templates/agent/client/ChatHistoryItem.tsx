import { TLAiStreamingChange } from '@tldraw/ai'
import { useEffect, useState } from 'react'
import { Editor, TLShape } from 'tldraw'
import { BrainIcon } from './icons/BrainIcon'
import { PencilIcon } from './icons/PencilIcon'
import { RefreshIcon } from './icons/RefreshIcon'
import { SearchIcon } from './icons/SearchIcon'
import { TrashIcon } from './icons/TrashIcon'
import TldrawViewer from './TldrawViewer'

export type ChatHistoryItem =
	| UserMessageHistoryItem
	| AgentChangeHistoryItem
	| AgentMessageHistoryItem
	| AgentActionHistoryItem
	| AgentRawHistoryItem
	| StatusThinkingHistoryItem

export interface UserMessageHistoryItem {
	type: 'user-message'
	message: string
	status: 'done'
}

export interface StatusThinkingHistoryItem {
	type: 'status-thinking'
	message: string
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentMessageHistoryItem {
	type: 'agent-message'
	message: string
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentChangeHistoryItem {
	type: 'agent-change'
	changes: TLAiStreamingChange[]
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentRawHistoryItem {
	type: 'agent-raw'
	change: TLAiStreamingChange
	status: 'progress' | 'done' | 'cancelled'
}

export function UserMessageHistoryItem({ item }: { item: UserMessageHistoryItem }) {
	return <div className="user-chat-message">{item.message}</div>
}

export function AgentMessageHistoryItem({ item }: { item: AgentMessageHistoryItem }) {
	return <div className="agent-chat-message">{item.message}</div>
}

function getCompleteShapeFromStreamingShape({
	shape,
	editor,
}: {
	shape?: Partial<TLShape>
	editor: Editor
}) {
	if (!shape) return null
	if (!shape.type) return null
	const util = editor.getShapeUtil(shape.type)
	if (!util) return null

	const shapeRecord = editor.store.schema.types.shape.create(shape)
	const completeShapeRecord = {
		...shapeRecord,
		index: 'a0',
		parentId: 'page:',
		props: {
			...util.getDefaultProps(),
			...(shape.props ?? {}),
		},
	}

	return completeShapeRecord as TLShape
}

export function AgentChangeHistoryItem({
	item,
	editor,
}: {
	item: AgentChangeHistoryItem
	editor: Editor
}) {
	const createdShapes = item.changes
		.map((change) => {
			if (change.type !== 'createShape') return null
			return getCompleteShapeFromStreamingShape({ shape: change.shape, editor })
		})
		.filter((v) => v !== null)

	// Hardcoded to only support a single create shape change for now
	// TODO: Support other change types
	if (createdShapes.length === 0) return null

	return (
		<div className="agent-change-message">
			{/* <div>{item.changes[0]?.description}</div> */}
			{createdShapes && <TldrawViewer shapes={createdShapes} />}
		</div>
	)
}

export function AgentActionHistoryItem({ item }: { item: AgentActionHistoryItem }) {
	const actionDefinition = ACTION_HISTORY_ITEM_DEFINITIONS[item.action]
	const icon = actionDefinition.icon
	const message = actionDefinition.message[item.status]

	return (
		<div className="agent-action-message">
			<span>{icon}</span>
			<span>
				<strong>{message}</strong>
				<span>{item.info ?? ''}</span>
			</span>
		</div>
	)
}

export function StatusThinkingHistoryItem({ item }: { item: StatusThinkingHistoryItem }) {
	const [startTime] = useState(() => new Date())
	const [endTime, setEndTime] = useState<Date | null>(null)
	const [currentTime, setCurrentTime] = useState(() => new Date())

	useEffect(() => {
		if (item.status === 'done' && !endTime) {
			setEndTime(new Date())
		}
	}, [item.status, endTime])

	// Update current time every second while status is 'progress'
	useEffect(() => {
		if (item.status !== 'progress') return

		const interval = setInterval(() => {
			setCurrentTime(new Date())
		}, 1000)

		return () => clearInterval(interval)
	}, [item.status])

	const secondsElapsed = Math.floor(
		(endTime ? endTime.getTime() : currentTime.getTime()) / 1000 - startTime.getTime() / 1000
	)

	if (item.status === 'done') return null

	return (
		<div className="agent-chat-message status-thinking-message">
			<p className="status-thinking-message-text">Thinking for {secondsElapsed}s</p>
		</div>
	)
}

export function AgentRawHistoryItem({ item }: { item: AgentRawHistoryItem }) {
	const values = Object.entries(item.change).map(([key, value]) => {
		if (key === 'type' || key === 'complete') return null
		if (typeof value === 'object') return JSON.stringify(value, null, 2)
		return value
	})
	return <div className="agent-raw-message">{values.join('\n')}</div>
}

export interface AgentActionDefinition {
	icon: React.ReactNode
	message: { progress: string; done: string; cancelled: string }
}

export interface AgentActionHistoryItem {
	type: 'agent-action'
	action: 'thinking' | 'creating' | 'deleting' | 'updating' | 'schedule'
	status: 'progress' | 'done' | 'cancelled'
	info: string
}

export const ACTION_HISTORY_ITEM_DEFINITIONS: Record<
	AgentActionHistoryItem['action'],
	AgentActionDefinition
> = {
	thinking: {
		icon: <BrainIcon />,
		message: {
			progress: 'Thinking: ',
			done: 'Thought: ',
			cancelled: 'Thought: ',
		},
	},
	creating: {
		icon: <PencilIcon />,
		message: {
			progress: 'Creating: ',
			done: 'Created: ',
			cancelled: 'Creation cancelled: ',
		},
	},
	deleting: {
		icon: <TrashIcon />,
		message: {
			progress: 'Deleting: ',
			done: 'Deleted: ',
			cancelled: 'Deletion cancelled: ',
		},
	},
	updating: {
		icon: <RefreshIcon />,
		message: {
			progress: 'Updating: ',
			done: 'Updated: ',
			cancelled: 'Update cancelled: ',
		},
	},
	schedule: {
		icon: <SearchIcon />,
		message: {
			progress: 'Scheduling review: ',
			done: 'Review scheduled: ',
			cancelled: 'Review scheduling cancelled: ',
		},
	},
}
