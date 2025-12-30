import {
	AgentRequest,
	convertTldrawIdToSimpleId,
	convertTldrawShapeToFocusedShape,
	convertTldrawShapeToFocusedType,
	FocusedShape,
	UserActionHistoryPart,
} from '@tldraw/fairy-shared'
import { squashRecordDiffs, TLShape } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class UserActionHistoryPartUtil extends PromptPartUtil<UserActionHistoryPart> {
	static override type = 'userActionHistory' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): UserActionHistoryPart {
		const { editor, agent } = helpers

		// Get the action history and clear it so that we can start tracking changes for the next request
		const diffs = agent.userAction.getHistory()
		agent.userAction.clearHistory()

		const part: UserActionHistoryPart = {
			type: 'userActionHistory',
			added: [],
			removed: [],
			updated: [],
		}

		const squashedDiff = squashRecordDiffs(diffs)
		const { added, updated, removed } = squashedDiff

		// Collect user-added shapes
		for (const shape of Object.values(added) as TLShape[]) {
			if (shape.typeName !== 'shape') continue
			part.added.push({
				shapeId: convertTldrawIdToSimpleId(shape.id),
				type: convertTldrawShapeToFocusedType(shape),
			})
		}

		// Collect user-removed shapes
		for (const shape of Object.values(removed) as TLShape[]) {
			if (shape.typeName !== 'shape') continue
			const simpleShape = convertTldrawShapeToFocusedShape(editor, shape)
			part.removed.push({
				shapeId: simpleShape.shapeId,
				type: simpleShape._type,
			})
		}

		// Collect user-updated shapes
		for (const [from, to] of Object.values(updated) as [TLShape, TLShape][]) {
			if (from.typeName !== 'shape' || to.typeName !== 'shape') continue
			const fromSimpleShape = convertTldrawShapeToFocusedShape(editor, from)
			const toSimpleShape = convertTldrawShapeToFocusedShape(editor, to)

			const changeSimpleShape = getSimpleShapeChange(fromSimpleShape, toSimpleShape)
			if (!changeSimpleShape) continue

			const before = helpers.applyOffsetToShapePartial(changeSimpleShape.from)
			const after = helpers.applyOffsetToShapePartial(changeSimpleShape.to)

			part.updated.push({
				shapeId: toSimpleShape.shapeId,
				type: toSimpleShape._type,
				before: helpers.roundShapePartial(before),
				after: helpers.roundShapePartial(after),
			})
		}

		return part
	}
}

/**
 * Get any changed properties between two simple shapes.
 * @param from - The original shape.
 * @param to - The new shape.
 * @returns The changed properties.
 */
function getSimpleShapeChange<T extends FocusedShape['_type']>(
	from: FocusedShape & { _type: T },
	to: FocusedShape & { _type: T }
) {
	if (from._type !== to._type) {
		return null
	}

	const change: {
		from: Partial<FocusedShape>
		to: Partial<FocusedShape>
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
