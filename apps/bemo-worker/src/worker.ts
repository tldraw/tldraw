/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Environment } from './types'
export { BemoDO } from './BemoDO'

export default class Worker extends WorkerEntrypoint<Environment> {
	override async fetch(_request: Request<unknown, CfProperties<unknown>>): Promise<Response> {
		const bemo = this.env.BEMO_DO.get(this.env.BEMO_DO.idFromName('bemo-do'))
		const message = await bemo.hello()
		return new Response(message, { status: 200 })
	}
}
