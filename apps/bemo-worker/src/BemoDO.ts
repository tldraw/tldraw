import { DurableObject } from 'cloudflare:workers'
import { Environment } from './types'

export class BemoDO extends DurableObject<Environment> {
	async hello() {
		return `hello from a durable object! here's my env: ${JSON.stringify(this.env, null, 2)}`
	}
}
