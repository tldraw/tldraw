import { Editor, isRecordsDiffEmpty } from 'tldraw'
import { IChatHistoryActionItem } from '../../../shared/types/ChatHistoryItem'
import { TLAgent } from '../../ai/useTldrawAgent'
import { ChatHistoryGroupWithDiff } from './ChatHistoryGroupWithDiff'
import { ChatHistoryGroupWithoutDiff } from './ChatHistoryGroupWithoutDiff'

export interface IChatHistoryGroup {
	items: IChatHistoryActionItem[]
	withDiff: boolean
}

export function ChatHistoryGroup({
	group,
	editor,
	agent,
}: {
	group: IChatHistoryGroup
	editor: Editor
	agent: TLAgent
}) {
	if (group.withDiff) {
		return <ChatHistoryGroupWithDiff group={group} agent={agent} editor={editor} />
	}

	return <ChatHistoryGroupWithoutDiff group={group} agent={agent} />
}

/**
 * Merge adjacent actions into groups where possible.
 */
export function getActionHistoryGroups(
	items: IChatHistoryActionItem[],
	agent: TLAgent
): IChatHistoryGroup[] {
	const groups: IChatHistoryGroup[] = []

	for (const item of items) {
		const actionUtil = agent.getActionUtil(item.action._type)
		const description = actionUtil.getDescription(item.action)
		if (description === null) {
			continue
		}

		const group = groups[groups.length - 1]
		if (group && canActionBeGrouped({ item, group, agent })) {
			group.items.push(item)
		} else {
			groups.push({
				items: [item],
				withDiff: !isRecordsDiffEmpty(item.diff) && item.action.complete,
			})
		}
	}

	return groups
}

/**
 * Check if an action can be merged with a group.
 */
export function canActionBeGrouped({
	item,
	group,
	agent,
}: {
	item: IChatHistoryActionItem
	group: IChatHistoryGroup
	agent: TLAgent
}) {
	if (!item.action.complete) return false
	if (!group) return false

	const showDiff = !isRecordsDiffEmpty(item.diff)
	if (showDiff !== group.withDiff) return false

	const groupAcceptance = group.items[0]?.acceptance
	if (groupAcceptance !== item.acceptance) return false

	const prevEvent = group.items.at(-1)?.action
	const prevActionUtil = prevEvent ? agent.getActionUtil(prevEvent._type) : null
	const actionUtil = agent.getActionUtil(item.action._type)
	if (
		prevEvent &&
		prevActionUtil &&
		actionUtil.canGroup(item.action, prevEvent) &&
		prevActionUtil.canGroup(prevEvent, item.action)
	) {
		return true
	}

	return false
}
