import { JsonValue } from 'tldraw'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

interface DataPart extends BasePromptPart<'data'> {
	data: JsonValue[]
}

/**
 * This prompt part collects up data retrieved by agent actions in the previous request.
 */
export class DataPartUtil extends PromptPartUtil<DataPart> {
	static override type = 'data' as const

	override getPriority() {
		return -200 // API data should come right before the user message but after most other parts
	}

	override async getPart(request: AgentRequest): Promise<DataPart> {
		const { data } = request

		const values = await Promise.all(
			data.map(async (item) => {
				try {
					return await item
				} catch (error) {
					console.error('Error retrieving data:', error)
					// Tell the agent that something went wrong
					return 'An error occurred while retrieving some data.'
				}
			})
		)

		return {
			type: 'data',
			data: values,
		}
	}

	override buildContent({ data }: DataPart) {
		if (data.length === 0) return []

		const formattedData = data.map((item) => {
			return `${JSON.stringify(item)}`
		})

		return ["Here's the data you requested:", ...formattedData]
	}
}
