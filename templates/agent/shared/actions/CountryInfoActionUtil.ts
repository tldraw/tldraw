import { JsonValue } from 'tldraw'
import z from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const CountryInfoAction = z
	.object({
		_type: z.literal('countryInfo'),
		code: z.string(),
	})
	.meta({
		title: 'Country info',
		description:
			'The AI gets information about a country by providing its country code, eg: "de" for Germany.',
	})

type CountryInfoAction = z.infer<typeof CountryInfoAction>

export class CountryInfoActionUtil extends AgentActionUtil<CountryInfoAction> {
	static override type = 'countryInfo' as const

	override getSchema() {
		return CountryInfoAction
	}

	override getInfo(action: Streaming<CountryInfoAction>) {
		const description = action.complete ? 'Searched for country info' : 'Searching for country info'
		return {
			icon: 'search' as const,
			description,
		}
	}

	override async applyAction(action: Streaming<CountryInfoAction>) {
		// Wait until the action has finished streaming
		if (!action.complete) return
		if (!this.agent) return
		const data = await fetchCountryInfo(action.code)
		this.agent.schedule({ data: [data] })
	}
}

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
