import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface ApiDataPart extends BasePromptPart<'apiData'> {
	apiData: AgentRequest['apiData']
}

export class ApiDataPartUtil extends PromptPartUtil<ApiDataPart> {
	static override type = 'apiData' as const

	override getPriority() {
		return -200 // API data should come right before the user message but after most other parts
	}

	override getPart(request: AgentRequest): ApiDataPart {
		const { apiData } = request

		return {
			type: 'apiData',
			apiData,
		}
	}

	override buildContent({ apiData }: ApiDataPart) {
		if (!apiData || Object.keys(apiData).length === 0) {
			return []
		}

		const apiDataFormatted = Object.entries(apiData).map(([actionType, data]) => {
			if (Array.isArray(data)) {
				return `${actionType}: ${data.length} result(s) - ${JSON.stringify(data)}`
			} else {
				return `${actionType}: ${JSON.stringify(data)}`
			}
		})

		return [`Here's the API data you requested: ${apiDataFormatted.join('\n')}`]
	}
}
