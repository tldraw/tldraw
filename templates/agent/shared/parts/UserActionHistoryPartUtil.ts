import { isEqual, RecordsDiff, squashRecordDiffs, TLRecord, TLShape } from 'tldraw'
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { removeShapeIdPrefix } from '../AgentTransform'
import { convertTldrawShapeToSimpleShape, ISimpleShape } from '../format/SimpleShape'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface UserActionHistoryPart extends BasePromptPart<'userActionHistory'> {
	history: UserActionHistory
}

interface UserActionHistory {
	updates: Array<{
		before: { id: string; _type: string; [key: string]: any }
		after: { id: string; _type: string; [key: string]: any }
	}>
	deletes: string[]
	creates: string[]
}

export class UserActionHistoryPartUtil extends PromptPartUtil<UserActionHistoryPart> {
	static override type = 'userActionHistory' as const

	override getPriority() {
		return 40
	}

	override getPart(request: AgentRequest, agent: TldrawAgent): UserActionHistoryPart {
		const { editor } = agent
		const rawStoreDiffs = agent.$documentChanges.get()
		if (rawStoreDiffs.length === 0) {
			return { type: 'userActionHistory', history: { updates: [], deletes: [], creates: [] } }
		}

		// Get the agent's diffs from the chat history
		const agentActionDiffs = this.getAgentDiffs(agent.$chatHistoryItems.get())

		const userActionDiffs = rawStoreDiffs.filter(
			(diff) => !agentActionDiffs.some((agentDiff) => isEqual(diff, agentDiff))
		)

		const squashedUserActionDiff = squashRecordDiffs(userActionDiffs)

		const updates: Array<{
			before: { id: string; _type: string; [key: string]: any }
			after: { id: string; _type: string; [key: string]: any }
		}> = []
		const deletes: string[] = []
		const creates: string[] = []

		// Handle created shapes
		Object.values(squashedUserActionDiff.added)
			.filter((record) => record.typeName === 'shape')
			.forEach((record) => {
				const shape = record as TLShape
				creates.push(removeShapeIdPrefix(shape.id))
			})

		// Handle updated shapes
		Object.values(squashedUserActionDiff.updated)
			.filter(
				(pair) =>
					Array.isArray(pair) && pair[0].typeName === 'shape' && pair[1].typeName === 'shape'
			)
			.forEach((pair) => {
				const [from, to] = pair
				const fromShape = from as TLShape
				const toShape = to as TLShape

				const beforeSimple = convertTldrawShapeToSimpleShape(fromShape, editor)
				const afterSimple = convertTldrawShapeToSimpleShape(toShape, editor)

				// Only include changed fields
				const before = { id: removeShapeIdPrefix(fromShape.id), _type: beforeSimple._type }
				const after = { id: removeShapeIdPrefix(toShape.id), _type: afterSimple._type }

				// Add only the fields that changed
				for (const key of Object.keys(afterSimple)) {
					if (
						key !== 'shapeId' &&
						beforeSimple[key as keyof ISimpleShape] !== afterSimple[key as keyof ISimpleShape]
					) {
						;(before as any)[key] = beforeSimple[key as keyof ISimpleShape]
						;(after as any)[key] = afterSimple[key as keyof ISimpleShape]
					}
				}

				updates.push({ before, after })
			})

		// Handle deleted shapes
		Object.values(squashedUserActionDiff.removed)
			.filter((record) => record.typeName === 'shape')
			.forEach((record) => {
				const shape = record as TLShape
				deletes.push(removeShapeIdPrefix(shape.id))
			})

		return {
			type: 'userActionHistory',
			history: { updates, deletes, creates },
		}
	}

	override buildContent({ history }: UserActionHistoryPart): string[] {
		if (
			history.updates.length === 0 &&
			history.deletes.length === 0 &&
			history.creates.length === 0
		) {
			return []
		}

		return [
			'Since sending their last message, the user has made the following changes to the canvas:',
			JSON.stringify(history),
		]
	}

	/**
	 * Gets all diffs done by the agent in the chat history
	 */
	private getAgentDiffs(chatHistory: any[]): RecordsDiff<TLRecord>[] {
		return chatHistory
			.filter((item) => item.type === 'action' && item.diff)
			.map((item) => item.diff)
	}
}
