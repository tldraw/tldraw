import { isRecordsDiffEmpty } from 'tldraw'
import { IChatHistoryActionItem } from '../../../shared/types/ChatHistoryItem'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { ChatHistoryGroupWithDiff } from './ChatHistoryGroupWithDiff'
import { ChatHistoryGroupWithoutDiff } from './ChatHistoryGroupWithoutDiff'
import { getActionInfo } from './getActionInfo'

export interface IChatHistoryGroup {
	items: IChatHistoryActionItem[]
	withDiff: boolean
}

export function ChatHistoryGroup({
	group,
	agent,
}: {
	group: IChatHistoryGroup
	agent: TldrawAgent
}) {
	if (group.withDiff) {
		return <ChatHistoryGroupWithDiff group={group} agent={agent} />
	}

	return <ChatHistoryGroupWithoutDiff group={group} agent={agent} />
}

/**
 * Merge adjacent actions into groups where possible.
 */
export function getActionHistoryGroups(
	items: IChatHistoryActionItem[],
	agent: TldrawAgent
): IChatHistoryGroup[] {
	const groups: IChatHistoryGroup[] = []

	for (const item of items) {
		const { description } = getActionInfo(item.action, agent)
		if (description === null) {
			continue
		}

		const group = groups[groups.length - 1]
		if (group && canActionBeGrouped({ item, group, agent })) {
			group.items.push(item)
		} else {
			groups.push({
				items: [item],
				withDiff: !isRecordsDiffEmpty(item.result.diff) && item.action.complete,
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
	agent: TldrawAgent
}) {
	if (!item.action.complete) return false
	if (!group) return false

	const showDiff = !isRecordsDiffEmpty(item.result.diff)
	if (showDiff !== group.withDiff) return false

	const groupAcceptance = group.items[0]?.acceptance
	if (groupAcceptance !== item.acceptance) return false

	const prevAction = group.items.at(-1)?.action
	if (!prevAction) return false

	const actionInfo = getActionInfo(item.action, agent)
	const prevActionInfo = getActionInfo(prevAction, agent)

	if (actionInfo.canGroup(prevAction) && prevActionInfo.canGroup(item.action)) {
		return true
	}

	return false
}
