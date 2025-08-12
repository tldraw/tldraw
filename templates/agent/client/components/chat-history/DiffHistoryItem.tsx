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
import { TLAgent } from '../../ai/useAgent'
import { $chatHistoryItems } from '../../atoms/chatHistoryItems'
import { ChangeHistoryItem } from './AgentHistoryItem'
import { AgentIcon, AgentIconType } from './AgentIcon'
import TldrawViewer from './TldrawViewer'

// The model returns changes individually, but we group them together in this component for UX reasons, namely so the user can see all changes done at once together, and so they can accept or reject them all at once
export function DiffHistoryItem({
	items: itemsInGroup,
	editor,
	agent,
}: {
	items: ChangeHistoryItem[]
	editor: Editor
	agent: TLAgent
}) {
	const diffShapes = itemsInGroup.flatMap((item) => getDiffShapesFromDiff({ diff: item.diff }))

	// Because we accept and reject changes as groups, when the changes represented by this group are accepted (or rejected), we need to go through each item in the group and update its acceptance status individually
	const handleAccept = useCallback(() => {
		$chatHistoryItems.update((currentChatHistoryItems) => {
			const newItems = [...currentChatHistoryItems]
			for (const item of itemsInGroup) {
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
	}, [itemsInGroup, editor])

	const handleReject = useCallback(() => {
		$chatHistoryItems.update((currentChatHistoryItems) => {
			const newItems = [...currentChatHistoryItems]
			for (const item of itemsInGroup) {
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
	}, [itemsInGroup, editor])

	const acceptance = useMemo<ChangeHistoryItem['acceptance']>(
		() => itemsInGroup[0].acceptance,
		[itemsInGroup]
	)
	const acceptanceConsensus = useMemo(
		() => itemsInGroup.every((item) => item.acceptance === acceptance),
		[itemsInGroup, acceptance]
	)

	const steps = useMemo(() => {
		return itemsInGroup.map((item) => {
			const { event } = item
			const eventUtil = agent.getEventUtil(event._type)
			return {
				icon: eventUtil.getIcon(event),
				label: eventUtil.getLabel(event, item.status),
				description: eventUtil.getDescription(event, item.status),
			}
		})
	}, [itemsInGroup, agent])

	return (
		<div className="agent-change-message">
			<div className="agent-change-message-actions">
				{!acceptanceConsensus ? (
					<span className="agent-change-message-acceptance-notice">Error</span>
				) : (
					<>
						<button onClick={handleReject} disabled={acceptance === 'rejected'}>
							{acceptance === 'rejected' ? 'Rejected' : 'Reject'}
						</button>
						<button onClick={handleAccept} disabled={acceptance === 'accepted'}>
							{acceptance === 'accepted' ? 'Accepted' : 'Accept'}
						</button>
					</>
				)}
			</div>
			<DiffSteps steps={steps} />
			{diffShapes.length > 0 && (
				<TldrawViewer shapes={diffShapes} components={{ ShapeWrapper: DiffShapeWrapper }} />
			)}
		</div>
	)
}

interface DiffStep {
	icon: AgentIconType | null
	label: string | null
	description: string | null
}
function DiffSteps({ steps }: { steps: DiffStep[] }) {
	let previousDescription = ''
	return (
		<div className="agent-change-message-intent">
			{steps.map((step, i) => {
				if (!step.description) return null

				// Don't show duplicate intents
				if (step.description === previousDescription) return null
				previousDescription = step.description
				return (
					<div className="agent-change-message-intent-item" key={'intent-' + i}>
						{step.icon && (
							<span className="agent-change-message-intent-item-icon">
								<AgentIcon type={step.icon} />
							</span>
						)}
						{step.description}
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
