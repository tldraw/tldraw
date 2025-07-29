import { TLAiChange } from '@tldraw/ai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	defaultColorNames,
	Editor,
	RecordsDiff,
	reverseRecordsDiff,
	TLRecord,
	TLShape,
	TLShapeId,
} from 'tldraw'
import { Streaming, TLAgentChange } from './AgentChange'
import { $chatHistoryItems } from './ChatHistory'
import { CONTEXT_TYPE_DEFINITIONS, ContextItem, roundBox } from './Context'
import { BrainIcon } from './icons/BrainIcon'
import { CrossIcon } from './icons/CrossIcon'
import { EyeIcon } from './icons/EyeIcon'
import { PencilIcon } from './icons/PencilIcon'
import { RefreshIcon } from './icons/RefreshIcon'
import { SearchIcon } from './icons/SearchIcon'
import { TickIcon } from './icons/TickIcon'
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
	contextItems: ContextItem[]
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
	change: TLAiChange
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
	change: Streaming<TLAgentChange>
	status: 'progress' | 'done' | 'cancelled'
}

export interface AgentActionHistoryItem {
	type: 'agent-action'
	action: 'thinking' | 'creating' | 'deleting' | 'updating' | 'schedule' | 'setMyView'
	status: 'progress' | 'done' | 'cancelled'
	info: string
}

export function UserMessageHistoryItem({ item }: { item: UserMessageHistoryItem }) {
	const contextAttachments = item.contextItems.filter((item) => item.type === 'area')
	return (
		<div>
			<div className="user-message-context-attachments">
				{contextAttachments.map((contextItem, i) => {
					const { x, y, w, h } = roundBox(contextItem.bounds)
					return <div key={'context-attachment-' + i}>{`x: ${x}, y: ${y}, w: ${w}, h: ${h}`}</div>
				})}
			</div>
			<div className="user-message">
				{item.contextItems.length > 0 && (
					<div className="user-message-context-items">
						{item.contextItems.map((contextItem, i) => {
							return <UserMessageContextItem key={'context-item-' + i} contextItem={contextItem} />
						})}
					</div>
				)}
				{item.message}
			</div>
		</div>
	)
}

function UserMessageContextItem({ contextItem }: { contextItem: ContextItem }) {
	const contextTypeDefinition = CONTEXT_TYPE_DEFINITIONS[contextItem.type]
	const icon = contextTypeDefinition.icon(contextItem)
	const name = contextTypeDefinition.name(contextItem)
	return (
		<div className="context-item-preview">
			{icon} {name}
		</div>
	)
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

	if (color === 'light-green') {
		opacity = 0.51
	} else if (color === 'light-red') {
		opacity = 0.52
	} else if (color === 'light-blue') {
		opacity = 0.53
	}
	if ('dash' in props) props.dash = 'solid'
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

		if ('dash' in shape.props) {
			diffShapes.push({ ...shape, props: { ...shape.props, dash: 'solid' } })
		} else {
			diffShapes.push(shape)
		}
	}

	for (const key in diff.updated) {
		const id = key as TLShapeId
		const before = { ...diff.updated[id][0], id: (id + '-before') as TLShapeId }
		const after = diff.updated[id][1]
		if (before.typeName !== 'shape' || after.typeName !== 'shape') continue
		const highlightAfterShape = makeHighlightShape({ shape: after, color: 'light-blue' })
		before.opacity = 0.5
		before.props = { ...before.props }
		if ('dash' in before.props) {
			before.props.dash = 'dashed'
			diffShapes.push(before)
		}
		if ('fill' in before.props) {
			before.props.fill = 'none'
		}
		diffShapes.push(before)
		diffShapes.push(highlightAfterShape)
		if ('dash' in after.props) {
			diffShapes.push({ ...after, props: { ...after.props, dash: 'solid' } })
		} else {
			diffShapes.push(after)
		}
	}

	for (const key in diff.added) {
		const id = key as TLShapeId
		const shape = diff.added[id]
		if (shape.typeName !== 'shape') continue
		const highlightShape = makeHighlightShape({ shape, color: 'light-green' })
		diffShapes.push(highlightShape)

		if ('dash' in shape.props) {
			diffShapes.push({ ...shape, props: { ...shape.props, dash: 'solid' } })
		} else {
			diffShapes.push(shape)
		}
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
					// If the item was previously rejected, we need to re-apply the original diff
					if (item.acceptance === 'rejected') {
						editor.store.applyDiff(item.diff)
					}
					newItems[index] = { ...item, acceptance: 'accepted', status: 'done' }
				}
			}
			return newItems
		})
	}, [items, editor])

	const handleReject = useCallback(() => {
		$chatHistoryItems.update((oldItems) => {
			const newItems = [...oldItems]
			for (const item of items) {
				const index = newItems.findIndex((v) => v === item)
				if (index !== -1) {
					newItems[index] = { ...item, acceptance: 'rejected', status: 'done' }
				}
				// Only apply reverse diff if the item wasn't already rejected
				if (item.acceptance !== 'rejected') {
					const reverseDiff = reverseRecordsDiff(item.diff)
					editor.store.applyDiff(reverseDiff)
				}
			}
			return newItems
		})
	}, [items, editor])

	const acceptance = useMemo<AgentChangeHistoryItem['acceptance']>(
		() => items[0].acceptance,
		[items]
	)
	const acceptanceConsensus = useMemo(
		() => items.every((item) => item.acceptance === acceptance),
		[items, acceptance]
	)

	return (
		<div className="agent-change-message">
			<div className="agent-change-message-actions">
				{!acceptanceConsensus ? (
					<span className="agent-change-message-acceptance-notice">Error</span>
				) : (
					<>
						<button onClick={handleReject}>
							{acceptance === 'rejected' && <CrossIcon />}
							<p>Reject{acceptance === 'rejected' && 'ed'}</p>
						</button>
						<button onClick={handleAccept}>
							{acceptance === 'accepted' && <TickIcon />}
							<p>Accept{acceptance === 'accepted' && 'ed'}</p>
						</button>
					</>
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
			cancelled: 'Thought cancelled. ',
		},
	},
	creating: {
		icon: <PencilIcon />,
		message: {
			progress: 'Creating: ',
			done: 'Created: ',
			cancelled: 'Creation cancelled. ',
		},
	},
	deleting: {
		icon: <TrashIcon />,
		message: {
			progress: 'Deleting: ',
			done: 'Deleted: ',
			cancelled: 'Deletion cancelled. ',
		},
	},
	updating: {
		icon: <RefreshIcon />,
		message: {
			progress: 'Updating: ',
			done: 'Updated: ',
			cancelled: 'Update cancelled. ',
		},
	},
	schedule: {
		icon: <SearchIcon />,
		message: {
			progress: 'Scheduling: ',
			done: 'Scheduled: ',
			cancelled: 'Scheduling cancelled. ',
		},
	},
	setMyView: {
		icon: <EyeIcon />,
		message: {
			progress: 'Setting my view: ',
			done: 'Set my view: ',
			cancelled: 'Setting my view cancelled. ',
		},
	},
}
