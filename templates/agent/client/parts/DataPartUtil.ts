import { DataPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

/**
 * This prompt part collects up data retrieved by agent actions in the previous request.
 */
export const DataPartUtil = registerPromptPartUtil(
	class DataPartUtil extends PromptPartUtil<DataPart> {
		static override type = 'data' as const

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
	}
)
