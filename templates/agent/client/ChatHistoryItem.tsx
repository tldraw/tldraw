import { TLAiStreamingChange } from '@tldraw/ai'
import { useCallback, useEffect, useState } from 'react'
import {
	defaultColorNames,
	Editor,
	RecordsDiff,
	reverseRecordsDiff,
	TLRecord,
	TLShape,
	TLShapeId,
	toRichText,
} from 'tldraw'
import { $chatHistoryItems } from './ChatHistory'
import { BrainIcon } from './icons/BrainIcon'
import { PencilIcon } from './icons/PencilIcon'
import { RefreshIcon } from './icons/RefreshIcon'
import { SearchIcon } from './icons/SearchIcon'
import { TrashIcon } from './icons/TrashIcon'
import TldrawViewer from './TldrawViewer'

export type ChatHistoryItem =
	| UserMessageHistoryItem
	| AgentChangeHistoryItem
	| AgentChangeGroupHistoryItem
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
	diff: RecordsDiff<TLRecord>
	change: TLAiStreamingChange
	status: 'progress' | 'done' | 'cancelled'
	acceptance: 'accepted' | 'rejected' | 'pending'
}

export interface AgentChangeGroupHistoryItem {
	type: 'agent-change-group'
	items: AgentChangeHistoryItem[]
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentRawHistoryItem {
	type: 'agent-raw'
	change: TLAiStreamingChange
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentActionHistoryItem {
	type: 'agent-action'
	action: 'thinking' | 'creating' | 'deleting' | 'updating' | 'schedule'
	status: 'progress' | 'done' | 'cancelled'
	info: string
}

export function UserMessageHistoryItem({ item }: { item: UserMessageHistoryItem }) {
	return <div className="user-chat-message">{item.message}</div>
}

export function AgentMessageHistoryItem({ item }: { item: AgentMessageHistoryItem }) {
	return <div className="agent-chat-message">{item.message}</div>
}

function makeHighlightShape({
	shape,
	color,
}: {
	shape: TLShape
	color: (typeof defaultColorNames)[number]
}) {
	let opacity = 0.5
	const props = { ...shape.props }
	if ('color' in props) props.color = color
	if ('dash' in props) props.dash = 'solid'
	if ('scale' in props) {
		if (shape.type === 'text' || shape.type === 'note') {
			// Hack for injecting CSS to the shape
			// Probably legit ways to do this now
			if (color === 'light-green') {
				opacity = 0.51
			} else if (color === 'light-red') {
				opacity = 0.52
			} else if (color === 'light-blue') {
				opacity = 0.53
			}
		} else {
			if ('richText' in props) props.richText = toRichText('')
			props.scale = 4
		}
	}
	return {
		...shape,
		id: (shape.id + '-highlight') as TLShapeId,
		opacity,
		props,
	}
}

function getDiffShapesFromDiff({ diff }: { diff: RecordsDiff<TLRecord> }): TLShape[] {
	const diffShapes: TLShape[] = []

	for (const key in diff.removed) {
		const id = key as TLShapeId
		const shape = diff.removed[id]
		if (shape.typeName !== 'shape') continue
		const highlightShape = makeHighlightShape({ shape, color: 'light-red' })
		diffShapes.push(highlightShape)
		diffShapes.push(shape)
	}

	for (const key in diff.updated) {
		const id = key as TLShapeId
		const before = { ...diff.updated[id][0], id: (id + '-before') as TLShapeId }
		const after = diff.updated[id][1]
		if (before.typeName !== 'shape' || after.typeName !== 'shape') continue
		const highlightBeforeShape = makeHighlightShape({ shape: before, color: 'light-red' })
		const highlightAfterShape = makeHighlightShape({ shape: after, color: 'light-blue' })
		diffShapes.push(highlightBeforeShape)
		diffShapes.push(before)
		diffShapes.push(highlightAfterShape)
		diffShapes.push(after)
	}

	for (const key in diff.added) {
		const id = key as TLShapeId
		const shape = diff.added[id]
		if (shape.typeName !== 'shape') continue
		const highlightShape = makeHighlightShape({ shape, color: 'light-green' })
		diffShapes.push(highlightShape)
		diffShapes.push(shape)
	}

	return diffShapes
}

export function AgentChangeHistoryItems({
	items,
	editor,
}: {
	items: AgentChangeHistoryItem[]
	editor: Editor
}) {
	const diffShapes = items.map((item) => getDiffShapesFromDiff({ diff: item.diff })).flat()

	const handleAccept = useCallback(() => {
		$chatHistoryItems.update((oldItems) => {
			const newItems = [...oldItems]
			for (const item of items) {
				const index = newItems.findIndex((v) => v === item)
				if (index !== -1) {
					newItems[index] = { ...item, acceptance: 'accepted', status: 'done' }
				}
			}
			return newItems
		})
	}, [items])

	const handleReject = useCallback(() => {
		$chatHistoryItems.update((oldItems) => {
			const newItems = [...oldItems]
			for (const item of items) {
				const index = newItems.findIndex((v) => v === item)
				if (index !== -1) {
					newItems[index] = { ...item, acceptance: 'rejected', status: 'done' }
				}
				const reverseDiff = reverseRecordsDiff(item.diff)
				editor.store.applyDiff(reverseDiff)
			}
			return newItems
		})
	}, [items, editor])

	const acceptance: AgentChangeHistoryItem['acceptance'] = items[0].acceptance
	const acceptanceConsensus = items.every((item) => item.acceptance === acceptance)

	return (
		<div className="agent-change-message">
			<div className="agent-change-message-actions">
				{!acceptanceConsensus ? (
					<span className="agent-change-message-acceptance-notice">Error</span>
				) : acceptance === 'pending' ? (
					<>
						<button onClick={handleReject}>Reject</button>
						<button onClick={handleAccept}>Accept</button>
					</>
				) : (
					<span className="agent-change-message-acceptance-notice">
						{acceptance === 'accepted' ? '✅' : '❌'}
					</span>
				)}
			</div>
			<TldrawViewer shapes={diffShapes} />
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
		if ((item.status === 'done' || item.status === 'cancelled') && !endTime) {
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
			<p className="status-thinking-message-text">
				Thinking for {secondsElapsed}s {item.status === 'cancelled' ? '(cancelled)' : ''}
			</p>
		</div>
	)
}

export function AgentRawHistoryItem({ item }: { item: AgentRawHistoryItem }) {
	return null
	const values = Object.entries(item.change).map(([key, value]) => {
		if (key === 'type' || key === 'complete') return null
		if (typeof value === 'object') return JSON.stringify(value, null, 2)
		return value
	})
	return (
		<div className="agent-raw-message">
			{item.status === 'cancelled' ? 'Cancelled' : values.join('\n')}
		</div>
	)
}

export interface AgentActionDefinition {
	icon: React.ReactNode
	message: { progress: string; done: string; cancelled: string }
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
