import { Editor, isEqual, RecordsDiff, squashRecordDiffs, TLRecord, TLShape } from 'tldraw'
import { $chatHistoryItems } from '../../client/atoms/chatHistoryItems'
import { $documentChanges } from '../../client/atoms/documentChanges'
import { convertTldrawShapeToSimpleShape, ISimpleShape } from '../format/SimpleShape'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface UserActionHistoryPart extends BasePromptPart<'userActionHistory'> {
	history: UserActionHistory
}

type UserActionHistory = Record<string, UserActionEntry[]>
interface UserActionEntry {
	type: 'create' | 'update' | 'delete'
	initialShape: ISimpleShape | null
	finalShape: ISimpleShape | null
}

export class UserActionHistoryPartUtil extends PromptPartUtil<UserActionHistoryPart> {
	static override type = 'userActionHistory'

	override getPriority() {
		return 40
	}

	override getPart(editor: Editor): UserActionHistoryPart {
		// Updates to the editor store done by the agent are unfortunately attributed to the user in the editor store history (ideally they're remote, or maybe even a new 'agent' source). So we have to filter out the agent's actions from the history.

		const rawStoreDiffs = $documentChanges.get(editor)
		if (rawStoreDiffs.length === 0) {
			return { type: 'userActionHistory', history: {} }
		}

		// Get the agent's diffs from the chat history
		const agentActionDiffs = this.getAgentDiffs($chatHistoryItems.get())

		const userActionDiffs = rawStoreDiffs.filter(
			(diff) => !agentActionDiffs.some((agentDiff) => isEqual(diff, agentDiff))
		)

		const squashedUserActionDiff = squashRecordDiffs(userActionDiffs)
		const userActionHistory: UserActionHistory = {}

		// Convert shapes from RecordDiff<TLRecord> to UserActionEntry, which containts simmple shapes and we will use to describe the changes to the agent. While it may seems pointless to convert to simple shapes when we're just returning text later, it's important because we don't want to tell the model about properties that were changed that are not in simple shapes.
		Object.values(squashedUserActionDiff.added)
			.filter((record) => record.typeName === 'shape')
			.forEach((record) => {
				const shape = record as TLShape
				const shapeId = shape.id
				const simpleShape = convertTldrawShapeToSimpleShape(shape, editor)

				const entry: UserActionEntry = {
					type: 'create',
					initialShape: null,
					finalShape: simpleShape,
				}

				if (!userActionHistory[shapeId]) {
					userActionHistory[shapeId] = []
				}
				userActionHistory[shapeId].push(entry)
			})

		Object.values(squashedUserActionDiff.updated)
			.filter(
				(pair) =>
					Array.isArray(pair) && pair[0].typeName === 'shape' && pair[1].typeName === 'shape'
			)
			.forEach((pair) => {
				const [from, to] = pair
				const fromShape = from as TLShape
				const toShape = to as TLShape
				const shapeId = toShape.id

				const initialSimpleShape = convertTldrawShapeToSimpleShape(fromShape, editor)
				const finalSimpleShape = convertTldrawShapeToSimpleShape(toShape, editor)

				const entry: UserActionEntry = {
					type: 'update',
					initialShape: initialSimpleShape,
					finalShape: finalSimpleShape,
				}

				if (!userActionHistory[shapeId]) {
					userActionHistory[shapeId] = []
				}
				userActionHistory[shapeId].push(entry)
			})

		Object.values(squashedUserActionDiff.removed)
			.filter((record) => record.typeName === 'shape')
			.forEach((record) => {
				const shape = record as TLShape
				const shapeId = shape.id
				const simpleShape = convertTldrawShapeToSimpleShape(shape, editor)

				const entry: UserActionEntry = {
					type: 'delete',
					initialShape: simpleShape,
					finalShape: null,
				}

				if (!userActionHistory[shapeId]) {
					userActionHistory[shapeId] = []
				}
				userActionHistory[shapeId].push(entry)
			})

		return {
			type: 'userActionHistory',
			history: userActionHistory,
		}
	}

