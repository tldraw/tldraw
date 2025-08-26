import { TLShapeId } from 'tldraw'
import { $chatHistoryItems } from '../../client/atoms/chatHistoryItems'
import { $userActionHistory } from '../../client/atoms/storeChanges'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { UserActionHistory } from '../types/UserActionHistory'
import { PromptPartUtil } from './PromptPartUtil'

export class UserActionHistoryPartUtil extends PromptPartUtil<UserActionHistory[]> {
	static override type = 'userHistory' as const

	override getPriority() {
		return 40
	}

	override async getPart(_options: AgentPromptOptions): Promise<UserActionHistory[]> {
		const chatHistory = $chatHistoryItems.get()

		const lastUserMessageIndex = (() => {
			let found = 0
			for (let i = chatHistory.length - 1; i >= 0; i--) {
				if (chatHistory[i].type === 'prompt') {
					found++
					if (found === 2) return i
				}
			}
			return -1
		})()

		const allAgentCreatedShapesSinceLastUserMessage = (() => {
			const agentCreatedShapes = new Set<TLShapeId>()
			for (let i = lastUserMessageIndex + 1; i < chatHistory.length; i++) {
				const item = chatHistory[i]
				if (
					item.type === 'action' &&
					item.action &&
					item.action._type === 'create' &&
					item.action.complete
				) {
					agentCreatedShapes.add(item.action.shape.shapeId as TLShapeId)
				}
			}
			return agentCreatedShapes
		})()

		const shapeChangesSinceLastUserMessage = $userActionHistory.get()

		// Filter out agent-created shapes by removing 'create' StoreChange entries
		const rectifiedShapeChanges = shapeChangesSinceLastUserMessage
			.map((shapeHistory) => {
				const isAgentCreated = allAgentCreatedShapesSinceLastUserMessage.has(
					shapeHistory.shapeId as TLShapeId
				)

				if (isAgentCreated) {
					// For agent-created shapes, filter out the 'create' StoreChange
					const filteredChanges = shapeHistory.changes.filter((change) => change.type !== 'create')
					return {
						...shapeHistory,
						changes: filteredChanges,
					}
				} else {
					// For user-created shapes, keep all changes
					return shapeHistory
				}
			})
			.filter((shapeHistory) => shapeHistory.changes.length > 0) // Remove shapes with no remaining changes

		return rectifiedShapeChanges
	}

	override buildContent(part: UserActionHistory[]) {
		return [
			'Since sending their last message, the user has made the following changes to the canvas:',
			this.turnChangesIntoReadableText(part),
		]
	}

	private turnChangesIntoReadableText(changes: UserActionHistory[]): string {
		if (changes.length === 0) return ''

		const descriptions: string[] = []

		for (const shapeHistory of changes) {
			const { shapeId, changes: shapeChanges } = shapeHistory

			if (shapeChanges.length === 0) continue

			const firstChange = shapeChanges[0]
			const lastChange = shapeChanges[shapeChanges.length - 1]

			// Case 1: Shape was created and then deleted - ignore it
			if (firstChange.type === 'create' && lastChange.type === 'delete') {
				continue
			}

			// Case 2: Shape was deleted (and not created then deleted)
			if (lastChange.type === 'delete') {
				descriptions.push(`Shape with id: ${shapeId} was deleted`)
				continue
			}

			// Case 3: Shape was only created, or created and updated (but not deleted)
			if (firstChange.type === 'create') {
				descriptions.push(`Shape with id: ${shapeId} was created`)
				continue
			}

			// Case 4: Shape was updated (complex case)
			if (firstChange.type === 'update' && lastChange.type === 'update') {
				const initialShape = firstChange.initialShape
				const finalShape = lastChange.finalShape

				if (initialShape && finalShape) {
					const changedProperties = this.getChangedProperties(initialShape, finalShape)

					if (changedProperties.length > 0) {
						const propertyDescriptions = changedProperties.map((prop) => {
							const { name, fromValue, toValue } = prop
							return `${name} property changed from ${fromValue} to ${toValue}`
						})

						const description = `Shape with id: ${shapeId} had its ${propertyDescriptions.join('. It also had its ')}`
						descriptions.push(description)
					} else {
						descriptions.push(`Shape with id: ${shapeId} was updated`)
					}
				}
			}
		}

		return descriptions.join('. ') + (descriptions.length > 0 ? '.' : '')
	}

	private getChangedProperties(
		initialShape: any,
		finalShape: any
	): Array<{ name: string; fromValue: any; toValue: any }> {
		const changedProperties: Array<{ name: string; fromValue: any; toValue: any }> = []

		// Get all keys from both shapes
		const allKeys = new Set([...Object.keys(initialShape), ...Object.keys(finalShape)])

		for (const key of allKeys) {
			// Skip internal properties that shouldn't be compared
			if (key === 'shapeId' || key === '_type') continue

			const initialValue = initialShape[key]
			const finalValue = finalShape[key]

			// Compare values (handling undefined/null cases)
			if (initialValue !== finalValue) {
				// Format values based on their type
				const fromValue = this.formatValue(initialValue)
				const toValue = this.formatValue(finalValue)

				changedProperties.push({
					name: key,
					fromValue,
					toValue,
				})
			}
		}

		return changedProperties
	}

	private formatValue(value: any): string {
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
