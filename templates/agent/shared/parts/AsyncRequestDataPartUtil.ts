import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface AsyncRequestDataPart extends BasePromptPart<'asyncRequestData'> {
	asyncRequestData: { name: string; data: any }[]
}

/**
 * This prompt part collects up data from any API calls the agent made during the previous request.
 */
export class AsyncRequestDataPartUtil extends PromptPartUtil<AsyncRequestDataPart> {
	static override type = 'asyncRequestData' as const

	override getPriority() {
		return -200 // API data should come right before the user message but after most other parts
	}

	override async getPart(request: AgentRequest): Promise<AsyncRequestDataPart> {
		const { requestPromises } = request

		const asyncRequestData = await Promise.all(
			requestPromises.map(async ({ name, promise }) => {
				try {
					const data = await promise
					return { name, data }
				} catch (error) {
					console.error('Error resolving API promise:', error)
					return { name, data: 'Error fetching data' } // returning a string so the agent can tell the user there was an error
				}
			})
		)

		return {
			type: 'asyncRequestData',
			asyncRequestData,
		}
	}

	override buildContent({ asyncRequestData }: AsyncRequestDataPart) {
		if (!asyncRequestData || Object.keys(asyncRequestData).length === 0) {
			return []
		}

		const asyncRequestDataFormatted = Object.entries(asyncRequestData).map(([name, data]) => {
			if (Array.isArray(data)) {
				return `${name}: ${data.length} result(s) - ${JSON.stringify(data)}`
			} else {
				return `${name}: ${JSON.stringify(data)}`
			}
		})

		return [`Here's the API data you requested: ${asyncRequestDataFormatted.join('\n')}`]
	}
}