	override buildContent({ history }: UserActionHistoryPart): string[] {
		// TODO: Re-enable this. It's disabled because it's not clearing the history properly at the moment.
		return []

		if (Object.keys(history).length === 0) {
			return []
		}

		const content = this.turnChangesIntoReadableText(history)
		if (content === '') {
			return []
		}

		return [
			'Since sending their last message, the user has made the following changes to the canvas:',
			content,
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

	private turnChangesIntoReadableText(changes: UserActionHistory): string {
		if (Object.keys(changes).length === 0) return ''

		const descriptions: string[] = []

		for (const [shapeId, shapeChanges] of Object.entries(changes)) {
			if (shapeChanges.length === 0) continue

			const firstChange = shapeChanges[0]
			const lastChange = shapeChanges[shapeChanges.length - 1]

			// Case 1: Shape was created and then deleted - ignore it
			if (firstChange.type === 'create' && lastChange.type === 'delete') {
				continue
			}

			// Case 2: Shape was deleted (and not created then deleted)
			if (lastChange.type === 'delete') {
				descriptions.push(`User deleted shape with id: ${shapeId}`)
				continue
			}

			// Case 3: Shape was only created, or created and updated (but not deleted)
			if (firstChange.type === 'create') {
				descriptions.push(`User created shape with id: ${shapeId}`)
				continue
			}

			// Case 4: Shape was updated (complex case)
			if (firstChange.type === 'update' && lastChange.type === 'update') {
				const initialShape = firstChange.initialShape
				const finalShape = lastChange.finalShape

				if (initialShape && finalShape) {
					// Find out which properties have changed, and return them as strings
					const changedProperties = this.getChangedPropertiesAsStrings(initialShape, finalShape)

					if (changedProperties.length > 0) {
						const propertyDescriptions = changedProperties.map((changedProperty) => {
							const { name, fromValue, toValue } = changedProperty
							return `${name} property changed from ${fromValue} to ${toValue}`
						})

						const description = `User updated shape with id: ${shapeId} to have its ${propertyDescriptions.join('. It also had its ')}`
						descriptions.push(description)
					} else {
						descriptions.push(`User updated shape with id: ${shapeId}`)
					}
				}
			}
		}

		return descriptions.join('\n') + (descriptions.length > 0 ? '\n' : '')
	}

	private getChangedPropertiesAsStrings(
		initialShape: Partial<ISimpleShape>,
		finalShape: Partial<ISimpleShape>
	): Array<{ name: string; fromValue: string; toValue: string }> {
		const changedProperties: Array<{ name: string; fromValue: string; toValue: string }> = []

		// Get all keys from both shapes
		const allKeys = new Set([...Object.keys(initialShape), ...Object.keys(finalShape)])

		for (const key of allKeys) {
			// Skip internal properties that shouldn't be compared
			if (key === 'shapeId') continue

			const initialValue = initialShape[key as keyof ISimpleShape]
			const finalValue = finalShape[key as keyof ISimpleShape]

			// Compare values (handling undefined/null cases)
			if (initialValue !== finalValue) {
				// Format values based on their type, returns strings
				const fromValue = this.formatValueAsString(initialValue)
				const toValue = this.formatValueAsString(finalValue)

				changedProperties.push({
					name: key,
					fromValue,
					toValue,
				})
			}
		}

		return changedProperties
	}

	private formatValueAsString(
		value: null | undefined | string | number | boolean | object
	): string {
		if (value === null || value === undefined) {
			return 'undefined'
		}

		// Handle strings - wrap in quotes for better readability
		if (typeof value === 'string') {
			return `"${value}"`
		}

		// Handle numbers, booleans, and other primitives
		if (typeof value === 'number' || typeof value === 'boolean') {
			return value.toString()
		}

		// Handle objects and arrays
		if (typeof value === 'object') {
			return JSON.stringify(value)
		}

		// Fallback for any other types
		return String(value)
	}
}
