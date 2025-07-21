import { useEffect, useRef } from 'react'
import {
	atom,
	Editor,
	ExecutionQueue,
	isEqual,
	RecordsDiff,
	TLRecord,
	TLShapeId,
	useComputed,
	useReactor,
	useValue,
} from 'tldraw'
import {
	AgentActionHistoryItem,
	AgentChangeGroupHistoryItem,
	AgentChangeHistoryItems,
	AgentMessageHistoryItem,
	AgentRawHistoryItem,
	ChatHistoryItem,
	StatusThinkingHistoryItem,
	UserMessageHistoryItem,
} from './ChatHistoryItem'
import { useTakeSnapshot } from './ShapesSnapshot'

export const $chatHistoryItems = atom<ChatHistoryItem[]>('chatHistoryItems', [])

export function ChatHistory({ editor }: { editor: Editor }) {
	const $mergedItems = useComputed(
		'mergedItems',
		() => getChatHistoryWithMergedAdjacentItems({ items: $chatHistoryItems.get() }),
		{ isEqual },
		[$chatHistoryItems]
	)
	const mergedItems = useValue($mergedItems)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const previousScrollDistanceFromBottomRef = useRef(0)

	useEffect(() => {
		const localHistoryItems = localStorage.getItem('chat-history-items')
		if (localHistoryItems) {
			try {
				$chatHistoryItems.set(JSON.parse(localHistoryItems))
			} catch (e) {
				console.error(e)
			}
		}
	}, [])

	useReactor(
		'stash locally',
		() => {
			localStorage.setItem('chat-history-items', JSON.stringify($chatHistoryItems.get()))
		},
		[$chatHistoryItems]
	)

	useEffect(() => {
		if (!scrollContainerRef.current) return
		const scrollDistanceFromBottom = previousScrollDistanceFromBottomRef.current
		if (scrollDistanceFromBottom < 5) {
			scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
			previousScrollDistanceFromBottomRef.current = 0
		}
	}, [mergedItems])

	const handleScroll = () => {
		if (!scrollContainerRef.current) return
		const scrollDistanceFromBottom =
			scrollContainerRef.current.scrollHeight -
			scrollContainerRef.current.scrollTop -
			scrollContainerRef.current.clientHeight
		previousScrollDistanceFromBottomRef.current = scrollDistanceFromBottom
	}

	const takeSnapshot = useTakeSnapshot()

	useEffect(() => {
		const queue = new ExecutionQueue()
		for (const item of mergedItems) {
			if (item.type === 'agent-change' && item.status === 'done') {
				console.log('pushing 1')
				queue.push(async () => {
					const shapeIds = getAffectedShapeIds(new Set(), item.diff)
					const snapshot = await takeSnapshot({ ids: Array.from(shapeIds) })
					console.log('took snapshot 1', snapshot)
					if (snapshot) {
						$chatHistoryItems.update((oldItems) =>
							oldItems.map((v) => (v.id === item.id ? { ...v, snapshot } : v))
						)
					}
				})
			}
			if (
				item.type === 'agent-change-group' &&
				item.status === 'done' &&
				!item.items.at(-1)?.snapshot
			) {
				console.log('pushing 2')
				const id = item.items.at(-1)!.id
				queue.push(async () => {
					console.log('pushing (2)', item.items.at(-1)!.id)
					const shapeIds = new Set<TLShapeId>()
					for (const { diff } of item.items) {
						getAffectedShapeIds(shapeIds, diff)
					}
					console.log('shapeIds 2', shapeIds)
					const snapshot = await takeSnapshot({ ids: Array.from(shapeIds) })
					console.log('took snapshot 2', snapshot)
					if (snapshot) {
						$chatHistoryItems.update((oldItems) =>
							oldItems.map((v) => (v.id === id ? { ...v, snapshot } : v))
						)
					}
				})
			}
		}
	}, [mergedItems, takeSnapshot])

	console.log(mergedItems)

	return (
		<div className="chat-history" ref={scrollContainerRef} onScroll={handleScroll}>
			{mergedItems.map((item, index) => {
				switch (item.type) {
					case 'user-message':
						return <UserMessageHistoryItem key={index} item={item} />
					case 'status-thinking':
						return <StatusThinkingHistoryItem key={index} item={item} />
					case 'agent-message':
						return <AgentMessageHistoryItem key={index} item={item} />
					case 'agent-change':
						return <AgentChangeHistoryItems key={index} items={[item]} editor={editor} />
					case 'agent-action':
						return <AgentActionHistoryItem key={index} item={item} />
					case 'agent-raw':
						return <AgentRawHistoryItem key={index} item={item} />
					case 'agent-change-group':
						return <AgentChangeHistoryItems key={index} items={item.items} editor={editor} />
				}
			})}
		</div>
	)
}
function getAffectedShapeIds(shapeIds: Set<TLShapeId>, diff: RecordsDiff<TLRecord>) {
	for (const key in diff.added) {
		shapeIds.add(key as TLShapeId)
	}
	for (const key in diff.updated) {
		shapeIds.add(key as TLShapeId)
	}
	return shapeIds
}

function getChatHistoryWithMergedAdjacentItems({
	items,
}: {
	items: ChatHistoryItem[]
}): ChatHistoryItem[] {
	const newItems: ChatHistoryItem[] = []
	for (let i = 0; i < items.length; i++) {
		const currentItem = newItems[newItems.length - 1]
		const nextItem = items[i]
		if (!currentItem) {
			newItems.push(nextItem)
			continue
		}

		// Merge together pending diffs
		if (
			currentItem.type === 'agent-change' &&
			nextItem.type === 'agent-change' &&
			nextItem.acceptance === currentItem.acceptance
		) {
			const mergedItem: AgentChangeGroupHistoryItem = {
				id: currentItem.id + ':' + nextItem.id,
				type: 'agent-change-group',
				items: [currentItem, nextItem],
				status: nextItem.status,
			}
			newItems[newItems.length - 1] = mergedItem
			continue
		}

		if (currentItem.type === 'agent-change-group' && nextItem.type === 'agent-change') {
			const mergedItem: AgentChangeGroupHistoryItem = {
				id: currentItem.items[0].id + ':' + nextItem.id,
				type: 'agent-change-group',
				items: [...currentItem.items, nextItem],
				status: nextItem.status,
			}
			newItems[newItems.length - 1] = mergedItem
			continue
		}

		newItems.push(nextItem)
	}

	return newItems
}
