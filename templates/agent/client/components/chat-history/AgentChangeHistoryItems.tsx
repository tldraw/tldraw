import { forwardRef, useCallback, useMemo } from 'react'
import {
	DefaultShapeWrapper,
	Editor,
	RecordsDiff,
	reverseRecordsDiff,
	TLRecord,
	TLShape,
	TLShapeId,
	TLShapeWrapperProps,
} from 'tldraw'
import { $chatHistoryItems } from '../../atoms/chatHistoryItems'
import { AGENT_CHANGE_TYPE_DEFINITIONS, AgentChangeHistoryItem } from '../../types/ChatHistoryItem'
import TldrawViewer from './TldrawViewer'

// The model returns changes individually, but we group them together in this component for UX reasons, namely so the user can see all changes done at once together, and so they can accept or reject them all at once
export function AgentChangeHistoryItems({
	items: itemsInAgentChangeGroup,
	editor,
}: {
	items: AgentChangeHistoryItem[]
	editor: Editor
}) {
	const diffShapes = itemsInAgentChangeGroup.flatMap((item) =>
		getDiffShapesFromDiff({ diff: item.diff })
	)

	// Because we accept and reject changes as groups, when the changes represented by this group are accepted (or rejected), we need to go through each item in the group and update its acceptance status individually
	const handleAccept = useCallback(() => {
		$chatHistoryItems.update((currentChatHistoryItems) => {
			const newItems = [...currentChatHistoryItems]
			for (const item of itemsInAgentChangeGroup) {
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
	}, [itemsInAgentChangeGroup, editor])

	const handleReject = useCallback(() => {
		$chatHistoryItems.update((currentChatHistoryItems) => {
			const newItems = [...currentChatHistoryItems]
			for (const item of itemsInAgentChangeGroup) {
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
	}, [itemsInAgentChangeGroup, editor])

	const acceptance = useMemo<AgentChangeHistoryItem['acceptance']>(
		() => itemsInAgentChangeGroup[0].acceptance,
		[itemsInAgentChangeGroup]
	)
	const acceptanceConsensus = useMemo(
		() => itemsInAgentChangeGroup.every((item) => item.acceptance === acceptance),
		[itemsInAgentChangeGroup, acceptance]
	)

	return (
		<div className="agent-change-message">
			<div className="agent-change-message-actions">
				{!acceptanceConsensus ? (
					<span className="agent-change-message-acceptance-notice">Error</span>
				) : (
					<>
						<button onClick={handleReject} disabled={acceptance === 'rejected'}>
							<p>{acceptance === 'rejected' ? 'Rejected' : 'Reject'}</p>
						</button>
						<button onClick={handleAccept} disabled={acceptance === 'accepted'}>
							<p>{acceptance === 'accepted' ? 'Accepted' : 'Accept'}</p>
						</button>
					</>
				)}
			</div>

			<ChangeIntents items={itemsInAgentChangeGroup} />
			<TldrawViewer shapes={diffShapes} components={{ ShapeWrapper: DiffShapeWrapper }} />
		</div>
	)
}

function ChangeIntents({ items }: { items: AgentChangeHistoryItem[] }) {
	let previousIntentMessage = ''
	return (
		<div className="agent-change-message-intent">
			{items.map((item, i) => {
				const change = item.change
				const definition = AGENT_CHANGE_TYPE_DEFINITIONS[change.type]
				if (!definition) return null
				const icon = definition.icon
				let intent = ''
				if ('intent' in change) {
					intent = change.intent
				} else if ('description' in change) {
					intent = change.description
				}
				if (intent === previousIntentMessage) return null
				previousIntentMessage = intent
				return (
					<div className="agent-change-message-intent-item" key={'intent-' + i}>
						<span className="agent-change-message-intent-item-icon">{icon}</span> {intent}
					</div>
				)
			})}
		</div>
	)
}

function getDiffShapesFromDiff({ diff }: { diff: RecordsDiff<TLRecord> }): TLShape[] {
	const diffShapes: TLShape[] = []

	for (const key in diff.removed) {
		const id = key as TLShapeId
		const prevShape = diff.removed[id]
		if (prevShape.typeName !== 'shape') continue
		const shape = {
			...prevShape,
			props: { ...prevShape.props },
			meta: { ...prevShape.meta, changeType: 'delete' },
		}

		if ('dash' in shape.props) {
			shape.props.dash = 'solid'
		}

		diffShapes.push(shape)
	}

	for (const key in diff.updated) {
		const id = key as TLShapeId

		const prevBefore = diff.updated[id][0]
		const prevAfter = diff.updated[id][1]
		if (prevBefore.typeName !== 'shape' || prevAfter.typeName !== 'shape') continue

		const before = {
			...prevBefore,
			id: (id + '-before') as TLShapeId,
			opacity: prevAfter.opacity / 2,
			props: { ...prevBefore.props },
			meta: { ...prevBefore.meta, changeType: 'update-before' },
		}
		const after = {
			...prevAfter,
			props: { ...prevAfter.props },
			meta: { ...prevAfter.meta, changeType: 'update-after' },
		}

		if ('dash' in before.props) {
			before.props.dash = 'dashed'
		}
		if ('fill' in before.props) {
			before.props.fill = 'none'
		}
		if ('dash' in after.props) {
			after.props.dash = 'solid'
		}

		diffShapes.push(before)
		diffShapes.push(after)
	}

	for (const key in diff.added) {
		const id = key as TLShapeId
		const prevShape = diff.added[id]
		if (prevShape.typeName !== 'shape') continue
		const shape = {
			...prevShape,
			props: { ...prevShape.props },
			meta: { ...prevShape.meta, changeType: 'create' },
		}
		if ('dash' in shape.props) {
			shape.props.dash = 'solid'
		}
		diffShapes.push(shape)
	}

	return diffShapes
}

const DiffShapeWrapper = forwardRef(function DiffShapeWrapper(
	{ children, shape, isBackground }: TLShapeWrapperProps,
	ref: React.Ref<HTMLDivElement>
) {
	const changeType = shape.meta.changeType

	return (
		<DefaultShapeWrapper
			ref={ref}
			shape={shape}
			isBackground={isBackground}
			className={changeType ? 'diff-shape-' + changeType : undefined}
		>
			{children}
		</DefaultShapeWrapper>
	)
})
