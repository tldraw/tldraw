import { TLAiStreamingChange } from '@tldraw/ai'
import { useEffect, useState } from 'react'
import { Editor } from 'tldraw'

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
	change: TLAiStreamingChange
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

export function AgentChangeHistoryItem({
	item,
	editor,
}: {
	item: AgentChangeHistoryItem
	editor: Editor
}) {
	// Hardcoded to only support a single create shape change for now
	// TODO: Support other change types
	// TODO: Support multiple changes grouped together
	const [svgElement, setSvgElement] = useState<Blob | null>(null)

	useEffect(() => {
		if (!item.change.complete) return
		if (item.change.type !== 'createShape') return
		// editor.toImage([item.change.shape.id], { format: 'svg' }).then((svgResult) => {
		// 	if (!svgResult) return
		// 	setSvgElement(svgResult.blob)
		// })
	}, [item.change, editor])

	if (item.change.type !== 'createShape') return null

	return (
		<div className="agent-change-message">
			<div>{item.change.description}</div>
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
	const [dots, setDots] = useState('')

	useEffect(() => {
		const interval = setInterval(() => {
			setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
		}, 500)

		return () => clearInterval(interval)
	}, [])
	return (
		<div className="agent-chat-message status-thinking-message">
			<p className="status-thinking-message-text">
				{item.status === 'done' ? 'Response' : item.message + dots}
			</p>
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
	icon: string
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
		icon: '🧠',
		message: {
			progress: 'Thinking: ',
			done: 'Thought: ',
			cancelled: 'Thought: ',
		},
	},
	creating: {
		icon: '✏️',
		message: {
			progress: 'Creating: ',
			done: 'Created: ',
			cancelled: 'Creation cancelled: ',
		},
	},
	deleting: {
		icon: '🗑️',
		message: {
			progress: 'Deleting: ',
			done: 'Deleted: ',
			cancelled: 'Deletion cancelled: ',
		},
	},
	updating: {
		icon: '🔄',
		message: {
			progress: 'Updating: ',
			done: 'Updated: ',
			cancelled: 'Update cancelled: ',
		},
	},
	schedule: {
		icon: '🔍',
		message: {
			progress: 'Scheduling review: ',
			done: 'Review scheduled: ',
			cancelled: 'Review scheduling cancelled: ',
		},
	},
}
