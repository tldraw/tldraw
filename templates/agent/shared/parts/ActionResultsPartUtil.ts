import { JsonValue } from 'tldraw'
import { AgentAction } from '../types/AgentAction'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface ActionResultsPart extends BasePromptPart<'actionResults'> {
	data: { type: AgentAction['_type']; value: JsonValue }[]
}

/**
 * This prompt part collects up data returned by agent actions in the previous request.
 */
export class ActionResultsPartUtil extends PromptPartUtil<ActionResultsPart> {
	static override type = 'actionResults' as const

	override getPriority() {
		return -200 // API data should come right before the user message but after most other parts
	}

	override async getPart(request: AgentRequest): Promise<ActionResultsPart> {
		const { actionResults } = request

		const resultsWithValues = actionResults.filter((result) => result.value !== undefined)

		const data = await Promise.all(
			resultsWithValues.map(async (result) => {
				try {
					const value = await result.value
					if (value === undefined) {
						return null
					}
					return { type: result.type, value }
				} catch (error) {
					console.error('Error resolving agent action result promise:', error)
					// Returning a string so the agent can tell the user there was an error
					return { type: result.type, value: 'Error resolving this action.' }
				}
			})
		)

		console.log('data', data)

		return {
			type: 'actionResults',
			data: data.filter((result) => result !== null),
		}
	}

	override buildContent({ data }: ActionResultsPart) {
		const formattedData = data.map(({ type, value }) => {
			return `${type}: ${JSON.stringify(value)}`
		})

		return [`Here's the API data you requested: ${formattedData.join('\n')}`]
	}
}
