import { JsonValue } from 'tldraw'
import { CountryInfoAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const CountryInfoActionUtil = registerActionUtil(
	class CountryInfoActionUtil extends AgentActionUtil<CountryInfoAction> {
		static override type = 'countryInfo' as const

		override getInfo(action: Streaming<CountryInfoAction>) {
			const description = action.complete
				? 'Searched for country info'
				: 'Searching for country info'
			return {
				icon: 'search' as const,
				description,
			}
		}

		override async applyAction(action: Streaming<CountryInfoAction>) {
			// Wait until the action has finished streaming
			if (!action.complete) return
			const data = await fetchCountryInfo(action.code)
			this.agent.schedule({ data: [data] })
		}
	}
)

export async function fetchCountryInfo(code: string) {
	const response = await fetch(`https://restcountries.com/v3.1/alpha/${code}`)

	if (!response.ok) {
		throw new Error(`Country API returned status ${response.status}, ${response.statusText}`)
	}

	const json = await response.json()
	if (Array.isArray(json)) {
		return json[0] as JsonValue
	}
	return json as JsonValue
}
