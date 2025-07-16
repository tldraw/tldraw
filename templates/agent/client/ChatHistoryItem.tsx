import { TLAiStreamingChange } from '@tldraw/ai'
import { useEffect, useState } from 'react'
import { defaultColorNames, Editor, TLShape, TLShapeId, toRichText } from 'tldraw'
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
	changes: (TLAiStreamingChange & { shape?: Partial<TLShape>; previousShape?: Partial<TLShape> })[]
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
			props.scale = 6
		}
	}
	return {
		...shape,
		id: (shape.id + '-highlight') as TLShapeId,
		opacity,
		props,
	}
}

function getDiffShapesFromChange({
	change,
	editor,
}: {
	change: TLAiStreamingChange & { shape?: Partial<TLShape>; previousShape?: Partial<TLShape> }
	editor: Editor
}): TLShape[] {
	switch (change.type) {
		case 'createShape': {
			const shape = getCompleteShapeFromStreamingShape({ shape: change.shape, editor })
			if (shape) {
				const highlightShape = makeHighlightShape({ shape, color: 'light-green' })
				return [highlightShape, shape]
			}
			return []
		}
		case 'updateShape': {
			const shape = getCompleteShapeFromStreamingShape({ shape: change.shape, editor })
			const previousShape = {
				...getCompleteShapeFromStreamingShape({
					shape: change.previousShape,
					editor,
				}),
				id: (change.previousShape?.id + '-previous') as TLShapeId,
			} as TLShape

			if (shape) {
				const highlightShape = makeHighlightShape({ shape, color: 'light-blue' })
				if (previousShape) {
					const previousHighlightShape = makeHighlightShape({
						shape: previousShape,
						color: 'light-red',
					})
					return [previousHighlightShape, previousShape, highlightShape, shape]
				}
				return [highlightShape, shape]
			}
			return []
		}
		case 'deleteShape': {
			const shape = getCompleteShapeFromStreamingShape({ shape: change.shape, editor })
			if (shape) {
				const highlightShape = makeHighlightShape({ shape, color: 'light-red' })
				return [highlightShape, shape]
			}
			return []
		}
		default: {
			return []
		}
	}
}

export function AgentChangeHistoryItem({
	item,
	editor,
}: {
	item: AgentChangeHistoryItem
	editor: Editor
}) {
	const diffShapes = item.changes
		.map((change) => getDiffShapesFromChange({ change, editor }))
		.flat()

	if (diffShapes.length === 0) return null

	return (
		<div className="agent-change-message">
			{/* <div>{item.changes[0]?.description}</div> */}
			{diffShapes && <TldrawViewer shapes={diffShapes} />}
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
