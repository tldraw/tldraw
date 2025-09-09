import { squashRecordDiffs } from 'tldraw'
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { AgentTransform } from '../AgentTransform'
import { convertTldrawShapeToSimpleShape, ISimpleShape } from '../format/SimpleShape'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface UserActionHistoryPart extends BasePromptPart<'userActionHistory'> {
	added: {
		shapeId: string
		type: ISimpleShape['_type']
	}[]
	removed: {
		shapeId: string
		type: ISimpleShape['_type']
	}[]
	updated: {
		shapeId: string
		type: ISimpleShape['_type']
		before: Partial<ISimpleShape>
		after: Partial<ISimpleShape>
	}[]
}

export class UserActionHistoryPartUtil extends PromptPartUtil<UserActionHistoryPart> {
	static override type = 'userActionHistory' as const

	override getPriority() {
		return 40
	}

	override getPart(_request: AgentRequest, agent: TldrawAgent): UserActionHistoryPart {
		const { editor } = agent

		// Get the action history and clear it so that we can start tracking changes for the next request
		const diffs = agent.$userActionHistory.get()
		agent.$userActionHistory.set([])

		const part: UserActionHistoryPart = {
			type: 'userActionHistory',
			added: [],
			removed: [],
			updated: [],
		}

		const squashedDiff = squashRecordDiffs(diffs)
		const { added, updated, removed } = squashedDiff

		// Collect user-added shapes
		for (const shape of Object.values(added)) {
			if (shape.typeName !== 'shape') continue
			const simpleShape = convertTldrawShapeToSimpleShape(shape, editor)
			part.added.push({
				shapeId: simpleShape.shapeId,
				type: simpleShape._type,
			})
		}

		// Collect user-removed shapes
		for (const shape of Object.values(removed)) {
			if (shape.typeName !== 'shape') continue
			const simpleShape = convertTldrawShapeToSimpleShape(shape, editor)
			part.removed.push({
				shapeId: simpleShape.shapeId,
				type: simpleShape._type,
			})
		}

		// Collect user-updated shapes
		for (const [from, to] of Object.values(updated)) {
			if (from.typeName !== 'shape' || to.typeName !== 'shape') continue
			const fromSimpleShape = convertTldrawShapeToSimpleShape(from, editor)
			const toSimpleShape = convertTldrawShapeToSimpleShape(to, editor)

			const changeSimpleShape = getSimpleShapeChange(fromSimpleShape, toSimpleShape)
			if (!changeSimpleShape) continue
			part.updated.push({
				shapeId: toSimpleShape.shapeId,
				type: toSimpleShape._type,
				before: changeSimpleShape.from,
				after: changeSimpleShape.to,
			})
		}

		return part
	}

	override transformPart(part: UserActionHistoryPart, transform: AgentTransform) {
		for (const update of part.updated) {
			update.before = transform.applyOffsetToShapePartial(update.before)
			update.after = transform.applyOffsetToShapePartial(update.after)
		}
		return part
	}

	override buildContent(part: UserActionHistoryPart): string[] {
		const { updated, removed, added } = part
		if (updated.length === 0 && removed.length === 0 && added.length === 0) {
			return []
		}

		return [
			'Since the previous request, the user has made the following changes to the canvas:',
			JSON.stringify(part),
		]
	}
}

/**
 * Get any changed properties between two simple shapes.
 * @param from - The original shape.
 * @param to - The new shape.
 * @returns The changed properties.
 */
function getSimpleShapeChange<T extends ISimpleShape['_type']>(
	from: ISimpleShape & { _type: T },
	to: ISimpleShape & { _type: T }
) {
	if (from._type !== to._type) {
		return null
	}

	const change: {
		from: Partial<ISimpleShape>
		to: Partial<ISimpleShape>
	} = {
		from: {},
		to: {},
	}

	for (const key in to) {
		const fromValue = from[key]
		const toValue = to[key]
		if (fromValue === toValue) {
			continue
		}
		;(change.from as any)[key] = fromValue
		;(change.to as any)[key] = toValue
	}
	return change
}
