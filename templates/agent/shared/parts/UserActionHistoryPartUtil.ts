import { squashRecordDiffs } from 'tldraw'
import { AgentHelpers } from '../AgentHelpers'
import {
	convertTldrawIdToSimpleId,
	convertTldrawShapeToSimpleShape,
	convertTldrawShapeToSimpleType,
} from '../format/convertTldrawShapeToSimpleShape'
import { SimpleShape } from '../format/SimpleShape'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface UserActionHistoryPart extends BasePromptPart<'userActionHistory'> {
	added: {
		shapeId: string
		type: SimpleShape['_type']
	}[]
	removed: {
		shapeId: string
		type: SimpleShape['_type']
	}[]
	updated: {
		shapeId: string
		type: SimpleShape['_type']
		before: Partial<SimpleShape>
		after: Partial<SimpleShape>
	}[]
}

export class UserActionHistoryPartUtil extends PromptPartUtil<UserActionHistoryPart> {
	static override type = 'userActionHistory' as const

	override getPriority() {
		return 40
	}

	override getPart(_request: AgentRequest, helpers: AgentHelpers): UserActionHistoryPart {
		const { editor, agent } = helpers

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
			part.added.push({
				shapeId: convertTldrawIdToSimpleId(shape.id),
				type: convertTldrawShapeToSimpleType(shape),
			})
		}

		// Collect user-removed shapes
		for (const shape of Object.values(removed)) {
			if (shape.typeName !== 'shape') continue
			const simpleShape = convertTldrawShapeToSimpleShape(editor, shape)
			part.removed.push({
				shapeId: simpleShape.shapeId,
				type: simpleShape._type,
			})
		}

		// Collect user-updated shapes
		for (const [from, to] of Object.values(updated)) {
			if (from.typeName !== 'shape' || to.typeName !== 'shape') continue
			const fromSimpleShape = convertTldrawShapeToSimpleShape(editor, from)
			const toSimpleShape = convertTldrawShapeToSimpleShape(editor, to)

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
function getSimpleShapeChange<T extends SimpleShape['_type']>(
	from: SimpleShape & { _type: T },
	to: SimpleShape & { _type: T }
) {
	if (from._type !== to._type) {
		return null
	}

	const change: {
		from: Partial<SimpleShape>
		to: Partial<SimpleShape>
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
