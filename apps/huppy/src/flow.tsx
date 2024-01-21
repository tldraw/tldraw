import { WebhookEventMap } from '@octokit/webhooks-types'
import { Ctx } from './ctx'
import { allFlows } from './flows'
import { reportError } from './reportError'
import { camelCase, capitalize, elapsed } from './utils'

type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
	? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
	: Lowercase<S>

export type NamedEvent = {
	[Name in keyof WebhookEventMap]: { name: Name; payload: WebhookEventMap[Name] }
}[keyof WebhookEventMap]

export type Flow<CustomHookPayload = unknown> = {
	name: string
	onCustomHook?: (ctx: Ctx, payload: CustomHookPayload) => Promise<void>
} & {
	[Name in keyof WebhookEventMap as `on${Capitalize<CamelCase<Name>>}`]?: (
		ctx: Ctx,
		payload: WebhookEventMap[Name]
	) => Promise<void>
}

export async function onGithubEvent(ctx: Ctx, event: NamedEvent) {
	let nameString = event.name
	if ('action' in event.payload) {
		nameString += `.${event.payload.action}`
	}
	console.log('Starting event:', nameString)
	const handlerName = `on${capitalize(camelCase(event.name))}` as `on${Capitalize<
		CamelCase<keyof WebhookEventMap>
	>}`

	const results: Record<string, string> = {}

	for (const flow of allFlows) {
		if (handlerName in flow) {
			const actionName = `${flow.name}.${handlerName}`
			const start = Date.now()
			try {
				console.log(`===== Starting ${actionName} =====`)
				await (flow as any)[handlerName](ctx, event.payload)
				console.log(`===== Finished ${actionName} in ${elapsed(start)} =====`)
				results[actionName] = `ok in ${elapsed(start)}`
			} catch (err: any) {
				results[actionName] = err.message
				await reportError(`Error in ${flow.name}.${handlerName}`, err)
			}
		}
	}

	return results
}
